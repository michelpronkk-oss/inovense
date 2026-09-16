/** Product-level limits. Sitemap protocol maxima are intentionally much higher
 * than these values; a customer domain never grants permission to crawl at
 * protocol maximums. */
export const WEBSITE_LIMITS = {
  maxPagesPerRun: 100,
  defaultMaxPages: 50,
  maxConcurrentRequestsPerOrigin: 2,
  minimumRequestIntervalMs: 1_000,
  requestTimeoutMs: 15_000,
  maxHtmlResponseBytes: 2 * 1024 * 1024,
  maxSitemapResponseBytes: 2 * 1024 * 1024,
  maxRobotsResponseBytes: 256 * 1024,
  maxRedirects: 4,
  maxSitemapFilesPerRun: 10,
  maxSitemapDepth: 2,
  maxSitemapEntriesPerRun: 500,
  maxUrlLength: 2_048,
  robotsCacheMs: 24 * 60 * 60 * 1_000,
  verificationTtlMs: 30 * 60 * 1_000,
  pageFailureTombstoneThreshold: 3,
  pageFailureTombstoneWindowMs: 14 * 24 * 60 * 60 * 1_000,
  observationEvidenceChars: 500,
  observationValueChars: 1_200,
  normalizedPageTextChars: 200_000,
  extractionVersion: "website-observations-v1",
} as const;

export type WebsiteSyncCadence = "manual" | "daily" | "weekly" | "monthly";

export function cadenceMs(cadence: WebsiteSyncCadence): number {
  if (cadence === "daily") return 24 * 60 * 60 * 1_000;
  if (cadence === "monthly") return 30 * 24 * 60 * 60 * 1_000;
  return 7 * 24 * 60 * 60 * 1_000;
}

export function nextWebsiteSyncAt(cadence: WebsiteSyncCadence, now = Date.now()): string | null {
  if (cadence === "manual") return null;
  const jitter = Math.floor(Math.random() * 30 * 60 * 1_000);
  return new Date(now + cadenceMs(cadence) + jitter).toISOString();
}
