// Microsoft Teams operator executor.
//
// This is the ONLY module operators and the approval route use to touch
// Teams. It mirrors executors/microsoft.ts and executors/slack.ts:
//
//   - read helpers return safe, normalized, bounded context (no approval)
//   - createTeamsSendApproval() only ever *prepares* an approval
//   - sendTeamsChannelMessageAfterApproval() performs the provider write and
//     is called from exactly one place: the approval execution path in
//     src/app/api/approvals/[id]/approve/route.ts, after that route has run
//     the centralized execution policy engine (evaluateExecutionPolicy).
//
// No operator scan, UI route, or LLM path may call the send function.

import { connectorHasCapability } from "@/lib/connectors/capabilities";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import {
  MICROSOFT_TEAMS_CONNECTOR_KEY,
  MicrosoftTeamsGraphError,
  listJoinedTeams,
  listRecentChannelMessages,
  listTeamChannels,
  readMicrosoftTeamsSettings,
  resolveMicrosoftTeamsConnection,
  saveMicrosoftTeamsCursor,
  sendTeamsChannelMessage,
  teamsCursorKey,
  type MicrosoftTeamsConnection,
  type SafeTeamsChannel,
  type SafeTeamsMessage,
  type SafeTeamsTeam,
} from "@/lib/connectors/microsoft-teams";
import { operatorRuntimeId } from "@/lib/operators/logging";
import { detectTeamsSignals } from "@/lib/signals/teams";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export class MicrosoftTeamsExecutionError extends Error {
  details: { step: string; code: string; status: number | null };

  constructor(message: string, details: MicrosoftTeamsExecutionError["details"]) {
    super(message);
    this.name = "MicrosoftTeamsExecutionError";
    this.details = details;
  }
}

function toExecutionError(step: string, error: unknown): MicrosoftTeamsExecutionError {
  if (error instanceof MicrosoftTeamsGraphError) {
    return new MicrosoftTeamsExecutionError(error.message, { step, code: error.details.code, status: error.details.status });
  }
  return new MicrosoftTeamsExecutionError("The Microsoft Teams request could not be completed.", { step, code: "teams_request_failed", status: null });
}

/** Static catalog guarantee, checked before any Teams write is even prepared. */
function assertTeamsWriteCapability(step: string): void {
  const definition = getConnectorDefinition(MICROSOFT_TEAMS_CONNECTOR_KEY);
  const supported = Boolean(definition)
    && definition?.status === "available"
    && connectorHasCapability(MICROSOFT_TEAMS_CONNECTOR_KEY, "chat.messages.send_after_approval");
  if (!supported) {
    throw new MicrosoftTeamsExecutionError("Microsoft Teams does not declare an approval-gated message capability.", { step, code: "teams_capability_unsupported", status: null });
  }
}

// ── Read context (no approval, no writes) ───────────────────────────────

export type TeamsOperatorContext = {
  connected: boolean;
  /** Safe reason code when context is unavailable. Never a provider message body. */
  unavailableReason: string | null;
  teamId: string | null;
  teamName: string | null;
  channelId: string | null;
  channelName: string | null;
  channelMembershipType: string | null;
  messages: SafeTeamsMessage[];
  truncated: boolean;
};

export const EMPTY_TEAMS_OPERATOR_CONTEXT: TeamsOperatorContext = {
  connected: false,
  unavailableReason: null,
  teamId: null,
  teamName: null,
  channelId: null,
  channelName: null,
  channelMembershipType: null,
  messages: [],
  truncated: false,
};

export async function listWorkspaceTeams(workspaceId: string, supabase?: SupabaseAdmin): Promise<SafeTeamsTeam[]> {
  const connection = await resolveMicrosoftTeamsConnection({ workspaceId, supabase });
  return listJoinedTeams(connection);
}

export async function listWorkspaceTeamChannels(workspaceId: string, teamId: string, supabase?: SupabaseAdmin): Promise<SafeTeamsChannel[]> {
  const connection = await resolveMicrosoftTeamsConnection({ workspaceId, supabase });
  return listTeamChannels(connection, teamId);
}

/**
 * Bounded, incremental Teams channel context for an operator scan.
 *
 * Always degrades safely: any Teams problem returns
 * `connected: false` with a safe reason code so an operator that has other
 * sources keeps running. Teams is an optional enhancement, never a hard
 * requirement (see OPERATOR_CONNECTOR_REQUIREMENTS).
 */
export async function getTeamsOperatorContext(input: {
  workspaceId: string;
  limit?: number;
  supabase?: SupabaseAdmin;
}): Promise<TeamsOperatorContext> {
  let connection: MicrosoftTeamsConnection;
  try {
    connection = await resolveMicrosoftTeamsConnection({ workspaceId: input.workspaceId, supabase: input.supabase });
  } catch (error) {
    const reason = error instanceof MicrosoftTeamsGraphError ? error.details.code : "teams_request_failed";
    return { ...EMPTY_TEAMS_OPERATOR_CONTEXT, unavailableReason: reason };
  }

  const settings = connection.settings;
  if (!settings.defaultTeamId || !settings.defaultChannelId) {
    return { ...EMPTY_TEAMS_OPERATOR_CONTEXT, connected: true, unavailableReason: "teams_destination_not_selected" };
  }

  const cursor = settings.cursors[teamsCursorKey(settings.defaultTeamId, settings.defaultChannelId)] ?? null;
  try {
    const result = await listRecentChannelMessages({
      connection,
      teamId: settings.defaultTeamId,
      channelId: settings.defaultChannelId,
      limit: input.limit ?? 20,
      sinceMessageId: cursor?.lastMessageId ?? null,
    });
    if (result.latestMessageId && result.latestMessageId !== cursor?.lastMessageId) {
      await saveMicrosoftTeamsCursor({
        workspaceId: input.workspaceId,
        teamId: settings.defaultTeamId,
        channelId: settings.defaultChannelId,
        lastMessageId: result.latestMessageId,
        supabase: connection.supabase,
      });
    }
    return {
      connected: true,
      unavailableReason: null,
      teamId: settings.defaultTeamId,
      teamName: settings.defaultTeamName,
      channelId: settings.defaultChannelId,
      channelName: settings.defaultChannelName,
      channelMembershipType: settings.defaultChannelMembershipType,
      messages: result.messages,
      truncated: result.truncated,
    };
  } catch (error) {
    const reason = error instanceof MicrosoftTeamsGraphError ? error.details.code : "teams_request_failed";
    return { ...EMPTY_TEAMS_OPERATOR_CONTEXT, connected: true, unavailableReason: reason };
  }
}

export type TeamsOperatorSignals = {
  connected: boolean;
  unavailableReason: string | null;
  teamName: string | null;
  channelName: string | null;
  channelMembershipType: string | null;
  scanned: number;
  blockers: number;
  followUps: number;
  /** Bounded, safe candidate summaries. Never a full message body. */
  candidates: Array<{
    dedupeKey: string;
    operatorKey: string;
    signalType: string;
    confidence: string;
    routeReason: string;
    messageId: string;
    occurredAt: string | null;
  }>;
};

export const EMPTY_TEAMS_OPERATOR_SIGNALS: TeamsOperatorSignals = {
  connected: false,
  unavailableReason: null,
  teamName: null,
  channelName: null,
  channelMembershipType: null,
  scanned: 0,
  blockers: 0,
  followUps: 0,
  candidates: [],
};

/**
 * Teams signal context for an operator scan, filtered to the operators that
 * actually consume Teams today (Operations blockers, Client Flow follow-up
 * requests). Always resolves - never throws - so a Teams outage can never
 * fail an operator run that has other sources.
 */
export async function getTeamsOperatorSignals(input: {
  workspaceId: string;
  operatorKey: "operations" | "client_flow";
  limit?: number;
  supabase?: SupabaseAdmin;
}): Promise<TeamsOperatorSignals> {
  const context = await getTeamsOperatorContext({ workspaceId: input.workspaceId, limit: input.limit, supabase: input.supabase });
  if (!context.connected || context.messages.length === 0) {
    return {
      ...EMPTY_TEAMS_OPERATOR_SIGNALS,
      connected: context.connected,
      unavailableReason: context.unavailableReason,
      teamName: context.teamName,
      channelName: context.channelName,
      channelMembershipType: context.channelMembershipType,
    };
  }

  const summary = detectTeamsSignals({
    workspaceId: input.workspaceId,
    messages: context.messages,
    teamName: context.teamName,
    channelName: context.channelName,
    channelMembershipType: context.channelMembershipType,
  });
  const relevant = summary.candidates.filter((candidate) => candidate.operatorKey === input.operatorKey);

  return {
    connected: true,
    unavailableReason: null,
    teamName: context.teamName,
    channelName: context.channelName,
    channelMembershipType: context.channelMembershipType,
    scanned: summary.scanned,
    blockers: summary.blockers,
    followUps: summary.followUps,
    candidates: relevant.map((candidate) => ({
      dedupeKey: candidate.dedupeKey,
      operatorKey: candidate.operatorKey,
      signalType: candidate.signalType,
      confidence: candidate.confidence,
      routeReason: candidate.routeReason,
      messageId: candidate.sourceId,
      occurredAt: typeof candidate.metadata.occurredAt === "string" ? candidate.metadata.occurredAt : null,
    })),
  };
}

// ── Approval preparation (never sends) ──────────────────────────────────

export type PreparedTeamsMessageAction = {
  kind: "teams.send_after_approval";
  workspaceId: string;
  teamId: string;
  teamName: string | null;
  channelId: string;
  channelName: string | null;
  /** Recorded from Graph so the policy engine can classify the destination. */
  channelMembershipType: string | null;
  text: string;
  operatorRunId?: string;
  operatorKey?: string;
  dedupeKey?: string | null;
  source?: string | null;
  context?: Record<string, unknown> | null;
};

/**
 * Verify a Teams destination is the workspace's own configured, allow-listed
 * destination. This is the deliberately small version of an allowed-destination
 * model asked for by the brief: the single team/channel an admin selected in
 * connector settings is the only place Auterim may ever post.
 */
export async function assertAllowedTeamsDestination(input: {
  workspaceId: string;
  teamId: string;
  channelId: string;
  supabase?: SupabaseAdmin;
}): Promise<{ teamName: string | null; channelName: string | null; channelMembershipType: string | null }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const credential = await supabase
    .from("os_connector_credentials")
    .select("metadata")
    .eq("workspace_id", input.workspaceId)
    .eq("connector_key", "microsoft")
    .maybeSingle();
  if (credential.error) {
    throw new MicrosoftTeamsExecutionError("Microsoft Teams settings could not be verified.", { step: "teams.destination", code: "teams_destination_unavailable", status: null });
  }
  const settings = readMicrosoftTeamsSettings((credential.data?.metadata ?? null) as Record<string, unknown> | null);
  if (!settings.enabled || !settings.defaultTeamId || !settings.defaultChannelId) {
    throw new MicrosoftTeamsExecutionError("No approved Microsoft Teams destination is configured for this workspace.", { step: "teams.destination", code: "teams_destination_not_selected", status: null });
  }
  if (settings.defaultTeamId !== input.teamId || settings.defaultChannelId !== input.channelId) {
    throw new MicrosoftTeamsExecutionError("This Microsoft Teams channel is not an approved destination for this workspace.", { step: "teams.destination", code: "teams_destination_not_allowed", status: null });
  }
  return {
    teamName: settings.defaultTeamName,
    channelName: settings.defaultChannelName,
    channelMembershipType: settings.defaultChannelMembershipType,
  };
}

/**
 * Create a pending approval for a Teams channel message. This never contacts
 * Microsoft Graph and never sends anything. The message only leaves Auterim
 * if a human approves it and the live execution policy engine allows it at
 * that moment.
 */
export async function createTeamsSendApproval(input: {
  workspaceId: string;
  operatorKey: string;
  operatorRunId?: string;
  teamId: string;
  channelId: string;
  text: string;
  title: string;
  summary: string;
  dedupeKey?: string | null;
  source?: string | null;
  agentId?: string;
  supabase?: SupabaseAdmin;
}): Promise<{ approvalId: string }> {
  assertTeamsWriteCapability("teams.prepare");
  const supabase = input.supabase ?? createSupabaseAdmin();
  const text = input.text.trim();
  if (!text) {
    throw new MicrosoftTeamsExecutionError("Microsoft Teams message text is required.", { step: "teams.prepare", code: "teams_missing_text", status: null });
  }

  const destination = await assertAllowedTeamsDestination({
    workspaceId: input.workspaceId,
    teamId: input.teamId,
    channelId: input.channelId,
    supabase,
  });

  const continuation: PreparedTeamsMessageAction = {
    kind: "teams.send_after_approval",
    workspaceId: input.workspaceId,
    teamId: input.teamId,
    teamName: destination.teamName,
    channelId: input.channelId,
    channelName: destination.channelName,
    channelMembershipType: destination.channelMembershipType,
    text,
    operatorRunId: input.operatorRunId,
    operatorKey: input.operatorKey,
    dedupeKey: input.dedupeKey ?? null,
    source: input.source ?? null,
  };

  const approvalId = operatorRuntimeId("appr-teams");
  const inserted = await supabase.from("os_approvals").insert({
    id: approvalId,
    workspace_id: input.workspaceId,
    run_id: input.operatorRunId ?? "manual",
    agent_id: input.agentId ?? input.operatorKey,
    title: input.title,
    summary: input.summary,
    status: "pending",
    continuation_payload: continuation,
  });
  if (inserted.error) throw new Error(inserted.error.message);
  return { approvalId };
}

// ── Provider write (approval execution path only) ───────────────────────

export type TeamsSendAfterApprovalResult = {
  status: "sent";
  teamId: string;
  channelId: string;
  messageId: string | null;
};

/**
 * The single Teams write path. Callers MUST already have:
 *   1. a granted approval,
 *   2. an allow decision from evaluateExecutionPolicy (capability, execution
 *      eligibility, connector truth, autonomy limits, durable intent).
 *
 * This function re-verifies the two things it can verify cheaply and locally
 * (declared write capability and the allow-listed destination) so a corrupted
 * or replayed continuation payload still cannot post somewhere else.
 */
export async function sendTeamsChannelMessageAfterApproval(input: {
  workspaceId: string;
  teamId: string;
  channelId: string;
  text: string;
  approvalId: string;
  supabase?: SupabaseAdmin;
}): Promise<TeamsSendAfterApprovalResult> {
  assertTeamsWriteCapability("teams.send");
  await assertAllowedTeamsDestination({
    workspaceId: input.workspaceId,
    teamId: input.teamId,
    channelId: input.channelId,
    supabase: input.supabase,
  });

  try {
    const connection = await resolveMicrosoftTeamsConnection({
      workspaceId: input.workspaceId,
      supabase: input.supabase,
      requireSendScope: true,
    });
    const sent = await sendTeamsChannelMessage({
      connection,
      teamId: input.teamId,
      channelId: input.channelId,
      text: input.text,
    });
    return { status: "sent", teamId: sent.teamId, channelId: sent.channelId, messageId: sent.messageId };
  } catch (error) {
    throw toExecutionError("teams.send", error);
  }
}
