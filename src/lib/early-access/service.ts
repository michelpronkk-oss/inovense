import { parseEarlyAccessSubmission, type EarlyAccessSubmission } from "./validation";

export type EarlyAccessSavedRequest = {
  id: string;
  isNew: boolean;
  confirmationSentAt: string | null;
  confirmationAttemptedAt: string | null;
  submission: EarlyAccessSubmission;
};

export type EarlyAccessRepository = {
  save(submission: EarlyAccessSubmission): Promise<EarlyAccessSavedRequest>;
  claimConfirmation(input: { id: string; attemptedAt: string; olderThan: string }): Promise<boolean>;
  markConfirmationSent(input: { id: string; sentAt: string }): Promise<void>;
};

export type EarlyAccessServiceDependencies = {
  repository: EarlyAccessRepository;
  sendConfirmation(submission: EarlyAccessSubmission): Promise<void>;
  notifyInternal(submission: EarlyAccessSubmission): Promise<void>;
  now?: () => Date;
  logFailure?: (kind: "persistence" | "confirmation" | "internal_notification") => void;
};

export type EarlyAccessServiceResult =
  | { ok: true }
  | { ok: false; status: 400; fieldErrors: Record<string, string> }
  | { ok: false; status: 500 };

const CONFIRMATION_SUPPRESSION_MS = 24 * 60 * 60 * 1000;

export async function submitEarlyAccessRequest(
  body: unknown,
  dependencies: EarlyAccessServiceDependencies,
): Promise<EarlyAccessServiceResult> {
  const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
  // Quietly absorb bots that fill the visually hidden honeypot.
  if (typeof raw.website === "string" && raw.website.trim()) return { ok: true };

  const parsed = parseEarlyAccessSubmission(body);
  if (!parsed.ok) return { ok: false, status: 400, fieldErrors: parsed.errors };

  let saved: EarlyAccessSavedRequest;
  try {
    saved = await dependencies.repository.save(parsed.data);
  } catch {
    dependencies.logFailure?.("persistence");
    return { ok: false, status: 500 };
  }

  const now = dependencies.now?.() ?? new Date();
  const attemptedAt = now.toISOString();
  const olderThan = new Date(now.getTime() - CONFIRMATION_SUPPRESSION_MS).toISOString();
  const work: Promise<void>[] = [];

  work.push((async () => {
    try {
      const claimed = await dependencies.repository.claimConfirmation({ id: saved.id, attemptedAt, olderThan });
      if (!claimed) return;
      await dependencies.sendConfirmation(saved.submission);
      await dependencies.repository.markConfirmationSent({ id: saved.id, sentAt: attemptedAt });
    } catch {
      // Persistence is the user's request. Delivery can be retried separately.
      dependencies.logFailure?.("confirmation");
    }
  })());

  if (saved.isNew) {
    work.push((async () => {
      try {
        await dependencies.notifyInternal(saved.submission);
      } catch {
        dependencies.logFailure?.("internal_notification");
      }
    })());
  }

  await Promise.all(work);
  return { ok: true };
}
