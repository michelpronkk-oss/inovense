export type HostSurface = "public" | "admin" | "portal" | "app" | "development";

const DEFAULT_PUBLIC_HOST = "www.inovense.com";
const DEFAULT_PUBLIC_APEX_HOST = "inovense.com";
const DEFAULT_ADMIN_HOST = "admin.inovense.com";
const DEFAULT_PORTAL_HOST = "portal.inovense.com";
const DEFAULT_APP_HOST = "app.inovense.com";

export function normalizeHost(rawHost: string | null | undefined): string {
  const first = (rawHost ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.replace(/:\d+$/, "");
}

function isLocalDevelopmentHost(host: string): boolean {
  if (!host) return false;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

export function getPublicHost(): string {
  return normalizeHost(process.env.NEXT_PUBLIC_PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST);
}

export function getPublicApexHost(): string {
  return normalizeHost(process.env.NEXT_PUBLIC_PUBLIC_APEX_HOST ?? DEFAULT_PUBLIC_APEX_HOST);
}

export function getAdminHost(): string {
  return normalizeHost(process.env.NEXT_PUBLIC_ADMIN_HOST ?? DEFAULT_ADMIN_HOST);
}

export function getPortalHost(): string {
  return normalizeHost(process.env.NEXT_PUBLIC_PORTAL_HOST ?? DEFAULT_PORTAL_HOST);
}

export function getAppHost(): string {
  return normalizeHost(process.env.NEXT_PUBLIC_APP_HOST ?? DEFAULT_APP_HOST);
}

export function resolveHostSurface(host: string): HostSurface {
  const normalized = normalizeHost(host);
  const adminHost = getAdminHost();
  const portalHost = getPortalHost();
  const appHost = getAppHost();
  const publicHost = getPublicHost();
  const publicApexHost = getPublicApexHost();

  if (isLocalDevelopmentHost(normalized)) {
    return "development";
  }

  if (normalized === adminHost) return "admin";
  if (normalized === portalHost) return "portal";
  if (normalized === appHost) return "app";
  if (normalized === publicHost || normalized === publicApexHost) return "public";

  // Unknown hosts (preview URLs, custom staging domains) keep default app behavior.
  return "development";
}

export function isClientSurfacePath(pathname: string): boolean {
  return (
    pathname.startsWith("/client") ||
    pathname.startsWith("/proposal") ||
    pathname.startsWith("/onboarding")
  );
}

export function stripAdminPrefix(pathname: string): string {
  if (!pathname.startsWith("/admin")) return pathname;
  const stripped = pathname.slice("/admin".length);
  return stripped.length > 0 ? stripped : "/";
}

export function isLikelyTokenPath(pathname: string): boolean {
  const match = pathname.match(/^\/([0-9a-fA-F-]{36})$/);
  return Boolean(match);
}
