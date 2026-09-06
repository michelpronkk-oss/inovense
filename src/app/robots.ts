import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getAdminHost, getAppHost, normalizeHost } from "@/lib/host-routing";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = normalizeHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );

  // The app and admin surfaces share this deployment but are never public
  // search destinations. The host check also covers direct robots.txt calls.
  if (host === getAppHost() || host === getAdminHost()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/app",
          "/app/",
          "/app-preview",
          "/api/",
          "/client/",
          "/proposal/",
          "/onboarding/",
        ],
      },
    ],
    sitemap: "https://auterim.com/sitemap.xml",
  };
}
