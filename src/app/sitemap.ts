import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getAdminHost, getAppHost, normalizeHost } from "@/lib/host-routing";

const BASE = "https://auterim.com";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host = normalizeHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );

  // Private surfaces must not publish the marketing sitemap from their own host.
  if (host === getAppHost() || host === getAdminHost()) return [];

  const pages: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
    ["", "weekly", 1],
    ["/agents", "monthly", 0.9],
    ["/operators", "monthly", 0.85],
    ["/use-cases", "monthly", 0.82],
    ["/getting-started", "monthly", 0.8],
    ["/integrations", "monthly", 0.85],
    ["/pricing", "monthly", 0.85],
    ["/security", "monthly", 0.8],
    ["/approvals", "monthly", 0.8],
    ["/trust", "monthly", 0.75],
    ["/architecture", "monthly", 0.7],
    ["/workflows", "monthly", 0.75],
    ["/memory", "monthly", 0.7],
    ["/about", "yearly", 0.55],
    ["/contact", "yearly", 0.55],
    ["/careers", "monthly", 0.5],
    ["/press", "monthly", 0.45],
    ["/changelog", "monthly", 0.7],
    ["/status", "weekly", 0.55],
    ["/solutions/revenue-teams", "monthly", 0.75],
    ["/solutions/client-services", "monthly", 0.75],
    ["/solutions/operations", "monthly", 0.75],
    ["/solutions/marketing", "monthly", 0.7],
    ["/solutions/founders-ops", "monthly", 0.7],
    ["/privacy", "yearly", 0.25],
    ["/terms", "yearly", 0.25],
    ["/cookies", "yearly", 0.2],
  ];

  return pages.map(([path, changeFrequency, priority]) => ({
    url: `${BASE}${path}`,
    changeFrequency,
    priority,
  }));
}
