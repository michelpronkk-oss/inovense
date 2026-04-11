import type { CSSProperties } from "react";
import { inferLeadMarketFromLeadSource } from "@/lib/market";
import type { CountrySource } from "@/lib/supabase-server";

type MarketConfidence = "confident" | "inferred" | "unknown";

function resolveMarket(
  countryCode: string | null,
  countrySource: CountrySource | null,
  leadSource: string | null
): { code: string | null; confidence: MarketConfidence } {
  if (countryCode) {
    return {
      code: countryCode.toUpperCase(),
      confidence: countrySource === "manual" ? "confident" : "inferred",
    };
  }

  if (leadSource) {
    const inferred = inferLeadMarketFromLeadSource(leadSource);
    if (inferred.country_code) {
      return { code: inferred.country_code, confidence: "inferred" };
    }
  }

  return { code: null, confidence: "unknown" };
}

function getFlagStyle(code: string): CSSProperties {
  const normalized = code.toUpperCase();

  if (normalized === "NL") {
    return {
      background:
        "linear-gradient(to bottom, #AE1C28 0 33%, #FFFFFF 33% 66%, #21468B 66% 100%)",
    };
  }

  if (normalized === "US") {
    return {
      background:
        "linear-gradient(to bottom, #B22234 0 14.285%, #FFFFFF 14.285% 28.57%, #B22234 28.57% 42.855%, #FFFFFF 42.855% 57.14%, #B22234 57.14% 71.425%, #FFFFFF 71.425% 85.71%, #B22234 85.71% 100%)",
    };
  }

  if (normalized === "GB") {
    return {
      background:
        "linear-gradient(135deg, #012169 0 40%, #FFFFFF 40% 46%, #C8102E 46% 54%, #FFFFFF 54% 60%, #012169 60% 100%)",
    };
  }

  return {
    background:
      "linear-gradient(135deg, rgba(73,160,164,0.78) 0%, rgba(82,82,91,0.9) 100%)",
  };
}

/**
 * Compact market/country marker.
 *
 * Tier 1 - explicit country_code (manual)  -> confident marker
 * Tier 2 - inferred from deterministic map -> subtler inferred marker
 * Tier 3 - no grounded signal              -> neutral global marker
 */
export function MarketMarker({
  countryCode,
  countrySource,
  leadSource,
}: {
  countryCode: string | null | undefined;
  countrySource: CountrySource | null | undefined;
  leadSource: string | null | undefined;
}) {
  const { code, confidence } = resolveMarket(
    countryCode ?? null,
    countrySource ?? null,
    leadSource ?? null
  );

  if (!code) {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-900/60 text-zinc-700"
        title="Global / market unknown"
        aria-label="Market unknown"
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </span>
    );
  }

  const isInferred = confidence === "inferred";
  const title = isInferred
    ? `Market inferred from source (${code})`
    : `Country ${code}`;

  return (
    <span
      className="relative inline-flex items-center"
      title={title}
      aria-label={title}
    >
      <span
        className={`inline-flex h-3.5 w-5 overflow-hidden rounded-[4px] border ${
          isInferred
            ? "border-zinc-700/80 opacity-80"
            : "border-zinc-500/80 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]"
        }`}
      >
        <span className="h-full w-full" style={getFlagStyle(code)} aria-hidden />
      </span>

      {isInferred && (
        <span
          className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-zinc-950 bg-zinc-500"
          aria-hidden
        />
      )}

      <span className="sr-only">
        {isInferred ? `Inferred market ${code}` : `Country ${code}`}
      </span>
    </span>
  );
}
