export type WebsiteVerificationMethod = "dns_txt" | "html_meta" | "html_file";
export type WebsiteVerificationStatus = "pending" | "verified" | "failed" | "expired";
export type WebsiteVerificationErrorCode =
  | "SOURCE_NOT_FOUND"
  | "CHALLENGE_NOT_FOUND"
  | "CHALLENGE_SUPERSEDED"
  | "CHALLENGE_FAILED"
  | "CHALLENGE_EXPIRED"
  | "TOKEN_REQUIRED"
  | "TOKEN_MISMATCH"
  | "DNS_NOT_FOUND"
  | "HTML_NOT_FOUND"
  | "INTERNAL_ERROR";

export class WebsiteVerificationError extends Error {
  readonly name = "WebsiteVerificationError";

  constructor(
    readonly code: WebsiteVerificationErrorCode,
    message: string,
    readonly status = code === "INTERNAL_ERROR" ? 500 : code === "SOURCE_NOT_FOUND" ? 404 : 409,
  ) {
    super(message);
  }
}

export type WebsiteHealthStatus = "setup_required" | "verification_pending" | "connected" | "syncing" | "healthy" | "partial" | "degraded" | "paused" | "blocked_by_robots" | "reconnect_required" | "failed";
export type WebsiteRunState = "queued" | "claimed" | "verifying" | "discovering" | "fetching" | "extracting" | "review_ready" | "completed" | "partial" | "failed" | "cancelled";
export type WebsiteObservationReviewStatus = "pending" | "kept_observed" | "confirmed_owner" | "edited_owner" | "dismissed" | "ignored";

export type WebsiteSourceSummary = {
  id: string;
  workspaceId: string;
  canonicalOrigin: string;
  hostname: string;
  allowedSubdomains: string[];
  syncEnabled: boolean;
  cadence: "manual" | "daily" | "weekly" | "monthly";
  includePaths: string[];
  excludePaths: string[];
  maxPages: number;
  verificationStatus: WebsiteVerificationStatus;
  verificationMethod: WebsiteVerificationMethod | null;
  verifiedAt: string | null;
  verificationExpiresAt: string | null;
  robotsStatus: "unknown" | "allowed" | "blocked" | "unavailable" | "error";
  healthStatus: WebsiteHealthStatus;
  lastSuccessfulSyncAt: string | null;
  nextSyncAt: string | null;
  pagesDiscovered: number;
  pagesChecked: number;
  pagesChanged: number;
  pagesSkipped: number;
  pagesFailed: number;
  observationsPending: number;
  conflictsPending: number;
  lastRunId: string | null;
  disconnectedAt: string | null;
  updatedAt: string;
};

export type WebsiteObservationSummary = {
  id: string;
  pageId: string;
  canonicalSourceUrl: string;
  observationType: string;
  observationKey: string;
  observationValue: string;
  evidenceExcerpt: string;
  observedAt: string;
  confidence: "low" | "medium" | "high";
  freshnessStatus: "fresh" | "stale" | "withdrawn" | "unsupported";
  conflictStatus: "none" | "conflict" | "resolved";
  reviewStatus: WebsiteObservationReviewStatus;
  memoryEntryId: string | null;
};
