export type SourceBucket =
  | "direct"
  | "organic"
  | "social"
  | "paid"
  | "referral"
  | "unknown";

export type AttributionSnapshot = {
  sessionKey: string;
  landingPath: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  firstTouchSource: SourceBucket;
  lastTouchSource: SourceBucket;
  capturedAt: string;
};

const ORGANIC_HOSTS = [
  "google", "bing", "yahoo", "duckduckgo", "baidu", "yandex", "ecosia", "qwant",
];

const SOCIAL_HOSTS = [
  "facebook", "instagram", "twitter", "x.com", "linkedin", "tiktok", "pinterest",
  "reddit", "youtube", "snapchat", "whatsapp", "telegram",
];

export function classifySource(
  referrerHost: string | null,
  utmSource: string | null,
  utmMedium: string | null
): SourceBucket {
  if (utmSource || utmMedium) {
    const medium = (utmMedium ?? "").toLowerCase();
    const source = (utmSource ?? "").toLowerCase();
    if (medium === "cpc" || medium === "ppc" || medium === "paid" || medium.includes("paid")) {
      return "paid";
    }
    if (SOCIAL_HOSTS.some((s) => source.includes(s))) return "social";
    if (ORGANIC_HOSTS.some((s) => source.includes(s))) return "organic";
    return "referral";
  }
  if (!referrerHost) return "direct";
  const h = referrerHost.toLowerCase();
  if (ORGANIC_HOSTS.some((s) => h.includes(s))) return "organic";
  if (SOCIAL_HOSTS.some((s) => h.includes(s))) return "social";
  return "referral";
}

export function extractReferrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    const host = url.hostname.replace(/^www\./, "");
    if (!host || host === "inovense.com") return null;
    return host;
  } catch {
    return null;
  }
}

export function sanitizePath(pathname: string): string {
  return pathname.split("?")[0].split("#")[0] || "/";
}

export function generateSessionKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// localStorage key used by the tracker and read by intake forms
export const ATTR_STORAGE_KEY = "_iv_attr";
// sessionStorage key to detect new vs. returning session
export const SESSION_STORAGE_KEY = "_iv_sk";

export function readStoredAttribution(): AttributionSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ATTR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttributionSnapshot;
    if (!parsed.sessionKey) return null;
    return parsed;
  } catch {
    return null;
  }
}
