import type { MetadataRoute } from "next";

const BASE = "https://auterim.com";
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
    ["", "weekly", 1],
    ["/agents", "monthly", 0.9],
    ["/operators", "monthly", 0.85],
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
    ["/changelog", "monthly", 0.7],
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
