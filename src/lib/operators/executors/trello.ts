import { Nango, type HTTP_METHOD } from "@nangohq/node";
import { TRELLO_PROVIDER_CONFIG_KEY } from "@/lib/integrations/nango";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type TrelloConnection = {
  workspaceId: string;
  providerConfigKey: string;
  nangoConnectionId: string;
  accountEmail?: string | null;
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

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function nangoHost(): string {
  return (process.env.NANGO_HOST || "https://api.nango.dev").replace(/\/+$/, "");
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

export async function getTrelloConnection(
  workspaceId: string,
  supabase: SupabaseAdmin = createSupabaseAdmin(),
): Promise<TrelloConnection | null> {
  const res = await supabase
    .from("os_connectors")
    .select("workspace_id,connector_key,status,provider_email,provider_config_key,nango_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "trello")
    .eq("status", "connected")
    .maybeSingle();

  if (res.error) throw new Error(res.error.message);
  if (!res.data?.provider_config_key || !res.data?.nango_connection_id) return null;

  return {
    workspaceId,
    providerConfigKey: String(res.data.provider_config_key || TRELLO_PROVIDER_CONFIG_KEY),
    nangoConnectionId: String(res.data.nango_connection_id),
    accountEmail: typeof res.data.provider_email === "string" ? res.data.provider_email : null,
  };
}

async function trelloRequestWithConnection<T = unknown>(
  connection: TrelloConnection,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const nango = new Nango({
    secretKey: required("NANGO_SECRET_KEY"),
    host: nangoHost(),
    providerConfigKey: connection.providerConfigKey,
    connectionId: connection.nangoConnectionId,
  });

  try {
    const response = await nango.proxy<T>({
      method,
      endpoint: path,
      data: body,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
    return response.data;
  } catch (error) {
    throw trelloApiError(`trello.${method.toLowerCase()}`, method, path, error);
  }
}

export async function trelloRequest<T = unknown>(
  workspaceId: string,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const connection = await getTrelloConnection(workspaceId);
  if (!connection) {
    throw new TrelloExecutionError("Trello is not connected for this workspace.", {
      step: "trello.connection",
      method,
      path,
      status: 409,
      statusText: "Missing Trello connection",
      responseBody: { error: "trello_not_connected" },
      code: "trello_not_connected",
    });
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
