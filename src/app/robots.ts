import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { normalizeHost, resolveHostSurface } from "@/lib/host-routing";

const PUBLIC_SURFACE_DISALLOWS = [
  "/admin",
  "/admin/",
  "/app",
  "/app/",
  "/app-preview",
  "/api",
  "/api/",
  "/client",
  "/client/",
  "/proposal",
  "/proposal/",
  "/onboarding",
  "/onboarding/",
  "/auth",
  "/auth/",
  "/invite",
  "/invite/",
  "/early-access/accept",
  "/login",
  "/register",
  "/activate",
  "/forgot-password",
  "/reset-password",
];

// A specific robots.txt group does not inherit the wildcard group's rules.
// Keep the same private-path exclusions on every explicitly allowed discovery
// crawler so Allow: / can never expose application or token routes.
const DISCOVERY_CRAWLERS = [
  "OAI-SearchBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
] as const;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = normalizeHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );
  const surface = resolveHostSurface(host);

  // The app and admin surfaces share this deployment but are never public
  // search destinations. Check the legacy portal surface too; its normal page
  // requests redirect, but robots.txt bypasses the proxy redirect.
  if (surface === "app" || surface === "admin" || surface === "portal") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PUBLIC_SURFACE_DISALLOWS },
      ...DISCOVERY_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PUBLIC_SURFACE_DISALLOWS,
      })),
    ],
    sitemap: "https://auterim.com/sitemap.xml",
  };
}
