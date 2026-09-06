export type HostSurface = "public" | "admin" | "portal" | "app" | "development";

import { AUTERIM_ADMIN_HOST, AUTERIM_APP_HOST, AUTERIM_PUBLIC_HOST, AUTERIM_PUBLIC_WWW_HOST } from "@/lib/brand";

const DEFAULT_PUBLIC_HOST = AUTERIM_PUBLIC_WWW_HOST;
const DEFAULT_PUBLIC_APEX_HOST = AUTERIM_PUBLIC_HOST;
const DEFAULT_ADMIN_HOST = AUTERIM_ADMIN_HOST;
const DEFAULT_APP_HOST = AUTERIM_APP_HOST;
const LEGACY_PUBLIC_HOSTS = new Set(["inovense.com", "www.inovense.com"]);
const RETIRED_AUTERIM_HOSTS = new Set(["portal.auterim.com"]);
const LEGACY_SURFACE_HOSTS: Record<Exclude<HostSurface, "development" | "public">, string> = {
  app: "app.inovense.com",
  admin: "admin.inovense.com",
  portal: "portal.inovense.com",
};

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

/** Keep www an apex redirect target even when an environment overrides the default host. */
export function isPublicAliasHost(host: string): boolean {
  const normalized = normalizeHost(host);
  return (
    normalized === AUTERIM_PUBLIC_WWW_HOST ||
    (normalized === getPublicHost() && normalized !== getPublicApexHost())
  );
}

export function getAdminHost(): string {
  return normalizeHost(process.env.NEXT_PUBLIC_ADMIN_HOST ?? DEFAULT_ADMIN_HOST);
}

export function getAppHost(): string {
  return normalizeHost(process.env.NEXT_PUBLIC_APP_HOST ?? DEFAULT_APP_HOST);
}

export function isLegacyHost(host: string): boolean {
  const normalized = normalizeHost(host);
  return LEGACY_PUBLIC_HOSTS.has(normalized) || RETIRED_AUTERIM_HOSTS.has(normalized) || Object.values(LEGACY_SURFACE_HOSTS).includes(normalized);
}

export function getCanonicalHostForSurface(surface: HostSurface): string {
  if (surface === "public") return getPublicApexHost();
  if (surface === "admin") return getAdminHost();
  if (surface === "portal") return getAppHost();
  if (surface === "app") return getAppHost();
  return getPublicApexHost();
}

export function resolveHostSurface(host: string): HostSurface {
  const normalized = normalizeHost(host);
  const adminHost = getAdminHost();
  const appHost = getAppHost();
  const publicHost = getPublicHost();
  const publicApexHost = getPublicApexHost();

  if (isLocalDevelopmentHost(normalized)) {
    return "development";
  }

  if (normalized === adminHost) return "admin";
  if (normalized === appHost) return "app";
  if (normalized === publicHost || normalized === publicApexHost || normalized === AUTERIM_PUBLIC_WWW_HOST) return "public";

  if (LEGACY_PUBLIC_HOSTS.has(normalized)) return "public";
  if (normalized === LEGACY_SURFACE_HOSTS.admin) return "admin";
  if (normalized === LEGACY_SURFACE_HOSTS.portal || RETIRED_AUTERIM_HOSTS.has(normalized)) return "portal";
  if (normalized === LEGACY_SURFACE_HOSTS.app) return "app";

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
