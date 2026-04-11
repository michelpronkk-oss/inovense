import {
  DEFAULT_LOCAL_CURRENCY_CODE,
  parseCurrencyCodeInput,
  type CurrencySource,
} from "@/lib/currency";
import {
  getClientLocaleForLeadSource,
  isDutchClientLeadSource,
} from "@/lib/client-locale";

export type CountrySource =
  | "manual"
  | "lead_source_inferred"
  | "unknown"
  | "legacy_default";

export type LeadMarketSeed = {
  local_currency_code: string;
  currency_source: CurrencySource;
  country_code: string | null;
  country_source: CountrySource;
};

function normalizeLeadSource(leadSource: string | null | undefined): string {
  return (leadSource ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function hasToken(normalizedLeadSource: string, token: string): boolean {
  return (
    normalizedLeadSource === token ||
    normalizedLeadSource.startsWith(`${token}_`) ||
    normalizedLeadSource.includes(`_${token}_`) ||
    normalizedLeadSource.endsWith(`_${token}`)
  );
}

export function parseCountryCodeInput(
  value: string | null | undefined
): string | null {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return normalized;
}

export function inferLeadMarketFromLeadSource(
  leadSource: string | null | undefined
): { country_code: string | null; local_currency_code: string | null } {
  const normalized = normalizeLeadSource(leadSource);

  if (!normalized) {
    return { country_code: null, local_currency_code: null };
  }

  if (isDutchClientLeadSource(normalized)) {
    return { country_code: "NL", local_currency_code: "EUR" };
  }

  if (
    hasToken(normalized, "uk") ||
    hasToken(normalized, "gb") ||
    normalized.includes("united_kingdom") ||
    normalized.includes("britain") ||
    normalized.includes("england")
  ) {
    return { country_code: "GB", local_currency_code: "GBP" };
  }

  if (
    hasToken(normalized, "us") ||
    hasToken(normalized, "usa") ||
    normalized.includes("united_states") ||
    normalized.includes("america")
  ) {
    return { country_code: "US", local_currency_code: "USD" };
  }

  return { country_code: null, local_currency_code: null };
}

export function getLeadMarketSeedFromLeadSource(
  leadSource: string | null | undefined
): LeadMarketSeed {
  const inferred = inferLeadMarketFromLeadSource(leadSource);

  if (inferred.local_currency_code) {
    return {
      local_currency_code: inferred.local_currency_code,
      currency_source: "inferred",
      country_code: inferred.country_code,
      country_source: inferred.country_code
        ? "lead_source_inferred"
        : "unknown",
    };
  }

  return {
    local_currency_code: DEFAULT_LOCAL_CURRENCY_CODE,
    currency_source: "legacy_default",
    country_code: null,
    country_source: "unknown",
  };
}

export function resolveClientFacingCurrencyCode(input: {
  localCurrencyCode: string | null | undefined;
  leadSource: string | null | undefined;
}): string {
  const explicit = parseCurrencyCodeInput(input.localCurrencyCode);
  if (explicit) return explicit;

  const inferred = inferLeadMarketFromLeadSource(input.leadSource)
    .local_currency_code;
  if (inferred) return inferred;

  const locale = getClientLocaleForLeadSource(input.leadSource);
  return locale === "nl" ? "EUR" : "USD";
}
