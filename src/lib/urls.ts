import { AUTERIM_APP_URL, AUTERIM_MARKETING_URL } from "@/lib/brand";

const trimSlash = (value: string): string => value.replace(/\/+$/, "");
const ensureLeadingSlash = (value: string): string => (value.startsWith("/") ? value : `/${value}`);

function join(base: string, path: string): string {
  const normalizedPath = ensureLeadingSlash(path);
  return `${trimSlash(base)}${normalizedPath}`;
}

function isLocalHostName(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".localhost");
}

function toHostname(urlValue: string): string {
  try {
    return new URL(urlValue).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function productionUrl(value: string | undefined, fallback: string, allowedHosts: string[]): string {
  const candidate = value?.trim();
  if (process.env.NODE_ENV !== "production") return candidate || fallback;
  if (!candidate) return fallback;
  const hostname = toHostname(candidate);
  return /^https:\/\//i.test(candidate) && allowedHosts.includes(hostname) ? candidate : fallback;
}

export function getMarketingUrl(): string {
  return productionUrl(
    process.env.NEXT_PUBLIC_MARKETING_URL || process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NODE_ENV === "production" ? AUTERIM_MARKETING_URL : "http://localhost:3000",
    ["auterim.com", "www.auterim.com"],
  );
}

export function getAppUrl(): string {
  return productionUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NODE_ENV === "production" ? AUTERIM_APP_URL : "http://localhost:3000",
    ["app.auterim.com"],
  );
}

export function isAppHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const appHost = toHostname(getAppUrl());
  return Boolean(appHost && normalized === appHost);
}

export function isMarketingHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const marketingHost = toHostname(getMarketingUrl());
  return Boolean(marketingHost && normalized === marketingHost);
}

/**
 * Public product routes always live at the root of app.auterim.com. The
 * internal Next route segment remains `/app` for now, but middleware rewrites
 * these canonical URLs without exposing that implementation detail.
 */
export function getAppRoute(path: string = "/"): string {
  const normalized = ensureLeadingSlash(path);
  // API routes live at the app host root in every environment. They are not
  // dashboard pages and must never receive the local `/app` route prefix.
  if (normalized.startsWith("/api/")) return normalized;
  const appHost = toHostname(getAppUrl());
  // Local development shares one localhost origin with the marketing app, so
  // retain its internal product prefix. Production uses app.auterim.com and
  // never exposes that prefix.
  if (isLocalHostName(appHost)) {
    return normalized.startsWith("/app") ? normalized : `/app${normalized}`;
  }
  // Accept legacy callers while never generating a legacy public URL.
  if (normalized === "/app") return "/";
  if (normalized.startsWith("/app/")) return normalized.slice(4);
  return normalized;
}

export function appHref(path: string = "/"): string {
  const appBase = getAppUrl();
  const appPath = getAppRoute(path);
  return join(appBase, appPath);
}

export function marketingHref(path: string = "/"): string {
  return join(getMarketingUrl(), path);
}
