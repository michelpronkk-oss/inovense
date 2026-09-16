// Trello execution transport.
//
// The public surface (trelloRequest / listTrelloBoards / listTrelloLists /
// listTrelloCards / listTrelloCardsDetailed / listRecentTrelloCardComments /
// createTrelloCardAfterApproval / moveTrelloCardAfterApproval /
// addTrelloCardCommentAfterApproval) is unchanged, so Operations Operator
// scanning, workflow materialization, approvals execution and the connector
// setup routes are untouched. Only the transport changed: requests now go
// straight to api.trello.com with the workspace's own encrypted OAuth 1.0a
// access token instead of through a Nango proxy.

import { decryptToken } from "@/lib/connectors/crypto";
import {
  TRELLO_API_BASE,
  TRELLO_CONNECTOR_KEY,
  refreshTrelloAccessToken,
  getStoredTrelloCredential,
  TrelloReconnectionRequiredError,
  TRELLO_EXECUTION_MARKER_PREFIX,
} from "@/lib/connectors/trello";
import { getLegacyNangoConnection } from "@/lib/connectors/legacy-nango";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { accessTokenIsFresh, credentialRotatedSince, resolveAccessTokenWithRefreshLock } from "@/lib/connectors/refresh-lock";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/** The HTTP verbs the Trello REST surface used here needs. */
export type HTTP_METHOD = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type TrelloConnection = {
  workspaceId: string;
  accessToken: string;
  memberId: string | null;
  accountEmail?: string | null;
  scopes: string[];
};

export type TrelloBoard = {
  id: string;
  name: string;
  url?: string | null;
  closed?: boolean;
};

export type TrelloList = {
  id: string;
  name: string;
  boardId?: string | null;
  closed?: boolean;
};

export type TrelloCard = {
  id: string;
  name: string;
  listId?: string | null;
  url?: string | null;
  closed?: boolean;
};

export type TrelloExecutionResult = {
  status: "created" | "moved" | "comment_added";
  cardId?: string | null;
  cardUrl?: string | null;
  executionId?: string | null;
  reconciled?: boolean;
};

export class TrelloExecutionError extends Error {
  details: {
    step: string;
    method?: HTTP_METHOD;
    path?: string;
    status?: number | null;
    statusText?: string | null;
    responseBody?: unknown;
    retryAfterMs?: number | null;
    code?: string;
  };

  constructor(message: string, details: TrelloExecutionError["details"]) {
    super(message);
    this.name = "TrelloExecutionError";
    this.details = details;
  }
}

function readErrorResponse(error: unknown): {
  status?: number | null;
  statusText?: string | null;
  responseBody?: unknown;
} {
  if (!error || typeof error !== "object") return {};
  const rec = error as Record<string, unknown>;
  const response = rec.response && typeof rec.response === "object" ? rec.response as Record<string, unknown> : null;
  return {
    status: typeof response?.status === "number" ? response.status : typeof rec.status === "number" ? rec.status : null,
    statusText: typeof response?.statusText === "string" ? response.statusText : typeof rec.statusText === "string" ? rec.statusText : null,
    responseBody: response?.data ?? rec.data ?? rec.body ?? null,
  };
}

function trelloApiError(step: string, method: HTTP_METHOD, path: string, error: unknown): TrelloExecutionError {
  const response = readErrorResponse(error);
  const timeout = error instanceof DOMException && error.name === "TimeoutError";
  const message = error instanceof Error ? error.message : "Trello request failed.";
  const code = response.status === 429
    ? "trello_rate_limited"
    : response.status === 404
      ? "trello_not_found"
      : response.status === 403
        ? "trello_missing_scope"
        : "trello_request_failed";
  return new TrelloExecutionError(timeout ? "Trello request timed out. Try again later." : response.status === 429 ? "Trello rate limit reached. Try again later." : message, { step, method, path, status: response.status ?? null, statusText: response.statusText ?? null, code: timeout ? "trello_timeout" : code });
}

function query(params: Record<string, string | null | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.set(key, value);
  });
  const value = qs.toString();
  return value ? `?${value}` : "";
}

export async function getTrelloConnection(
  workspaceId: string,
  supabase: SupabaseAdmin = createSupabaseAdmin(),
): Promise<TrelloConnection | null> {
  const credential = await getStoredTrelloCredential(workspaceId, supabase);
  if (!credential) return null;
  const metadata = (credential.metadata ?? {}) as Record<string, unknown>;
  return {
    workspaceId,
    accessToken: decryptToken(credential.encrypted_access_token),
    memberId: typeof metadata.memberId === "string" ? metadata.memberId : credential.provider_account_id ?? null,
    accountEmail: credential.provider_email ?? null,
    scopes: Array.isArray(credential.scopes) ? credential.scopes.filter((scope): scope is string => typeof scope === "string") : [],
  };
}

function retryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.round(seconds * 1000), 120_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.min(date - Date.now(), 120_000)) : null;
}

async function resolveTrelloAccessToken(
  workspaceId: string,
  supabase: SupabaseAdmin,
  forceRefresh = false,
  usedCiphertext?: string,
): Promise<{ accessToken: string; credential: Awaited<ReturnType<typeof getStoredTrelloCredential>> }> {
  const credential = await getStoredTrelloCredential(workspaceId, supabase);
  if (!credential) return { accessToken: "", credential: null };
  const fresh = forceRefresh && usedCiphertext ? credentialRotatedSince(usedCiphertext) : accessTokenIsFresh;
  const resolved = await resolveAccessTokenWithRefreshLock({
    workspaceId,
    connectorKey: TRELLO_CONNECTOR_KEY,
    supabase,
    credential,
    isFresh: fresh,
    refresh: async (row) => {
      if (!row.encrypted_refresh_token) throw new TrelloReconnectionRequiredError();
      try {
        const token = await refreshTrelloAccessToken(decryptToken(row.encrypted_refresh_token));
        return { accessToken: token.access_token, refreshToken: token.refresh_token ?? null, expiresAt: typeof token.expires_in === "number" ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null, scopes: token.scope?.split(/\s+/).filter(Boolean) };
      } catch (error) {
        const detail = error as { code?: string; status?: number };
        if (detail.code === "invalid_grant" || detail.status === 400 || detail.status === 401) throw new TrelloReconnectionRequiredError();
        throw error;
      }
    },
  });
  return { accessToken: resolved.accessToken, credential };
}

async function trelloRequestWithConnection<T = unknown>(
  connection: TrelloConnection,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const step = `trello.${method.toLowerCase()}`;
  const url = `${TRELLO_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${connection.accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (error) {
    throw trelloApiError(step, method, path, error);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Trello answers some failures with a bare text body ("invalid token").
    data = null;
  }

  if (!response.ok) {
    const code = response.status === 429
      ? "trello_rate_limited"
      : response.status === 404
        ? "trello_not_found"
        : response.status === 401
          ? "trello_reconnect_required"
          : response.status === 403
            ? "trello_missing_scope"
            : "trello_request_failed";
    throw new TrelloExecutionError(
      response.status === 429
        ? "Trello rate limit reached. Try again later."
        : response.status === 401
          ? "Reconnect Trello to restore access."
          : `Trello request failed (${response.status}).`,
      { step, method, path, status: response.status, statusText: response.statusText, code, retryAfterMs: response.status === 429 ? retryAfterMs(response.headers.get("retry-after")) : null },
    );
  }
  return data as T;
}

export async function trelloRequest<T = unknown>(
  workspaceId: string,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const supabase = createSupabaseAdmin();
  const credential = await getStoredTrelloCredential(workspaceId, supabase);
  if (!credential) {
    // Distinguish "never connected" from "connected before the direct Trello
    // auth migration", so the workspace is told what to actually do.
    const legacy = await getLegacyNangoConnection({ workspaceId, connectorKey: TRELLO_CONNECTOR_KEY });
    throw new TrelloExecutionError(
      legacy.present
        ? "Trello must be reconnected with Auterim's direct Trello authorization before it can run actions."
        : "Trello is not connected for this workspace.",
      {
        step: "trello.connection",
        method,
        path,
        status: 409,
        statusText: legacy.present ? "Legacy Trello connection" : "Missing Trello connection",
        responseBody: { error: legacy.present ? "trello_legacy_reconnect_required" : "trello_not_connected" },
        code: legacy.present ? "trello_legacy_reconnect_required" : "trello_not_connected",
      },
    );
  }
  let resolved: Awaited<ReturnType<typeof resolveTrelloAccessToken>>;
  try {
    resolved = await resolveTrelloAccessToken(workspaceId, supabase);
  } catch (error) {
    if (error instanceof TrelloReconnectionRequiredError) throw new TrelloExecutionError(error.message, { step: "trello.refresh", method, path, status: 401, code: error.code });
    throw new TrelloExecutionError("Trello authentication could not be refreshed.", { step: "trello.refresh", method, path, status: 503, code: "trello_refresh_failed" });
  }
  const connection: TrelloConnection = { workspaceId, accessToken: resolved.accessToken, memberId: credential.provider_account_id ?? null, accountEmail: credential.provider_email ?? null, scopes: credential.scopes?.filter((scope): scope is string => typeof scope === "string") ?? [] };
  try {
    return await trelloRequestWithConnection<T>(connection, method, path, body);
  } catch (error) {
    const trelloError = error instanceof TrelloExecutionError ? error : null;
    if (trelloError?.details.status !== 401) throw error;
    let retried: Awaited<ReturnType<typeof resolveTrelloAccessToken>>;
    try { retried = await resolveTrelloAccessToken(workspaceId, supabase, true, credential.encrypted_access_token); } catch (refreshError) {
      if (refreshError instanceof TrelloReconnectionRequiredError) throw new TrelloExecutionError(refreshError.message, { step: "trello.refresh", method, path, status: 401, code: refreshError.code });
      throw new TrelloExecutionError("Trello authentication could not be refreshed.", { step: "trello.refresh", method, path, status: 503, code: "trello_refresh_failed" });
    }
    if (!retried.accessToken || retried.accessToken === resolved.accessToken) throw new TrelloReconnectionRequiredError();
    const retryConnection = { ...connection, accessToken: retried.accessToken };
    try { return await trelloRequestWithConnection<T>(retryConnection, method, path, body); } catch (retryError) {
      if (retryError instanceof TrelloExecutionError && retryError.details.status === 401) throw new TrelloReconnectionRequiredError();
      throw retryError;
    }
  }
}

export async function listTrelloBoards(workspaceId: string): Promise<TrelloBoard[]> {
  const data = await trelloRequest<Array<Record<string, unknown>>>(workspaceId, "GET", "/1/members/me/boards?fields=name,url,closed&filter=open");
  return data.map((board) => ({
    id: typeof board.id === "string" ? board.id : "",
    name: typeof board.name === "string" ? board.name : "",
    url: typeof board.url === "string" ? board.url : null,
    closed: board.closed === true,
  })).filter((board) => board.id && board.name);
}

export async function listTrelloLists(workspaceId: string, boardId: string): Promise<TrelloList[]> {
  const safeBoardId = boardId.trim();
  if (!safeBoardId) throw new TrelloExecutionError("Trello boardId is required.", { step: "trello.validate", code: "missing_board_id" });
  const data = await trelloRequest<Array<Record<string, unknown>>>(workspaceId, "GET", `/1/boards/${encodeURIComponent(safeBoardId)}/lists?fields=name,closed,idBoard&filter=open`);
  return data.map((list) => ({
    id: typeof list.id === "string" ? list.id : "",
    name: typeof list.name === "string" ? list.name : "",
    boardId: typeof list.idBoard === "string" ? list.idBoard : safeBoardId,
    closed: list.closed === true,
  })).filter((list) => list.id && list.name);
}

export async function listTrelloCards(workspaceId: string, listId: string): Promise<TrelloCard[]> {
  const safeListId = listId.trim();
  if (!safeListId) throw new TrelloExecutionError("Trello listId is required.", { step: "trello.validate", code: "missing_list_id" });
  const data = await trelloRequest<Array<Record<string, unknown>>>(workspaceId, "GET", `/1/lists/${encodeURIComponent(safeListId)}/cards?fields=name,url,closed,idList`);
  return data.map((card) => ({
    id: typeof card.id === "string" ? card.id : "",
    name: typeof card.name === "string" ? card.name : "",
    listId: typeof card.idList === "string" ? card.idList : safeListId,
    url: typeof card.url === "string" ? card.url : null,
    closed: card.closed === true,
  })).filter((card) => card.id && card.name);
}

export type TrelloCardLabel = { id: string; name: string; color: string | null };
export type TrelloCardBadges = { checklistItems: number; checklistItemsChecked: number; comments: number };

export type TrelloCardDetailed = {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dueComplete: boolean;
  dateLastActivity: string | null;
  listId: string | null;
  url: string | null;
  shortUrl: string | null;
  closed: boolean;
  idMembers: string[];
  labels: TrelloCardLabel[];
  badges: TrelloCardBadges;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

// Richer read used by Operations Operator to detect operational signals.
// idMembers/labels/badges are fetched in this same list-cards call (no extra
// API round-trip) - Trello returns them for free on the /cards endpoint, they
// were simply never requested before. This unlocks no-owner detection
// (idMembers.length === 0), label-based priority/escalation detection, and
// checklist-completion-based staleness, all from data already available.
// Comments are intentionally NOT fetched here (see listRecentTrelloCardComments)
// - that requires a separate, more expensive per-card call, so it is only made
// for cards that already triggered a signal from these cheap fields.
export async function listTrelloCardsDetailed(workspaceId: string, listId: string): Promise<TrelloCardDetailed[]> {
  const safeListId = listId.trim();
  if (!safeListId) throw new TrelloExecutionError("Trello listId is required.", { step: "trello.validate", code: "missing_list_id" });
  const data = await trelloRequest<Array<Record<string, unknown>>>(
    workspaceId,
    "GET",
    `/1/lists/${encodeURIComponent(safeListId)}/cards?fields=name,desc,due,dueComplete,dateLastActivity,idList,url,shortUrl,closed,idMembers,labels,badges&filter=open`,
  );
  return data.map((card) => {
    const badges = asRecord(card.badges);
    const labels = Array.isArray(card.labels)
      ? card.labels
        .map((label) => asRecord(label))
        .map((label) => ({
          id: typeof label.id === "string" ? label.id : "",
          name: typeof label.name === "string" ? label.name : "",
          color: typeof label.color === "string" ? label.color : null,
        }))
        .filter((label) => label.id)
      : [];
    return {
      id: typeof card.id === "string" ? card.id : "",
      name: typeof card.name === "string" ? card.name : "",
      desc: typeof card.desc === "string" ? card.desc : "",
      due: typeof card.due === "string" ? card.due : null,
      dueComplete: card.dueComplete === true,
      dateLastActivity: typeof card.dateLastActivity === "string" ? card.dateLastActivity : null,
      listId: typeof card.idList === "string" ? card.idList : safeListId,
      url: typeof card.url === "string" ? card.url : null,
      shortUrl: typeof card.shortUrl === "string" ? card.shortUrl : null,
      closed: card.closed === true,
      idMembers: Array.isArray(card.idMembers) ? card.idMembers.filter((memberId): memberId is string => typeof memberId === "string") : [],
      labels,
      badges: {
        checklistItems: typeof badges.checkItems === "number" ? badges.checkItems : 0,
        checklistItemsChecked: typeof badges.checkItemsChecked === "number" ? badges.checkItemsChecked : 0,
        comments: typeof badges.comments === "number" ? badges.comments : 0,
      },
    };
  }).filter((card) => card.id && card.name);
}

export type TrelloCardComment = { id: string; text: string; date: string | null };

// Cheap, signal-gated comment read: only called for cards that already
// triggered a signal from listTrelloCardsDetailed's cheap fields, never for
// every card scanned. Trello's actions endpoint is a separate call per card,
// so this is deliberately kept to a small `limit` and only reached when it is
// already worth the extra request.
export async function listRecentTrelloCardComments(workspaceId: string, cardId: string, limit = 8): Promise<TrelloCardComment[]> {
  const safeCardId = cardId.trim();
  if (!safeCardId) throw new TrelloExecutionError("Trello cardId is required.", { step: "trello.validate", code: "missing_card_id" });
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 8, 1), 20);
  const data = await trelloRequest<Array<Record<string, unknown>>>(
    workspaceId,
    "GET",
    `/1/cards/${encodeURIComponent(safeCardId)}/actions?filter=commentCard&limit=${safeLimit}`,
  );
  return data.map((action) => {
    const actionData = asRecord(action.data);
    return {
      id: typeof action.id === "string" ? action.id : "",
      text: typeof actionData.text === "string" ? actionData.text : "",
      date: typeof action.date === "string" ? action.date : null,
    };
  }).filter((comment) => comment.id && comment.text);
}

export async function validateTrelloDestination(workspaceId: string, boardId: string, listId: string): Promise<void> {
  const safeBoardId = boardId.trim();
  const safeListId = listId.trim();
  if (!safeBoardId) throw new TrelloExecutionError("Trello boardId is required.", { step: "trello.validate", code: "missing_board_id" });
  if (!safeListId) throw new TrelloExecutionError("Trello listId is required.", { step: "trello.validate", code: "missing_list_id" });
  const list = await trelloRequest<Record<string, unknown>>(workspaceId, "GET", `/1/lists/${encodeURIComponent(safeListId)}?fields=id,idBoard,name,closed`);
  if (list.idBoard !== safeBoardId || list.closed === true) throw new TrelloExecutionError("The selected Trello list is not in the selected board.", { step: "trello.validate", method: "GET", path: "/1/lists/:listId", status: 409, code: "trello_destination_mismatch" });
}

function executionReference(input: { metadata?: Record<string, unknown> | null; approvalId: string }): string {
  const candidate = typeof input.metadata?.executionId === "string" ? input.metadata.executionId : input.approvalId;
  const safe = candidate.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 120);
  if (!safe) throw new TrelloExecutionError("Trello execution reference is required.", { step: "trello.validate", code: "missing_execution_reference" });
  return safe;
}

async function findReconciledCard(workspaceId: string, boardId: string, reference: string): Promise<TrelloCard | null> {
  const cards = await trelloRequest<Array<Record<string, unknown>>>(workspaceId, "GET", `/1/boards/${encodeURIComponent(boardId)}/cards?filter=all&fields=id,name,desc,url,idList,closed`);
  const marker = `${TRELLO_EXECUTION_MARKER_PREFIX} ${reference}`;
  const found = cards.find((card) => typeof card.id === "string" && typeof card.desc === "string" && card.desc.includes(marker));
  if (!found || typeof found.id !== "string") return null;
  return { id: found.id, name: typeof found.name === "string" ? found.name : "", listId: typeof found.idList === "string" ? found.idList : null, url: typeof found.url === "string" ? found.url : null, closed: found.closed === true };
}

export async function createTrelloCardAfterApproval(input: {
  workspaceId: string;
  boardId: string;
  listId: string;
  name: string;
  description?: string | null;
  due?: string | null;
  labels?: string[];
  approvalId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<TrelloExecutionResult> {
  const listId = input.listId.trim();
  const boardId = input.boardId.trim();
  const name = input.name.trim();
  const reference = executionReference(input);
  if (!boardId) throw new TrelloExecutionError("Trello boardId is required.", { step: "trello.validate", code: "missing_board_id" });
  if (!listId) throw new TrelloExecutionError("Trello listId is required.", { step: "trello.validate", code: "missing_list_id" });
  if (!name) throw new TrelloExecutionError("Trello card name is required.", { step: "trello.validate", code: "missing_card_name" });
  if (name.length > 240) throw new TrelloExecutionError("Trello card name is too long.", { step: "trello.validate", code: "card_name_too_long" });
  await validateTrelloDestination(input.workspaceId, boardId, listId);
  const existing = await findReconciledCard(input.workspaceId, boardId, reference);
  if (existing) return { status: "created", cardId: existing.id, cardUrl: existing.url, executionId: reference, reconciled: true };
  const marker = `${TRELLO_EXECUTION_MARKER_PREFIX} ${reference}`;
  const suppliedDescription = input.description?.trim() ?? "";
  const description = suppliedDescription
    ? `${suppliedDescription.slice(0, Math.max(0, 4_000 - marker.length - 2))}\n\n${marker}`
    : marker;
  const data = await trelloRequest<Record<string, unknown>>(input.workspaceId, "POST", "/1/cards", {
    idList: listId,
    name,
    desc: description,
    pos: "bottom",
  });
  if (typeof data.id !== "string" || typeof data.url !== "string") throw new TrelloExecutionError("Trello did not confirm the created card.", { step: "trello.create_card", method: "POST", path: "/1/cards", code: "trello_unconfirmed_create" });
  return {
    status: "created",
    cardId: data.id,
    cardUrl: data.url,
    executionId: reference,
    reconciled: false,
  };
}

export async function moveTrelloCardAfterApproval(input: {
  workspaceId: string;
  cardId: string;
  listId: string;
  approvalId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<TrelloExecutionResult> {
  const cardId = input.cardId.trim();
  const listId = input.listId.trim();
  if (!cardId) throw new TrelloExecutionError("Trello cardId is required.", { step: "trello.validate", code: "missing_card_id" });
  if (!listId) throw new TrelloExecutionError("Trello listId is required.", { step: "trello.validate", code: "missing_list_id" });
  const data = await trelloRequest<Record<string, unknown>>(input.workspaceId, "PUT", `/1/cards/${encodeURIComponent(cardId)}${query({ idList: listId })}`);
  return {
    status: "moved",
    cardId: typeof data.id === "string" ? data.id : cardId,
    cardUrl: typeof data.url === "string" ? data.url : null,
  };
}

export async function addTrelloCardCommentAfterApproval(input: {
  workspaceId: string;
  cardId: string;
  text: string;
  approvalId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<TrelloExecutionResult> {
  const cardId = input.cardId.trim();
  const text = input.text.trim();
  if (!cardId) throw new TrelloExecutionError("Trello cardId is required.", { step: "trello.validate", code: "missing_card_id" });
  if (!text) throw new TrelloExecutionError("Trello comment text is required.", { step: "trello.validate", code: "missing_comment_text" });
  await trelloRequest<Record<string, unknown>>(input.workspaceId, "POST", `/1/cards/${encodeURIComponent(cardId)}/actions/comments`, { text });
  return {
    status: "comment_added",
    cardId,
    cardUrl: null,
  };
}
