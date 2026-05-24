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

export function getMarketingUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MARKETING_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || "http://localhost:3000"
  );
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
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

export function getAppRoute(path: string = "/onboarding"): string {
  const normalized = ensureLeadingSlash(path);
  const appUrl = getAppUrl();
  const appHost = toHostname(appUrl);
  const shouldUseLegacyPath = isLocalHostName(appHost);

  if (shouldUseLegacyPath) {
    return normalized.startsWith("/app") ? normalized : `/app${normalized}`;
  }

  if (normalized === "/app") return "/";
  if (normalized.startsWith("/app/")) return normalized.slice(4);
  return normalized;
}

export function appHref(path: string = "/app"): string {
  const appBase = getAppUrl();
  const appPath = getAppRoute(path);
  return join(appBase, appPath);
}

export function marketingHref(path: string = "/"): string {
  return join(getMarketingUrl(), path);
}
