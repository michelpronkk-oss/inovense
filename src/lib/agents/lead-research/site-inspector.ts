const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_LENGTH = 6_000;

// High-confidence Dutch indicator words that rarely appear in English text
const DUTCH_INDICATORS = new Set([
  "van", "het", "voor", "niet", "zijn", "heeft", "worden", "wij", "ons",
  "uw", "onze", "meer", "welkom", "diensten", "bedrijf", "contact", "over",
  "privacybeleid", "oplossingen", "klanten", "werken", "kunnen", "bieden",
  "maken", "staan", "waarom", "hoe", "wat", "wie", "waar", "wanneer",
  "gebruik", "cookies", "gratis", "prijs", "pakket", "aanmelden",
]);

const SOCIAL_HOSTS = [
  "instagram.com", "linkedin.com", "facebook.com", "twitter.com",
  "x.com", "tiktok.com", "youtube.com",
];

export type SiteInspectionResult = {
  url: string;
  title: string | null;
  excerpt: string;
  detected_language: "en" | "nl" | "mixed" | "unknown";
  evidence: string[];
  accessed_at: string;
  error: string | null;
};

function isSocialUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    return SOCIAL_HOSTS.some((s) => host === s || host.endsWith("." + s));
  } catch {
    return false;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractHtmlLang(html: string): string | null {
  const match = html.match(/<html[^>]+lang=["']?([a-zA-Z-]+)["']?/i);
  return match ? match[1].toLowerCase() : null;
}

function detectLanguageFromContent(text: string): {
  language: "en" | "nl" | "mixed" | "unknown";
  confidence: "high" | "low";
} {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length < 20) return { language: "unknown", confidence: "low" };

  const dutchCount = words.filter((w) => DUTCH_INDICATORS.has(w)).length;
  const ratio = dutchCount / words.length;

  if (ratio > 0.04) return { language: "nl", confidence: "high" };
  if (ratio > 0.015) return { language: "nl", confidence: "low" };
  if (words.length > 50) return { language: "en", confidence: "low" };
  return { language: "unknown", confidence: "low" };
}

function resolveLanguageFromHtmlLang(
  htmlLang: string | null
): "en" | "nl" | null {
  if (!htmlLang) return null;
  const base = htmlLang.split("-")[0];
  if (base === "nl") return "nl";
  if (base === "en") return "en";
  return null;
}

function extractEvidence(text: string, url: string): string[] {
  const sentences = text
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 300);
  return sentences.slice(0, 8);
}

export async function inspectSite(
  rawUrl: string | null
): Promise<SiteInspectionResult> {
  const accessed_at = new Date().toISOString();

  if (!rawUrl) {
    return {
      url: "",
      title: null,
      excerpt: "",
      detected_language: "unknown",
      evidence: [],
      accessed_at,
      error: "No website URL provided.",
    };
  }

  // Normalize URL
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  if (isSocialUrl(url)) {
    return {
      url,
      title: null,
      excerpt: "",
      detected_language: "unknown",
      evidence: [],
      accessed_at,
      error: `Social media URL (${new URL(url).hostname}) — cannot scrape for content.`,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html: string;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Inovense-Research/1.0; +https://inovense.com)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en,nl;q=0.9",
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        return {
          url,
          title: null,
          excerpt: "",
          detected_language: "unknown",
          evidence: [],
          accessed_at,
          error: `HTTP ${res.status} from ${url}`,
        };
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return {
          url,
          title: null,
          excerpt: "",
          detected_language: "unknown",
          evidence: [],
          accessed_at,
          error: `Non-HTML response (${contentType}) from ${url}`,
        };
      }

      html = await res.text();
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort =
        err instanceof Error && err.name === "AbortError";
      return {
        url,
        title: null,
        excerpt: "",
        detected_language: "unknown",
        evidence: [],
        accessed_at,
        error: isAbort
          ? `Fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`
          : `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const title = extractTitle(html);
    const htmlLang = extractHtmlLang(html);
    const rawText = stripHtml(html);
    const excerpt = rawText.slice(0, MAX_TEXT_LENGTH);

    // Language resolution: html lang attribute takes priority
    const htmlLangResolved = resolveLanguageFromHtmlLang(htmlLang);
    let detected_language: "en" | "nl" | "mixed" | "unknown";

    if (htmlLangResolved) {
      detected_language = htmlLangResolved;
    } else {
      const contentDetection = detectLanguageFromContent(excerpt);
      detected_language = contentDetection.language;
    }

    const evidence = extractEvidence(excerpt, url);

    return {
      url,
      title,
      excerpt,
      detected_language,
      evidence,
      accessed_at,
      error: null,
    };
  } catch (err) {
    return {
      url,
      title: null,
      excerpt: "",
      detected_language: "unknown",
      evidence: [],
      accessed_at,
      error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
