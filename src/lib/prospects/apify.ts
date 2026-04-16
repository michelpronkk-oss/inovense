import { parseCountryCodeInput } from "@/lib/market";
import type {
  ProspectContactChannel,
  ProspectLaneFit,
  ProspectOutreachLanguage,
} from "@/lib/supabase-server";

const APIFY_BASE_URL = "https://api.apify.com/v2";
const DEFAULT_MAPS_ACTOR_ID = "compass/crawler-google-places";
const DEFAULT_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 35;

type RunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED-OUT"
  | "ABORTED";

type ApifyRunData = {
  id: string;
  status: RunStatus;
  defaultDatasetId: string | null;
};

type ApifyEnvelope<T> = { data: T };

export type GenerateProspectsBrief = {
  market: string;
  niche: string;
  location: string;
  volume: number;
  source: string;
};

export type ProspectCandidate = {
  company_name: string;
  website_url: string | null;
  contact_name: string | null;
  contact_channel: ProspectContactChannel;
  contact_value: string | null;
  country_code: string | null;
  outreach_language: ProspectOutreachLanguage;
  lane_fit: ProspectLaneFit;
  source: string;
  notes: string | null;
  opening_angle: string | null;
  dedupe: {
    websiteHost: string | null;
    nameContactKey: string;
    nameOnlyKey: string;
  };
};

function getApifyToken(): string {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    throw new Error("APIFY_TOKEN is missing.");
  }
  return token;
}

function normalizeApifyResourceId(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.includes("~")) return normalized;
  if (normalized.includes("/")) {
    const [owner, name] = normalized.split("/");
    if (owner && name) {
      return `${owner.trim()}~${name.trim()}`;
    }
  }
  return normalized;
}

function normalizeSource(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return normalized || "outbound";
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 10;
  const rounded = Math.floor(value);
  if (rounded < 1) return 1;
  if (rounded > 50) return 50;
  return rounded;
}

function inferLaneFromNiche(niche: string): ProspectLaneFit {
  const text = niche.trim().toLowerCase();
  if (!text) return "uncertain";

  if (
    text.includes("automation") ||
    text.includes("system") ||
    text.includes("ops") ||
    text.includes("workflow") ||
    text.includes("crm")
  ) {
    return "systems";
  }

  if (
    text.includes("growth") ||
    text.includes("seo") ||
    text.includes("ads") ||
    text.includes("funnel") ||
    text.includes("lead")
  ) {
    return "growth";
  }

  if (
    text.includes("web") ||
    text.includes("site") ||
    text.includes("landing") ||
    text.includes("shopify") ||
    text.includes("saas") ||
    text.includes("design")
  ) {
    return "build";
  }

  return "uncertain";
}

function inferLanguage(input: { market: string; location: string }): ProspectOutreachLanguage {
  const text = `${input.market} ${input.location}`.toLowerCase();
  if (
    text.includes("netherlands") ||
    text.includes("dutch") ||
    text.includes("nederland") ||
    text.includes("amsterdam") ||
    text.includes("rotterdam") ||
    text.includes("utrecht") ||
    text.includes("eindhoven")
  ) {
    return "nl";
  }
  return "en";
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeWebsite(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

function websiteHost(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeKey(value: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? cleaned : null;
}

function parseCountryCode(record: Record<string, unknown>, market: string): string | null {
  const direct = parseCountryCodeInput(asString(record.countryCode));
  if (direct) return direct;

  const country = asString(record.country)?.toLowerCase() ?? "";
  if (country === "netherlands" || country === "nederland") return "NL";
  if (country === "united states" || country === "usa") return "US";
  if (country === "united kingdom" || country === "uk") return "GB";

  const marketCode = parseCountryCodeInput(market);
  if (marketCode) return marketCode;

  return null;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Apify request failed (${response.status}). ${body.slice(0, 160)}`
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function startRun(input: Record<string, unknown>): Promise<ApifyRunData> {
  const token = getApifyToken();
  const taskIdRaw = process.env.APIFY_TASK_ID_DEFAULT_PROSPECTS?.trim();
  const taskId = taskIdRaw ? normalizeApifyResourceId(taskIdRaw) : "";

  if (taskId) {
    const url = `${APIFY_BASE_URL}/actor-tasks/${encodeURIComponent(
      taskId
    )}/runs?token=${encodeURIComponent(token)}`;
    try {
      const payload = await fetchJson<ApifyEnvelope<ApifyRunData>>(url, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return payload.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Apify task error.";
      throw new Error(`Prospect generation task failed. ${message}`);
    }
  }

  const actorId = normalizeApifyResourceId(
    process.env.APIFY_ACTOR_ID_MAPS?.trim() || DEFAULT_MAPS_ACTOR_ID
  );
  if (!actorId) {
    throw new Error("APIFY_ACTOR_ID_MAPS is missing.");
  }
  const url = `${APIFY_BASE_URL}/acts/${encodeURIComponent(
    actorId
  )}/runs?token=${encodeURIComponent(token)}`;
  try {
    const payload = await fetchJson<ApifyEnvelope<ApifyRunData>>(url, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return payload.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Apify actor error.";
    throw new Error(`Prospect generation actor failed. ${message}`);
  }
}

async function waitForRunCompletion(runId: string): Promise<ApifyRunData> {
  const token = getApifyToken();
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const url = `${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(
      runId
    )}?token=${encodeURIComponent(token)}`;
    const payload = await fetchJson<ApifyEnvelope<ApifyRunData>>(url, {
      method: "GET",
    });
    const run = payload.data;

    if (run.status === "SUCCEEDED") return run;
    if (run.status === "FAILED" || run.status === "ABORTED" || run.status === "TIMED-OUT") {
      throw new Error(`Apify run ${run.status.toLowerCase()}.`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Apify run timed out.");
}

async function getDatasetItems(datasetId: string, limit: number): Promise<Record<string, unknown>[]> {
  const token = getApifyToken();
  const url = `${APIFY_BASE_URL}/datasets/${encodeURIComponent(
    datasetId
  )}/items?token=${encodeURIComponent(token)}&clean=true&format=json&limit=${limit}`;
  return fetchJson<Record<string, unknown>[]>(url, { method: "GET" });
}

function extractCompanyName(record: Record<string, unknown>): string | null {
  return (
    asString(record.title) ??
    asString(record.name) ??
    asString(record.companyName) ??
    asString(record.placeName)
  );
}

function extractWebsite(record: Record<string, unknown>): string | null {
  const raw =
    asString(record.website) ??
    asString(record.websiteUrl) ??
    asString(record.domain) ??
    asString(record.url);
  return normalizeWebsite(raw);
}

function extractLocationLabel(record: Record<string, unknown>): string | null {
  return (
    asString(record.address) ??
    asString(record.fullAddress) ??
    asString(record.formattedAddress) ??
    asString(record.street) ??
    asString(record.city)
  );
}

function extractEmail(record: Record<string, unknown>): string | null {
  const direct = asString(record.email);
  if (direct) return direct;
  return asStringArray(record.emails)[0] ?? null;
}

function extractPhone(record: Record<string, unknown>): string | null {
  const direct =
    asString(record.phone) ??
    asString(record.phoneNumber) ??
    asString(record.phoneUnformatted);
  if (direct) return normalizePhone(direct);
  return normalizePhone(asStringArray(record.phones)[0] ?? null);
}

function buildNotes(input: {
  brief: GenerateProspectsBrief;
  locationLabel: string | null;
  category: string | null;
  mapsUrl: string | null;
  rating: string | null;
  reviewsCount: string | null;
}): string {
  const lines: string[] = [
    "Generated via Apify (Google Maps scraper).",
    `Brief: ${input.brief.niche} in ${input.brief.location || input.brief.market}.`,
  ];

  if (input.locationLabel) lines.push(`Location: ${input.locationLabel}`);
  if (input.category) lines.push(`Category: ${input.category}`);
  if (input.rating) lines.push(`Rating: ${input.rating}`);
  if (input.reviewsCount) lines.push(`Reviews: ${input.reviewsCount}`);
  if (input.mapsUrl) lines.push(`Maps URL: ${input.mapsUrl}`);

  return lines.join("\n");
}

export async function generateProspectCandidatesFromApify(
  briefInput: GenerateProspectsBrief
): Promise<ProspectCandidate[]> {
  const brief = {
    ...briefInput,
    volume: clampVolume(briefInput.volume),
    source: normalizeSource(briefInput.source),
  };

  const query = `${brief.niche} ${brief.location || brief.market}`.trim();
  if (!query) {
    throw new Error("Generation brief is missing search term and location.");
  }

  const runInput: Record<string, unknown> = {
    searchStringsArray: [query],
    maxCrawledPlacesPerSearch: brief.volume,
    maxCrawledPlaces: brief.volume,
    language: "en",
  };

  const startedRun = await startRun(runInput);
  const completedRun =
    startedRun.status === "SUCCEEDED"
      ? startedRun
      : await waitForRunCompletion(startedRun.id);

  if (!completedRun.defaultDatasetId) {
    throw new Error("Apify run completed without dataset output.");
  }

  const items = await getDatasetItems(completedRun.defaultDatasetId, brief.volume);
  const laneFit = inferLaneFromNiche(brief.niche);
  const outreachLanguage = inferLanguage({
    market: brief.market,
    location: brief.location,
  });

  const candidates: ProspectCandidate[] = [];
  for (const raw of items) {
    const record = raw as Record<string, unknown>;
    const companyName = extractCompanyName(record);
    if (!companyName) continue;

    const website = extractWebsite(record);
    const email = extractEmail(record);
    const phone = extractPhone(record);
    const contactValue = email ?? phone;
    const locationLabel = extractLocationLabel(record);
    const countryCode = parseCountryCode(record, brief.market);
    const category = asString(record.categoryName) ?? asString(record.category);
    const mapsUrl = asString(record.url) ?? asString(record.placeUrl);
    const rating = asString(record.totalScore) ?? asString(record.rating);
    const reviewsCount = asString(record.reviewsCount);

    const notes = buildNotes({
      brief,
      locationLabel,
      category,
      mapsUrl,
      rating,
      reviewsCount,
    });

    const cleanName = normalizeKey(companyName);
    if (!cleanName) continue;

    const websiteHostKey = websiteHost(website);
    const contactKey = normalizeKey(contactValue);

    candidates.push({
      company_name: companyName.trim(),
      website_url: website,
      contact_name: null,
      contact_channel: email ? "email" : "other",
      contact_value: contactValue,
      country_code: countryCode,
      outreach_language: outreachLanguage,
      lane_fit: laneFit,
      source: brief.source,
      notes,
      opening_angle: brief.niche
        ? `Potential ${brief.niche} fit based on local business profile.`
        : null,
      dedupe: {
        websiteHost: websiteHostKey,
        nameContactKey: `${cleanName}|${contactKey}`,
        nameOnlyKey: cleanName,
      },
    });
  }

  return candidates;
}
