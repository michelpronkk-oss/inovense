// Microsoft Teams connector - Microsoft Graph adapter.
//
// Teams deliberately does NOT get its own OAuth implementation. It reuses the
// single direct Microsoft Entra ID connection owned by
// src/lib/connectors/microsoft.ts (same Entra app, same Graph resource, same
// encrypted os_connector_credentials row with connector_key "microsoft"), and
// only adds the extra delegated Teams scopes through incremental consent. See
// MICROSOFT_TEAMS_GRAPH_SCOPES there.
//
// This file owns the low-level Graph HTTP surface for Teams:
//   - one central request helper (auth header, base URL, refresh-on-401,
//     bounded 429/5xx retry, error normalization)
//   - SSRF-safe @odata.nextLink pagination
//   - normalization/sanitization of Teams message content into a safe,
//     text-only internal shape
//
// Business logic (approval creation, policy, execution) lives in
// src/lib/operators/executors/microsoft-teams.ts, matching the Gmail/Microsoft
// 365 split. Nothing in this file decides whether an action is allowed.

import {
  MICROSOFT_TEAMS_READ_SCOPES,
  MICROSOFT_TEAMS_SEND_SCOPES,
  MicrosoftReauthRequiredError,
  getMicrosoftCredential,
  resolveMicrosoftAccessToken,
  type StoredMicrosoftCredential,
} from "@/lib/connectors/microsoft";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/** Catalog key. Kept distinct from "microsoft" (Microsoft 365 mail/calendar). */
export const MICROSOFT_TEAMS_CONNECTOR_KEY = "microsoft_teams";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const GRAPH_HOST = "graph.microsoft.com";

/** Hard ceilings so a scan can never turn into a full tenant history fetch. */
export const TEAMS_MAX_MESSAGES_PER_CHANNEL = 50;
export const TEAMS_MAX_PAGES_PER_CHANNEL = 3;
export const TEAMS_MAX_TEXT_LENGTH = 600;
const MAX_TRANSIENT_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 10_000;

// ── Scope truth ─────────────────────────────────────────────────────────

export type MicrosoftTeamsScopeState = {
  readGranted: boolean;
  sendGranted: boolean;
  missingReadScopes: string[];
  missingSendScopes: string[];
  missingScopes: string[];
};

/**
 * Truthful Teams scope state for a stored Microsoft credential. Teams
 * capability is never inferred from the Microsoft 365 mail connection being
 * healthy - only from Teams scopes Microsoft actually granted.
 */
export function getMicrosoftTeamsScopeState(scopes: string[] | null | undefined): MicrosoftTeamsScopeState {
  const granted = new Set((scopes ?? []).map((scope) => scope.toLowerCase()));
  const missingReadScopes = MICROSOFT_TEAMS_READ_SCOPES.filter((scope) => !granted.has(scope.toLowerCase()));
  const missingSendScopes = MICROSOFT_TEAMS_SEND_SCOPES.filter((scope) => !granted.has(scope.toLowerCase()));
  return {
    readGranted: missingReadScopes.length === 0,
    sendGranted: missingSendScopes.length === 0,
    missingReadScopes,
    missingSendScopes,
    missingScopes: [...missingReadScopes, ...missingSendScopes],
  };
}

// ── Stored Teams settings (no new table - see section 44 of the brief) ───
//
// Teams settings live inside the existing os_connector_credentials.metadata
// jsonb of the shared "microsoft" row. That keeps a single Microsoft identity
// and makes "disable Teams" a metadata change rather than a destructive
// delete of the credential mail/calendar also depends on.

export type MicrosoftTeamsCursor = {
  lastSyncedAt: string | null;
  lastMessageId: string | null;
};

export type MicrosoftTeamsSettings = {
  enabled: boolean;
  defaultTeamId: string | null;
  defaultTeamName: string | null;
  defaultChannelId: string | null;
  defaultChannelName: string | null;
  /** Channel membership type as reported by Graph, used for destination classification. */
  defaultChannelMembershipType: string | null;
  /** Incremental sync cursors keyed by `${teamId}:${channelId}`. */
  cursors: Record<string, MicrosoftTeamsCursor>;
};

export const EMPTY_MICROSOFT_TEAMS_SETTINGS: MicrosoftTeamsSettings = {
  enabled: false,
  defaultTeamId: null,
  defaultTeamName: null,
  defaultChannelId: null,
  defaultChannelName: null,
  defaultChannelMembershipType: null,
  cursors: {},
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readMicrosoftTeamsSettings(metadata: Record<string, unknown> | null | undefined): MicrosoftTeamsSettings {
  const teams = asRecord(asRecord(metadata).teams);
  const rawCursors = asRecord(teams.cursors);
  const cursors: Record<string, MicrosoftTeamsCursor> = {};
  for (const [key, value] of Object.entries(rawCursors)) {
    const cursor = asRecord(value);
    cursors[key] = { lastSyncedAt: asText(cursor.lastSyncedAt), lastMessageId: asText(cursor.lastMessageId) };
  }
  return {
    enabled: teams.enabled === true,
    defaultTeamId: asText(teams.defaultTeamId),
    defaultTeamName: asText(teams.defaultTeamName),
    defaultChannelId: asText(teams.defaultChannelId),
    defaultChannelName: asText(teams.defaultChannelName),
    defaultChannelMembershipType: asText(teams.defaultChannelMembershipType),
    cursors,
  };
}

export function writeMicrosoftTeamsSettings(
  metadata: Record<string, unknown> | null | undefined,
  patch: Partial<MicrosoftTeamsSettings>,
): Record<string, unknown> {
  const current = readMicrosoftTeamsSettings(metadata);
  return { ...asRecord(metadata), teams: { ...current, ...patch } };
}

export function teamsCursorKey(teamId: string, channelId: string): string {
  return `${teamId}:${channelId}`;
}

// ── Error model ─────────────────────────────────────────────────────────

export type MicrosoftTeamsErrorCode =
  | "teams_not_connected"
  | "teams_permission_required"
  | "teams_reauth_required"
  | "teams_rate_limited"
  | "teams_channel_not_found"
  | "teams_forbidden"
  | "teams_request_failed"
  | "teams_invalid_target"
  | "teams_unsafe_pagination";

export class MicrosoftTeamsGraphError extends Error {
  details: {
    step: string;
    code: MicrosoftTeamsErrorCode;
    status: number | null;
    /** Graph's own machine-readable error code, never a message body. */
    graphCode: string | null;
  };

  constructor(message: string, details: MicrosoftTeamsGraphError["details"]) {
    super(message);
    this.name = "MicrosoftTeamsGraphError";
    this.details = details;
  }
}

function graphErrorCode(body: unknown): string | null {
  const error = asRecord(asRecord(body).error);
  return asText(error.code);
}

function normalizeGraphFailure(step: string, status: number, body: unknown): MicrosoftTeamsGraphError {
  const graphCode = graphErrorCode(body);
  if (status === 401) {
    return new MicrosoftTeamsGraphError("Microsoft Teams access was rejected. Reconnect Microsoft to restore access.", { step, code: "teams_reauth_required", status, graphCode });
  }
  if (status === 403) {
    return new MicrosoftTeamsGraphError("Microsoft Teams permissions are missing or were revoked for this account.", { step, code: "teams_permission_required", status, graphCode });
  }
  if (status === 404) {
    return new MicrosoftTeamsGraphError("The Microsoft Teams team or channel was not found or is not accessible.", { step, code: "teams_channel_not_found", status, graphCode });
  }
  if (status === 429) {
    return new MicrosoftTeamsGraphError("Microsoft Graph rate limit reached for Teams. Try again shortly.", { step, code: "teams_rate_limited", status, graphCode });
  }
  return new MicrosoftTeamsGraphError("The Microsoft Teams request could not be completed.", { step, code: "teams_request_failed", status, graphCode });
}

// ── SSRF-safe pagination ────────────────────────────────────────────────

/**
 * Only ever follow an @odata.nextLink that is https and points at the exact
 * Microsoft Graph host. Graph responses are attacker-influenceable in theory
 * (a tenant could contain hostile content), so an arbitrary nextLink is never
 * fetched with the workspace's bearer token.
 */
export function isSafeGraphNextLink(link: string | null | undefined): boolean {
  if (!link) return false;
  try {
    const url = new URL(link);
    return url.protocol === "https:" && url.hostname.toLowerCase() === GRAPH_HOST;
  } catch {
    return false;
  }
}

// ── Central request helper ──────────────────────────────────────────────

type GraphRequestContext = {
  workspaceId: string;
  accessToken: string;
  /** Re-resolves a token after a 401. Called at most once per request. */
  refresh?: () => Promise<string>;
  supabase?: SupabaseAdmin;
};

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function retryAfterMs(res: Response): number {
  const header = res.headers.get("retry-after");
  const seconds = header ? Number(header) : Number.NaN;
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  return 1000;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The single Graph entry point for Teams. Every Teams call goes through here:
 *
 *  - 401 -> refresh once, retry once, then fail as reauth required. Never loops.
 *  - 429 -> honor Retry-After, bounded to MAX_TRANSIENT_RETRIES attempts.
 *  - 5xx -> bounded backoff retry, same ceiling.
 *  - anything else -> normalized error with a safe code, never a raw body.
 */
async function teamsGraphRequest<T = unknown>(
  context: GraphRequestContext,
  method: "GET" | "POST",
  pathOrUrl: string,
  body?: unknown,
): Promise<T> {
  const absolute = pathOrUrl.startsWith("http");
  if (absolute && !isSafeGraphNextLink(pathOrUrl)) {
    throw new MicrosoftTeamsGraphError("Refused to follow a Microsoft Graph link outside the Graph host.", {
      step: "teams.pagination", code: "teams_unsafe_pagination", status: null, graphCode: null,
    });
  }
  const url = absolute ? pathOrUrl : `${GRAPH_BASE}${pathOrUrl}`;
  const step = `teams.${method.toLowerCase()}`;

  let accessToken = context.accessToken;
  let refreshed = false;
  let transientAttempts = 0;

  for (;;) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (res.ok) return (await readBody(res)) as T;

    if (res.status === 401 && !refreshed && context.refresh) {
      refreshed = true;
      try {
        accessToken = await context.refresh();
        continue;
      } catch (error) {
        if (error instanceof MicrosoftReauthRequiredError) {
          throw new MicrosoftTeamsGraphError("Microsoft Teams requires reconnection.", { step, code: "teams_reauth_required", status: 401, graphCode: null });
        }
        throw new MicrosoftTeamsGraphError("Microsoft Teams access could not be refreshed.", { step, code: "teams_reauth_required", status: 401, graphCode: null });
      }
    }

    if ((res.status === 429 || res.status >= 500) && transientAttempts < MAX_TRANSIENT_RETRIES) {
      transientAttempts += 1;
      await wait(res.status === 429 ? retryAfterMs(res) : Math.min(500 * transientAttempts, MAX_RETRY_AFTER_MS));
      continue;
    }

    throw normalizeGraphFailure(step, res.status, await readBody(res));
  }
}

// ── Connection resolution ───────────────────────────────────────────────

export type MicrosoftTeamsConnection = {
  workspaceId: string;
  credential: StoredMicrosoftCredential;
  settings: MicrosoftTeamsSettings;
  scopeState: MicrosoftTeamsScopeState;
  accessToken: string;
  supabase: SupabaseAdmin;
};

/**
 * Resolve a usable Teams connection or explain, safely, why there is not one.
 * Never returns a connection when the Teams scopes are missing, even though
 * the underlying Microsoft 365 mail credential may be perfectly healthy.
 */
export async function resolveMicrosoftTeamsConnection(input: {
  workspaceId: string;
  supabase?: SupabaseAdmin;
  /** Set for write paths so a missing send scope fails before any Graph call. */
  requireSendScope?: boolean;
}): Promise<MicrosoftTeamsConnection> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const credential = await getMicrosoftCredential(input.workspaceId, supabase);
  if (!credential) {
    throw new MicrosoftTeamsGraphError("Microsoft is not connected for this workspace.", { step: "teams.connection", code: "teams_not_connected", status: null, graphCode: null });
  }
  const settings = readMicrosoftTeamsSettings(credential.metadata);
  if (!settings.enabled) {
    throw new MicrosoftTeamsGraphError("Microsoft Teams is not enabled for this workspace.", { step: "teams.connection", code: "teams_not_connected", status: null, graphCode: null });
  }
  const scopeState = getMicrosoftTeamsScopeState(credential.scopes);
  if (!scopeState.readGranted || (input.requireSendScope && !scopeState.sendGranted)) {
    throw new MicrosoftTeamsGraphError("Microsoft Teams permissions have not been granted for this workspace.", { step: "teams.connection", code: "teams_permission_required", status: null, graphCode: null });
  }

  const accessToken = await resolveMicrosoftAccessToken({ workspaceId: input.workspaceId, credential, supabase });
  return { workspaceId: input.workspaceId, credential, settings, scopeState, accessToken, supabase };
}

function requestContext(connection: MicrosoftTeamsConnection): GraphRequestContext {
  return {
    workspaceId: connection.workspaceId,
    accessToken: connection.accessToken,
    supabase: connection.supabase,
    refresh: async () => {
      const fresh = await getMicrosoftCredential(connection.workspaceId, connection.supabase);
      if (!fresh) throw new MicrosoftReauthRequiredError();
      return resolveMicrosoftAccessToken({ workspaceId: connection.workspaceId, credential: fresh, supabase: connection.supabase });
    },
  };
}

// ── Content normalization / sanitization ────────────────────────────────

function stripTeamsHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Teams message bodies are frequently HTML. Auterim never stores or renders
 * that HTML - it is reduced to bounded plain text here so no provider markup,
 * script, or tracking pixel can reach the UI or a model prompt.
 */
export function toSafeTeamsText(content: string | null | undefined, contentType?: string | null): string | null {
  if (!content) return null;
  const text = (contentType ?? "").toLowerCase() === "html" ? stripTeamsHtml(content) : stripTeamsHtml(content);
  if (!text) return null;
  return text.length > TEAMS_MAX_TEXT_LENGTH ? `${text.slice(0, TEAMS_MAX_TEXT_LENGTH)}...` : text;
}

/** Only https Teams/Office deep links survive; anything else is dropped. */
export function toSafeTeamsWebUrl(value: unknown): string | null {
  const raw = asText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const allowed = host === "teams.microsoft.com" || host.endsWith(".teams.microsoft.com") || host.endsWith(".office.com");
    return allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

export type SafeTeamsTeam = {
  id: string;
  displayName: string;
  description: string | null;
};

export type SafeTeamsChannel = {
  id: string;
  teamId: string;
  displayName: string;
  membershipType: string;
  /** Standard/private channels are internal; shared channels can include external tenants. */
  isPotentiallyExternal: boolean;
  webUrl: string | null;
};

export type SafeTeamsMessage = {
  provider: "microsoft_teams";
  teamId: string;
  channelId: string;
  messageId: string;
  /** Reply parent id when this message is part of a thread, else null. */
  replyToId: string | null;
  senderName: string | null;
  senderId: string | null;
  occurredAt: string | null;
  textPreview: string | null;
  webUrl: string | null;
};

/**
 * Standard and private channels are members of the host tenant only. Shared
 * channels can be extended to other tenants, so their destination type cannot
 * be proven internal from Graph alone and is treated as external (which fails
 * to approval, per the approval boundary).
 */
export function isExternalCapableMembershipType(membershipType: string | null | undefined): boolean {
  const value = (membershipType ?? "").toLowerCase();
  return value !== "standard" && value !== "private";
}

function toSafeChannel(teamId: string, raw: Record<string, unknown>): SafeTeamsChannel | null {
  const id = asText(raw.id);
  if (!id) return null;
  const membershipType = asText(raw.membershipType) ?? "unknown";
  return {
    id,
    teamId,
    displayName: asText(raw.displayName) ?? "Channel",
    membershipType,
    isPotentiallyExternal: isExternalCapableMembershipType(membershipType),
    webUrl: toSafeTeamsWebUrl(raw.webUrl),
  };
}

function toSafeMessage(teamId: string, channelId: string, raw: Record<string, unknown>): SafeTeamsMessage | null {
  const messageId = asText(raw.id);
  if (!messageId) return null;
  const body = asRecord(raw.body);
  const user = asRecord(asRecord(raw.from).user);
  return {
    provider: "microsoft_teams",
    teamId,
    channelId,
    messageId,
    replyToId: asText(raw.replyToId),
    senderName: asText(user.displayName),
    senderId: asText(user.id),
    occurredAt: asText(raw.createdDateTime),
    textPreview: toSafeTeamsText(asText(body.content), asText(body.contentType)),
    webUrl: toSafeTeamsWebUrl(raw.webUrl),
  };
}

// ── Read operations (no approval required) ──────────────────────────────

type GraphCollection = { value?: unknown[]; "@odata.nextLink"?: string };

/** Team.ReadBasic.All - teams the signed-in user is a member of only. */
export async function listJoinedTeams(connection: MicrosoftTeamsConnection): Promise<SafeTeamsTeam[]> {
  const data = await teamsGraphRequest<GraphCollection>(requestContext(connection), "GET", "/me/joinedTeams?$select=id,displayName,description");
  return (data?.value ?? [])
    .map((item) => asRecord(item))
    .flatMap((item) => {
      const id = asText(item.id);
      return id ? [{ id, displayName: asText(item.displayName) ?? "Team", description: asText(item.description) }] : [];
    });
}

/** Channel.ReadBasic.All - channel list for one accessible team. */
export async function listTeamChannels(connection: MicrosoftTeamsConnection, teamId: string): Promise<SafeTeamsChannel[]> {
  const id = teamId.trim();
  if (!id) {
    throw new MicrosoftTeamsGraphError("A Microsoft Teams team id is required.", { step: "teams.validate", code: "teams_invalid_target", status: null, graphCode: null });
  }
  const data = await teamsGraphRequest<GraphCollection>(
    requestContext(connection),
    "GET",
    `/teams/${encodeURIComponent(id)}/channels?$select=id,displayName,membershipType,webUrl`,
  );
  return (data?.value ?? []).flatMap((item) => {
    const channel = toSafeChannel(id, asRecord(item));
    return channel ? [channel] : [];
  });
}

export type RecentTeamsMessagesResult = {
  messages: SafeTeamsMessage[];
  /** Newest provider message id in this batch, for incremental dedupe. */
  latestMessageId: string | null;
  /** True when Graph had more pages but the bounded page ceiling was reached. */
  truncated: boolean;
};

/**
 * ChannelMessage.Read.All - bounded, incremental recent channel history.
 *
 * This is deliberately not a full history reader: at most
 * TEAMS_MAX_PAGES_PER_CHANNEL pages of at most TEAMS_MAX_MESSAGES_PER_CHANNEL
 * messages, stopping early at the last message id already seen. Callers pass
 * the stored cursor so repeated scans do not re-read the same history.
 */
export async function listRecentChannelMessages(input: {
  connection: MicrosoftTeamsConnection;
  teamId: string;
  channelId: string;
  limit?: number;
  /** Provider message id from the previous sync. Paging stops when reached. */
  sinceMessageId?: string | null;
}): Promise<RecentTeamsMessagesResult> {
  const teamId = input.teamId.trim();
  const channelId = input.channelId.trim();
  if (!teamId || !channelId) {
    throw new MicrosoftTeamsGraphError("A Microsoft Teams team and channel are required.", { step: "teams.validate", code: "teams_invalid_target", status: null, graphCode: null });
  }
  const top = Math.max(1, Math.min(input.limit ?? 20, TEAMS_MAX_MESSAGES_PER_CHANNEL));
  const context = requestContext(input.connection);

  const messages: SafeTeamsMessage[] = [];
  let next: string | null = `/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages?$top=${top}`;
  let pages = 0;
  let reachedCursor = false;

  while (next && pages < TEAMS_MAX_PAGES_PER_CHANNEL && messages.length < top) {
    const data: GraphCollection = await teamsGraphRequest<GraphCollection>(context, "GET", next);
    pages += 1;
    for (const item of data?.value ?? []) {
      const message = toSafeMessage(teamId, channelId, asRecord(item));
      if (!message) continue;
      if (input.sinceMessageId && message.messageId === input.sinceMessageId) {
        reachedCursor = true;
        break;
      }
      messages.push(message);
      if (messages.length >= top) break;
    }
    if (reachedCursor) break;
    const link = typeof data?.["@odata.nextLink"] === "string" ? data["@odata.nextLink"] : null;
    next = isSafeGraphNextLink(link) ? link : null;
  }

  return {
    messages,
    latestMessageId: messages[0]?.messageId ?? input.sinceMessageId ?? null,
    truncated: Boolean(next) && !reachedCursor,
  };
}

// ── Write operation (approval-gated by the caller, never by this file) ───

export type TeamsSendResult = {
  status: "sent";
  teamId: string;
  channelId: string;
  messageId: string | null;
};

/**
 * ChannelMessage.Send - the raw provider write.
 *
 * This function performs NO authorization. It is the exact equivalent of
 * sendMicrosoftMail()/sendSlackMessageAfterApproval(): callers must have
 * already passed connector capability, execution eligibility, the centralized
 * execution policy engine, and a granted approval. The only caller in this
 * codebase is the approval execution path.
 *
 * Content is sent as plain text, never HTML, so Auterim can never inject
 * markup into a customer's Teams channel.
 */
export async function sendTeamsChannelMessage(input: {
  connection: MicrosoftTeamsConnection;
  teamId: string;
  channelId: string;
  text: string;
}): Promise<TeamsSendResult> {
  const teamId = input.teamId.trim();
  const channelId = input.channelId.trim();
  const text = input.text.trim();
  if (!teamId || !channelId) {
    throw new MicrosoftTeamsGraphError("A Microsoft Teams team and channel are required.", { step: "teams.validate", code: "teams_invalid_target", status: null, graphCode: null });
  }
  if (!text) {
    throw new MicrosoftTeamsGraphError("Microsoft Teams message text is required.", { step: "teams.validate", code: "teams_invalid_target", status: null, graphCode: null });
  }
  if (!input.connection.scopeState.sendGranted) {
    throw new MicrosoftTeamsGraphError("Microsoft Teams send permission has not been granted for this workspace.", { step: "teams.validate", code: "teams_permission_required", status: null, graphCode: null });
  }

  const created = await teamsGraphRequest<Record<string, unknown>>(
    requestContext(input.connection),
    "POST",
    `/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages`,
    { body: { contentType: "text", content: text } },
  );

  return { status: "sent", teamId, channelId, messageId: asText(asRecord(created).id) };
}

// ── Cursor persistence ──────────────────────────────────────────────────

/**
 * Persist the incremental sync cursor for one channel. Only provider ids and
 * timestamps are stored - never message content.
 */
export async function saveMicrosoftTeamsCursor(input: {
  workspaceId: string;
  teamId: string;
  channelId: string;
  lastMessageId: string | null;
  supabase?: SupabaseAdmin;
}): Promise<void> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const credential = await getMicrosoftCredential(input.workspaceId, supabase);
  if (!credential) return;
  const settings = readMicrosoftTeamsSettings(credential.metadata);
  const key = teamsCursorKey(input.teamId, input.channelId);
  const metadata = writeMicrosoftTeamsSettings(credential.metadata, {
    cursors: { ...settings.cursors, [key]: { lastSyncedAt: new Date().toISOString(), lastMessageId: input.lastMessageId } },
  });
  await supabase
    .from("os_connector_credentials")
    .update({ metadata })
    .eq("workspace_id", input.workspaceId)
    .eq("connector_key", "microsoft");
}
