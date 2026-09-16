import { canonicalizeWebsiteUrl, type NormalizedWebsiteOrigin, websiteUrlAllowed } from "./website-url";

export type SitemapDocument = { urls: Array<{ loc: string; lastmod: string | null }>; indexes: string[] };

function decodeXml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">" ).replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export function parseSitemapXml(input: string): SitemapDocument {
  const indexes: string[] = [];
  const urls: Array<{ loc: string; lastmod: string | null }> = [];
  const indexBlocks = input.match(/<sitemap\b[^>]*>[\s\S]*?<\/sitemap>/gi) ?? [];
  const urlBlocks = input.match(/<url\b[^>]*>[\s\S]*?<\/url>/gi) ?? [];
  const locIn = (block: string) => block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1]?.trim();
  for (const block of indexBlocks) { const loc = locIn(block); if (loc) indexes.push(decodeXml(loc)); }
  for (const block of urlBlocks) {
    const loc = locIn(block);
    if (!loc) continue;
    const lastmod = block.match(/<lastmod\b[^>]*>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim() ?? null;
    urls.push({ loc: decodeXml(loc), lastmod: lastmod && Number.isFinite(Date.parse(lastmod)) ? new Date(lastmod).toISOString() : null });
  }
  return { urls: urls.slice(0, 10_000), indexes: indexes.slice(0, 100) };
}

export function acceptSitemapUrls(input: { document: SitemapDocument; origin: NormalizedWebsiteOrigin; allowedSubdomains?: string[]; includePaths?: string[]; excludePaths?: string[]; limit: number }): Array<{ url: string; lastmod: string | null }> {
  const accepted: Array<{ url: string; lastmod: string | null }> = [];
  const seen = new Set<string>();
  for (const item of input.document.urls) {
    const canonical = canonicalizeWebsiteUrl(item.loc, input.origin, { allowedSubdomains: input.allowedSubdomains });
    if (!canonical || !websiteUrlAllowed({ url: canonical, origin: input.origin, allowedSubdomains: input.allowedSubdomains, includePaths: input.includePaths, excludePaths: input.excludePaths }) || seen.has(canonical)) continue;
    seen.add(canonical);
    accepted.push({ url: canonical, lastmod: item.lastmod });
    if (accepted.length >= input.limit) break;
  }
  return accepted;
}
