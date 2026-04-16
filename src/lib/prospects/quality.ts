import type { Prospect } from "@/lib/supabase-server";

export type FitSignalTone = "good" | "warn" | "muted";

export type ProspectFitSignal = {
  label: string;
  tone: FitSignalTone;
};

export type CandidateQualityAssessment = {
  accepted: boolean;
  reasons: string[];
  fitSignals: ProspectFitSignal[];
};

const BLOCKED_PRIMARY_HOSTS = new Set<string>([
  "google.com",
  "maps.google.com",
  "shopify.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "yelp.com",
  "clutch.co",
  "upcity.com",
  "sortlist.com",
  "bark.com",
  "trustpilot.com",
  "pinterest.com",
  "youtube.com",
  "x.com",
  "twitter.com",
]);

const BLOCKED_PRIMARY_HOST_SUFFIXES = [
  ".google.com",
  ".facebook.com",
  ".instagram.com",
  ".linkedin.com",
  ".yelp.com",
  ".clutch.co",
  ".upcity.com",
  ".sortlist.com",
  ".bark.com",
  ".trustpilot.com",
  ".pinterest.com",
  ".youtube.com",
  ".x.com",
  ".twitter.com",
];

const AGENCY_KEYWORDS = [
  "agency",
  "marketing",
  "studio",
  "creative",
  "design",
  "seo",
  "branding",
];

const ECOMMERCE_KEYWORDS = [
  "shopify",
  "ecommerce",
  "e-commerce",
  "store",
  "d2c",
  "retail",
];

const LOCAL_SERVICE_KEYWORDS = [
  "salon",
  "clinic",
  "interior",
  "renovation",
  "contractor",
  "builder",
  "plumber",
  "dental",
  "beauty",
];

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"].forEach(
      (param) => {
        url.searchParams.delete(param);
      }
    );
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    url.pathname = normalizedPath || "/";
    const serialized = url.toString();
    return serialized.endsWith("/") ? serialized.slice(0, -1) : serialized;
  } catch {
    return null;
  }
}

export function websiteHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isBlockedPrimaryHost(host: string | null | undefined): boolean {
  if (!host) return true;
  if (BLOCKED_PRIMARY_HOSTS.has(host)) return true;
  return BLOCKED_PRIMARY_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export function isGoogleMapsUrl(value: string | null | undefined): boolean {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return (
    normalized.includes("maps.google.") ||
    normalized.includes("google.com/maps") ||
    normalized.includes("/place/")
  );
}

export function buildProspectFitSignals(input: {
  companyName: string;
  websiteUrl: string | null;
  contactValue: string | null;
  notes: string | null;
}): ProspectFitSignal[] {
  const signals: ProspectFitSignal[] = [];
  const host = websiteHost(input.websiteUrl);
  const textBlob = [
    normalizeText(input.companyName),
    normalizeText(input.notes),
    host ?? "",
  ]
    .join(" ")
    .trim();

  if (host && !isBlockedPrimaryHost(host)) {
    signals.push({ label: "Website", tone: "good" });
  } else {
    signals.push({ label: "Weak site identity", tone: "warn" });
  }

  if (normalizeText(input.contactValue)) {
    signals.push({ label: "Contact route", tone: "good" });
  } else {
    signals.push({ label: "Needs manual review", tone: "warn" });
  }

  if (hasKeyword(textBlob, AGENCY_KEYWORDS)) {
    signals.push({ label: "Likely agency", tone: "good" });
  } else if (hasKeyword(textBlob, ECOMMERCE_KEYWORDS)) {
    signals.push({ label: "Likely ecommerce", tone: "good" });
  } else if (hasKeyword(textBlob, LOCAL_SERVICE_KEYWORDS)) {
    signals.push({ label: "Likely local service", tone: "muted" });
  }

  return signals.slice(0, 4);
}

export function assessCandidateQuality(input: {
  companyName: string | null;
  websiteUrl: string | null;
  mapsUrl: string | null;
  contactValue: string | null;
  notes: string | null;
}): CandidateQualityAssessment {
  const reasons: string[] = [];
  const normalizedCompany = normalizeText(input.companyName);
  const normalizedWebsite = normalizeWebsiteUrl(input.websiteUrl);
  const host = websiteHost(normalizedWebsite);
  const mapsOnly = !normalizedWebsite && isGoogleMapsUrl(input.mapsUrl);

  if (!normalizedCompany) {
    reasons.push("missing_company_identity");
  }

  if (!normalizedWebsite) {
    reasons.push("missing_website");
  }

  if (mapsOnly) {
    reasons.push("maps_only");
  }

  if (isBlockedPrimaryHost(host)) {
    reasons.push("blocked_primary_domain");
  }

  const fitSignals = buildProspectFitSignals({
    companyName: input.companyName ?? "",
    websiteUrl: normalizedWebsite,
    contactValue: input.contactValue,
    notes: input.notes,
  });

  return {
    accepted: reasons.length === 0,
    reasons,
    fitSignals,
  };
}

export function fitSignalsFromProspect(prospect: Prospect): ProspectFitSignal[] {
  return buildProspectFitSignals({
    companyName: prospect.company_name,
    websiteUrl: prospect.website_url,
    contactValue: prospect.contact_value,
    notes: prospect.notes,
  });
}
