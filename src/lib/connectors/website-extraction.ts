import { createHash } from "node:crypto";

import { WEBSITE_LIMITS } from "./website-limits";

export type WebsiteExtractedPage = {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  language: string | null;
  openGraph: Record<string, string>;
  jsonLd: Array<Record<string, unknown>>;
  headings: Array<{ level: number; text: string }>;
  links: string[];
  readableText: string;
  noindex: boolean;
  noarchive: boolean;
  contactEmails: string[];
  contactPhones: string[];
  modifiedAt: string | null;
  contentHash: string;
};

export type WebsiteObservation = {
  observationType: string;
  observationKey: string;
  observationValue: string;
  evidenceExcerpt: string;
  confidence: "low" | "medium" | "high";
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Math.min(0x10ffff, parseInt(hex, 16))))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCodePoint(Math.min(0x10ffff, Number(dec))))
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
}

function cleanText(value: string, max: number = WEBSITE_LIMITS.normalizedPageTextChars): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim()).slice(0, max);
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ? decodeEntities(match[2].trim()) : null;
}

function metaValues(html: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, "name") ?? attr(tag, "property"))?.toLowerCase();
    const value = attr(tag, "content");
    if (key && value) result.set(key, cleanText(value, 500));
  }
  return result;
}

function mainText(html: string): string {
  const withoutUnsafe = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|iframe|form|nav|footer|noscript|template|svg|canvas|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+(?:hidden|aria-hidden\s*=\s*["']true["'])[^>]*>[\s\S]*?<\/[^>]+>/gi, " ");
  const main = withoutUnsafe.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    ?? withoutUnsafe.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? withoutUnsafe;
  return cleanText(main);
}

function extractJsonLd(html: string): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];
  for (const raw of html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    const body = raw.replace(/^<[\s\S]*?>/, "").replace(/<\/script>\s*$/i, "").trim();
    if (body.length > 50_000) continue;
    try {
      const parsed = JSON.parse(body) as unknown;
      if (Array.isArray(parsed)) parsed.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))).slice(0, 5).forEach((item) => results.push(item));
      else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) results.push(parsed as Record<string, unknown>);
    } catch { /* malformed JSON-LD is ignored, never fatal */ }
  }
  return results.slice(0, 10);
}

function contentHash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function extractWebsitePage(html: string): WebsiteExtractedPage {
  const meta = metaValues(html);
  const headings: Array<{ level: number; text: string }> = [];
  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = cleanText(match[2], 240);
    if (text) headings.push({ level: Number(match[1]), text });
  }
  const links: string[] = [];
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, "href");
    if (href && !href.startsWith("#") && !href.startsWith("data:") && !href.startsWith("javascript:")) links.push(href.slice(0, 2_048));
  }
  const body = mainText(html);
  const emailSet = new Set<string>();
  for (const email of body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) {
    const normalized = email.toLowerCase();
    if (/^(info|hello|contact|sales|support|team|office|press|privacy|security)@/.test(normalized)) emailSet.add(normalized);
  }
  const phoneSet = new Set<string>();
  for (const phone of body.match(/(?:\+?[0-9][0-9 ()().-]{7,}[0-9])/g) ?? []) phoneSet.add(phone.replace(/\s+/g, " ").trim().slice(0, 40));
  const robots = meta.get("robots") ?? "";
  const modified = meta.get("article:modified_time") ?? meta.get("last-modified") ?? null;
  const modifiedAt = modified && Number.isFinite(Date.parse(modified)) ? new Date(modified).toISOString() : null;
  const title = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "", 240) || null;
  const metaDescription = meta.get("description") ?? null;
  const canonical = html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/i)?.[0] ? attr(html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*canonical[^"']*["'][^>]*>/i)?.[0] ?? "", "href") : null;
  const language = html.match(/<html\b[^>]*lang\s*=\s*["']([^"']+)["']/i)?.[1]?.slice(0, 20) ?? null;
  const structuredHash = [title, metaDescription, canonical, language, ...headings.map((heading) => `${heading.level}:${heading.text}`), body].filter(Boolean).join("\n");
  return {
    title,
    metaDescription,
    canonical,
    language,
    openGraph: Object.fromEntries(Array.from(meta.entries()).filter(([key]) => key.startsWith("og:") || key.startsWith("article:" )).slice(0, 20)),
    jsonLd: extractJsonLd(html),
    headings: headings.slice(0, 40),
    links: Array.from(new Set(links)).slice(0, 300),
    readableText: body,
    noindex: /(^|[\s,])noindex([\s,]|$)/i.test(robots),
    noarchive: /(^|[\s,])noarchive([\s,]|$)/i.test(robots),
    contactEmails: Array.from(emailSet).slice(0, 10),
    contactPhones: Array.from(phoneSet).slice(0, 5),
    modifiedAt,
    contentHash: contentHash(structuredHash),
  };
}

function excerptFor(text: string, matcher: RegExp): string | null {
  const match = matcher.exec(text);
  if (!match || match.index < 0) return null;
  const start = Math.max(0, match.index - 80);
  return text.slice(start, Math.min(text.length, start + WEBSITE_LIMITS.observationEvidenceChars)).trim();
}

function addObservation(list: WebsiteObservation[], input: Omit<WebsiteObservation, "evidenceExcerpt"> & { evidenceExcerpt: string | null }): void {
  const value = cleanText(input.observationValue, WEBSITE_LIMITS.observationValueChars);
  const evidence = input.evidenceExcerpt ? cleanText(input.evidenceExcerpt, WEBSITE_LIMITS.observationEvidenceChars) : null;
  if (!value || !evidence || !input.observationKey) return;
  list.push({ ...input, observationValue: value, evidenceExcerpt: evidence });
}

/** Deterministic first pass. Website text is treated only as quoted evidence;
 * nothing here can request tools, change policy, or become owner-confirmed. */
export function observationsFromWebsitePage(page: WebsiteExtractedPage): WebsiteObservation[] {
  const observations: WebsiteObservation[] = [];
  const text = page.readableText;
  if (page.title) addObservation(observations, { observationType: "company_identity", observationKey: "website.company.title", observationValue: page.title, evidenceExcerpt: excerptFor(text, new RegExp(page.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) ?? page.title, confidence: "medium" });
  if (page.metaDescription) addObservation(observations, { observationType: "positioning", observationKey: "website.positioning.description", observationValue: page.metaDescription, evidenceExcerpt: page.metaDescription, confidence: "medium" });
  const headingText = page.headings.slice(0, 8).map((heading) => heading.text).join(" · ");
  if (headingText) addObservation(observations, { observationType: "product_service", observationKey: "website.content.headings", observationValue: headingText, evidenceExcerpt: excerptFor(text, /\b(?:product|service|platform|solution|features?)\b/i) ?? text.slice(0, 500), confidence: "low" });
  for (const email of page.contactEmails.slice(0, 3)) addObservation(observations, { observationType: "contact_channel", observationKey: `website.contact.email.${email}`, observationValue: email, evidenceExcerpt: email, confidence: "high" });
  const priceEvidence = excerptFor(text, /(?:€|\$|£)\s?\d|\b(?:pricing|plans?|per month|monthly)\b/i);
  if (priceEvidence) addObservation(observations, { observationType: "public_pricing", observationKey: "website.pricing.statement", observationValue: priceEvidence, evidenceExcerpt: priceEvidence, confidence: "low" });
  const securityEvidence = excerptFor(text, /\b(?:security|privacy|gdpr|soc\s?2|iso\s?27001|compliance)\b/i);
  if (securityEvidence) addObservation(observations, { observationType: "security_claim", observationKey: "website.security.public_claim", observationValue: securityEvidence, evidenceExcerpt: securityEvidence, confidence: "low" });
  const regionsEvidence = excerptFor(text, /\b(?:worldwide|global|europe|european|netherlands|united states|languages?|regions?)\b/i);
  if (regionsEvidence) addObservation(observations, { observationType: "regions_languages", observationKey: "website.regions.public_statement", observationValue: regionsEvidence, evidenceExcerpt: regionsEvidence, confidence: "low" });
  return observations.slice(0, 12);
}
