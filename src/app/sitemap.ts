import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { AUTERIM_URL } from "@/lib/brand";
import { normalizeHost, resolveHostSurface } from "@/lib/host-routing";

type PublicPage = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  lastModified?: string;
};

// Only canonical, useful public pages belong here. Do not emit a synthetic
// modification timestamp: most pages have no authoritative content date.
const PUBLIC_PAGES: PublicPage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.9 },
  { path: "/operators", changeFrequency: "monthly", priority: 0.9 },
  { path: "/control", changeFrequency: "monthly", priority: 0.8 },
  { path: "/use-cases", changeFrequency: "monthly", priority: 0.85 },
  { path: "/connectors", changeFrequency: "monthly", priority: 0.85 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.85 },
  { path: "/getting-started", changeFrequency: "monthly", priority: 0.8 },
  { path: "/security", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.75 },
  { path: "/approvals", changeFrequency: "monthly", priority: 0.75 },
  { path: "/workflows", changeFrequency: "monthly", priority: 0.75 },
  { path: "/architecture", changeFrequency: "monthly", priority: 0.7 },
  { path: "/memory", changeFrequency: "monthly", priority: 0.65 },
  { path: "/trust", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", changeFrequency: "yearly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  {
    path: "/changelog",
    changeFrequency: "monthly",
    priority: 0.7,
    // The latest verified public release in src/data/changelog.ts.
    lastModified: "2026-09-03",
  },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.25 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host = normalizeHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );
  const surface = resolveHostSurface(host);

  // Private surfaces must not publish the marketing sitemap from their own host.
  if (surface === "app" || surface === "admin" || surface === "portal") return [];

  return PUBLIC_PAGES.map(({ path, ...page }) => ({
    url: `${AUTERIM_URL}${path}`,
    ...page,
  }));
}
