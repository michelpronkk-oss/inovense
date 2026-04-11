import { inferLeadMarketFromLeadSource } from "@/lib/market";
import type { CountrySource } from "@/lib/supabase-server";

function resolveMarket(
  countryCode: string | null,
  countrySource: CountrySource | null,
  leadSource: string | null
): { code: string | null; confident: boolean } {
  if (countryCode) {
    return {
      code: countryCode.toUpperCase(),
      confident: countrySource === "manual",
    };
  }
  if (leadSource) {
    const inferred = inferLeadMarketFromLeadSource(leadSource);
    if (inferred.country_code) {
      return { code: inferred.country_code, confident: false };
    }
  }
  return { code: null, confident: false };
}

/**
 * Compact market/country marker.
 *
 * Tier 1 – explicit country_code (manual)  → "NL"  zinc-400
 * Tier 2 – inferred from lead_source       → "~NL" zinc-600
 * Tier 3 – no confident signal             → "Intl" zinc-700
 *
 * Never implies false certainty.
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
  const { code, confident } = resolveMarket(
    countryCode ?? null,
    countrySource ?? null,
    leadSource ?? null
  );

  if (!code) {
    return (
      <span className="font-mono text-[10px] text-zinc-700" title="Market unknown">
        Intl
      </span>
    );
  }

  return (
    <span
      className={`font-mono text-[10px] tabular-nums ${
        confident ? "text-zinc-400" : "text-zinc-600"
      }`}
      title={confident ? `Country: ${code}` : `Market inferred: ${code}`}
    >
      {confident ? code : `~${code}`}
    </span>
  );
}
