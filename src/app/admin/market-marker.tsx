import { inferLeadMarketFromLeadSource } from "@/lib/market";
import type { CountrySource } from "@/lib/supabase-server";

function countryCodeToFlag(code: string): string {
  const offset = 0x1f1e6 - 65;
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join("");
}

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
 * Compact market/country marker with flag emoji.
 *
 * Tier 1 – explicit country_code (manual)  → 🇳🇱 NL   zinc-300
 * Tier 2 – inferred from lead_source       → 🇳🇱 NL   zinc-500 (muted)
 * Tier 3 – no confident signal             → globe    zinc-700
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
      <span
        className="inline-flex items-center gap-0.5 text-[10px] text-zinc-700"
        title="Market unknown"
        aria-label="Market unknown"
      >
        <svg
          width="11"
          height="11"
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

  const flag = countryCodeToFlag(code);

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums ${
        confident ? "text-zinc-300" : "text-zinc-500"
      }`}
      title={confident ? `Country: ${code}` : `Market inferred: ${code}`}
      aria-label={`${confident ? "Country" : "Inferred market"}: ${code}`}
    >
      <span className="text-[12px] leading-none" aria-hidden>
        {flag}
      </span>
      {code}
    </span>
  );
}
