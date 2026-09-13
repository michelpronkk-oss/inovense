import type { SafeGmailMessage } from "@/lib/connectors/gmail";

export type GmailHistoryMessageRef = { id?: string; labelIds?: string[] };
export type GmailHistoryPage = {
  historyId?: string;
  nextPageToken?: string;
  history?: Array<{
    messagesAdded?: Array<{ message?: GmailHistoryMessageRef }>;
    labelsAdded?: Array<{ message?: GmailHistoryMessageRef; labelIds?: string[] }>;
  }>;
};
export type GmailRecentPage = {
  nextPageToken?: string;
  messages?: Array<{ id?: string; threadId?: string }>;
};

export class GmailHistorySyncError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "GmailHistorySyncError";
  }
}

export function isValidGmailHistoryId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]{1,30}$/.test(value);
}

export function compareGmailHistoryIds(left: string, right: string): -1 | 0 | 1 {
  if (!isValidGmailHistoryId(left) || !isValidGmailHistoryId(right)) {
    throw new GmailHistorySyncError("invalid_gmail_history_id");
  }
  const leftId = BigInt(left);
  const rightId = BigInt(right);
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

export function extractGmailHistoryMessageIds(page: GmailHistoryPage): string[] {
  const ids = new Set<string>();
  for (const entry of page.history ?? []) {
    // The watch itself is filtered to INBOX. messagesAdded entries are
    // therefore relevant, but the full message is fetched and checked again
    // before it is passed to Revenue.
    for (const item of entry.messagesAdded ?? []) {
      if (typeof item.message?.id === "string" && item.message.id) ids.add(item.message.id);
    }
    // A previously existing message can be returned to the Inbox without a
    // new messagesAdded record; track only an explicit INBOX label addition.
    for (const item of entry.labelsAdded ?? []) {
      if (item.labelIds?.includes("INBOX") && typeof item.message?.id === "string" && item.message.id) {
        ids.add(item.message.id);
      }
    }
  }
  return [...ids];
}

export async function collectGmailHistoryRange(input: {
  startHistoryId: string;
  listPage: (pageToken?: string) => Promise<GmailHistoryPage>;
  onPage?: () => Promise<void>;
  maxPages?: number;
}): Promise<{ messageIds: string[]; latestHistoryId: string; pages: number }> {
  if (!isValidGmailHistoryId(input.startHistoryId)) throw new GmailHistorySyncError("invalid_gmail_history_checkpoint");
  const ids = new Set<string>();
  const seenPageTokens = new Set<string>();
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 2_000, 10_000));
  let pageToken: string | undefined;
  let latestHistoryId: string | null = null;
  let pages = 0;

  do {
    if (pages >= maxPages) throw new GmailHistorySyncError("gmail_history_page_limit");
    if (pageToken && seenPageTokens.has(pageToken)) throw new GmailHistorySyncError("gmail_history_page_loop");
    if (pageToken) seenPageTokens.add(pageToken);
    const page = await input.listPage(pageToken);
    pages += 1;
    if (page.historyId && isValidGmailHistoryId(page.historyId)) latestHistoryId = page.historyId;
    for (const id of extractGmailHistoryMessageIds(page)) ids.add(id);
    if (input.onPage) await input.onPage();
    pageToken = page.nextPageToken;
  } while (pageToken);

  if (!latestHistoryId) throw new GmailHistorySyncError("gmail_history_response_missing_id");
  if (compareGmailHistoryIds(latestHistoryId, input.startHistoryId) < 0) {
    throw new GmailHistorySyncError("gmail_history_checkpoint_regression");
  }
  return { messageIds: [...ids], latestHistoryId, pages };
}

/** Fully reconcile Gmail's same 30-day recent window after history expiry. */
export async function reconcileRecentGmailInbox(input: {
  listPage: (pageToken?: string) => Promise<GmailRecentPage>;
  getMessage: (messageId: string) => Promise<SafeGmailMessage | null>;
  processMessages: (messages: SafeGmailMessage[]) => Promise<boolean>;
  extendLease?: () => Promise<void>;
  batchSize?: number;
  maxPages?: number;
}): Promise<{ pages: number; messagesProcessed: number }> {
  const batchSize = Math.max(1, Math.min(input.batchSize ?? 20, 20));
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 20_000, 20_000));
  const seenPageTokens = new Set<string>();
  const seenMessageIds = new Set<string>();
  let pageToken: string | undefined;
  let pages = 0;
  let messagesProcessed = 0;
  let batch: SafeGmailMessage[] = [];

  const flush = async () => {
    if (!batch.length) return;
    if (input.extendLease) await input.extendLease();
    const current = batch;
    batch = [];
    if (!await input.processMessages(current)) throw new GmailHistorySyncError("gmail_history_recovery_scan_failed");
    messagesProcessed += current.length;
  };

  do {
    if (pages >= maxPages) throw new GmailHistorySyncError("gmail_recent_page_limit");
    if (pageToken && seenPageTokens.has(pageToken)) throw new GmailHistorySyncError("gmail_recent_page_loop");
    if (pageToken) seenPageTokens.add(pageToken);
    if (input.extendLease) await input.extendLease();
    const page = await input.listPage(pageToken);
    pages += 1;
    for (const ref of page.messages ?? []) {
      if (!ref.id || seenMessageIds.has(ref.id)) continue;
      seenMessageIds.add(ref.id);
      const message = await input.getMessage(ref.id);
      if (message?.id && message.labelIds.includes("INBOX")) batch.push(message);
      if (batch.length >= batchSize) await flush();
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  await flush();
  return { pages, messagesProcessed };
}

type SyncResult = {
  status: "duplicate" | "synced" | "recovered";
  historyId: string;
  messagesFound: number;
  messagesProcessed: number;
  pages: number;
};

/**
 * Pull one complete Gmail history range, send only current Inbox messages
 * through the caller's canonical scanner, and checkpoint only after every
 * batch succeeds. Dependencies are injected so pagination, duplicates,
 * expiry recovery, and failure-before-checkpoint are unit-testable.
 */
export async function syncGmailHistoryEvent(input: {
  checkpointHistoryId: string | null;
  notificationHistoryId: string;
  listPage: (startHistoryId: string, pageToken?: string) => Promise<GmailHistoryPage>;
  getMessage: (messageId: string) => Promise<SafeGmailMessage | null>;
  processMessages: (messages: SafeGmailMessage[]) => Promise<boolean>;
  reconcileRecent: () => Promise<boolean>;
  getCurrentHistoryId: () => Promise<string>;
  advanceCheckpoint: (expectedHistoryId: string | null, nextHistoryId: string) => Promise<boolean>;
  extendLease?: () => Promise<void>;
  batchSize?: number;
}): Promise<SyncResult> {
  if (!isValidGmailHistoryId(input.notificationHistoryId)) throw new GmailHistorySyncError("invalid_gmail_notification_history_id");
  const startHistoryId = input.checkpointHistoryId;
  if (startHistoryId !== null && !isValidGmailHistoryId(startHistoryId)) throw new GmailHistorySyncError("invalid_gmail_history_checkpoint");
  if (startHistoryId && compareGmailHistoryIds(input.notificationHistoryId, startHistoryId) <= 0) {
    return { status: "duplicate", historyId: startHistoryId, messagesFound: 0, messagesProcessed: 0, pages: 0 };
  }
  if (!startHistoryId) throw new GmailHistorySyncError("gmail_history_checkpoint_missing");

  let range: { messageIds: string[]; latestHistoryId: string; pages: number };
  try {
    range = await collectGmailHistoryRange({
      startHistoryId,
      listPage: (pageToken) => input.listPage(startHistoryId, pageToken),
      onPage: input.extendLease,
    });
  } catch (error) {
    const status = error && typeof error === "object" && "details" in error
      ? Number((error as { details?: { status?: number } }).details?.status)
      : error && typeof error === "object" && "status" in error
        ? Number((error as { status?: number }).status)
        : null;
    if (status !== 404) throw error;

    // Establish the recovery boundary BEFORE reconciliation. Events arriving
    // afterward remain greater than this baseline and will be consumed by the
    // next notification/reconciliation, never skipped by the new checkpoint.
    const baselineHistoryId = await input.getCurrentHistoryId();
    if (!isValidGmailHistoryId(baselineHistoryId) || compareGmailHistoryIds(baselineHistoryId, startHistoryId) < 0) {
      throw new GmailHistorySyncError("gmail_history_recovery_baseline_invalid");
    }
    if (input.extendLease) await input.extendLease();
    const reconciled = await input.reconcileRecent();
    if (!reconciled) throw new GmailHistorySyncError("gmail_history_recovery_scan_failed");
    const advanced = await input.advanceCheckpoint(startHistoryId, baselineHistoryId);
    if (!advanced) throw new GmailHistorySyncError("gmail_history_recovery_checkpoint_conflict");
    return { status: "recovered", historyId: baselineHistoryId, messagesFound: 0, messagesProcessed: 0, pages: 0 };
  }

  if (compareGmailHistoryIds(range.latestHistoryId, input.notificationHistoryId) < 0) {
    throw new GmailHistorySyncError("gmail_history_not_caught_up");
  }

  const inboxMessages: SafeGmailMessage[] = [];
  for (const messageId of range.messageIds) {
    if (input.extendLease) await input.extendLease();
    const message = await input.getMessage(messageId);
    if (message?.id && message.labelIds.includes("INBOX")) inboxMessages.push(message);
  }

  const batchSize = Math.max(1, Math.min(input.batchSize ?? 20, 20));
  for (let index = 0; index < inboxMessages.length; index += batchSize) {
    if (input.extendLease) await input.extendLease();
    const processed = await input.processMessages(inboxMessages.slice(index, index + batchSize));
    if (!processed) throw new GmailHistorySyncError("gmail_revenue_processing_failed");
  }

  if (input.extendLease) await input.extendLease();
  const advanced = await input.advanceCheckpoint(startHistoryId, range.latestHistoryId);
  if (!advanced) throw new GmailHistorySyncError("gmail_history_checkpoint_conflict");
  return {
    status: "synced",
    historyId: range.latestHistoryId,
    messagesFound: inboxMessages.length,
    messagesProcessed: inboxMessages.length,
    pages: range.pages,
  };
}
