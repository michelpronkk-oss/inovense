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
  appendTrelloAuth,
  getStoredTrelloCredential,
} from "@/lib/connectors/trello";
import { getLegacyNangoConnection } from "@/lib/connectors/legacy-nango";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

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
  raw?: unknown;
};

export class TrelloExecutionError extends Error {
  details: {
    step: string;
    method?: HTTP_METHOD;
    path?: string;
    status?: number | null;
    statusText?: string | null;
    responseBody?: unknown;
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
  const message = error instanceof Error ? error.message : "Trello request failed.";
  const code = response.status === 429
    ? "trello_rate_limited"
    : response.status === 404
      ? "trello_not_found"
      : response.status === 403
        ? "trello_missing_scope"
        : "trello_request_failed";
  return new TrelloExecutionError(
    response.status === 429 ? "Trello rate limit reached. Try again later." : message,
    { step, method, path, status: response.status ?? null, statusText: response.statusText ?? null, responseBody: response.responseBody ?? null, code },
  );
}

function query(params: Record<string, string | null | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.set(key, value);
  });
  const value = qs.toString();
  return value ? `?${value}` : "";
}

/**
 * The workspace's direct Trello credential, or null when Trello has never been
 * connected directly. A workspace still on the legacy Nango connection has no
 * direct credential, so it resolves to null and callers surface an honest
 * reconnect instruction rather than silently falling back to Nango.
 */
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

async function trelloRequestWithConnection<T = unknown>(
  connection: TrelloConnection,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const step = `trello.${method.toLowerCase()}`;
  // Auth travels as Trello's key/token query pair. `path` (never the signed
  // URL) is what any error carries, so the token is never logged.
  const url = `${TRELLO_API_BASE}${appendTrelloAuth(path.startsWith("/") ? path : `/${path}`, connection.accessToken)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
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
    data = text || null;
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
      { step, method, path, status: response.status, statusText: response.statusText, responseBody: data, code },
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
  const connection = await getTrelloConnection(workspaceId);
  if (!connection) {
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
  return trelloRequestWithConnection<T>(connection, method, path, body);
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
  const name = input.name.trim();
  if (!listId) throw new TrelloExecutionError("Trello listId is required.", { step: "trello.validate", code: "missing_list_id" });
  if (!name) throw new TrelloExecutionError("Trello card name is required.", { step: "trello.validate", code: "missing_card_name" });
  const data = await trelloRequest<Record<string, unknown>>(input.workspaceId, "POST", "/1/cards", {
    idList: listId,
    name,
    desc: input.description?.trim() || undefined,
    due: input.due || undefined,
    idLabels: input.labels?.length ? input.labels.join(",") : undefined,
    pos: "bottom",
  });
  return {
    status: "created",
    cardId: typeof data.id === "string" ? data.id : null,
    cardUrl: typeof data.url === "string" ? data.url : null,
    raw: data,
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
    raw: data,
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
  const data = await trelloRequest<Record<string, unknown>>(input.workspaceId, "POST", `/1/cards/${encodeURIComponent(cardId)}/actions/comments`, { text });
  return {
    status: "comment_added",
    cardId,
    cardUrl: null,
    raw: data,
  };
}
