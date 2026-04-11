export type CurrencySource = "manual" | "inferred" | "legacy_default";

export const DEFAULT_LOCAL_CURRENCY_CODE = "EUR";
export const USD_CURRENCY_CODE = "USD";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundFx(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function parseCurrencyCodeInput(
  value: string | null | undefined
): string | null {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (!/^[A-Z]{3}$/.test(normalized)) return null;
  return normalized;
}

export function normalizeCurrencyCode(
  value: string | null | undefined,
  fallback = DEFAULT_LOCAL_CURRENCY_CODE
): string {
  return parseCurrencyCodeInput(value) ?? fallback;
}

export function parseUsdFxRate(
  value: string | number | null | undefined
): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return roundFx(value);
  }

  const trimmed = (value ?? "").toString().trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return roundFx(parsed);
}

export function hasUsdConversion(
  localCurrencyCode: string | null | undefined,
  usdFxRateLocked: number | null | undefined
): boolean {
  const currency = normalizeCurrencyCode(localCurrencyCode);
  if (currency === USD_CURRENCY_CODE) return true;
  return parseUsdFxRate(usdFxRateLocked) != null;
}

export function convertLocalToUsd(
  amountLocal: number | null | undefined,
  localCurrencyCode: string | null | undefined,
  usdFxRateLocked: number | null | undefined
): number | null {
  if (amountLocal == null || !Number.isFinite(Number(amountLocal))) return null;

  const localAmount = Number(amountLocal);
  const currency = normalizeCurrencyCode(localCurrencyCode);
  if (currency === USD_CURRENCY_CODE) {
    return roundMoney(localAmount);
  }

  const fx = parseUsdFxRate(usdFxRateLocked);
  if (fx == null) return null;

  return roundMoney(localAmount * fx);
}

export function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
  locale = "en-US"
): string {
  const hasDecimals = Math.round(amount * 100) % 100 !== 0;
  const normalized = normalizeCurrencyCode(currencyCode);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalized,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${normalized} ${amount.toFixed(hasDecimals ? 2 : 0)}`;
  }
}

export function formatUsdAmount(amount: number, locale = "en-US"): string {
  return formatCurrencyAmount(amount, USD_CURRENCY_CODE, locale);
}

export function formatUsdPrimaryWithLocalSecondary(input: {
  amountLocal: number | null | undefined;
  localCurrencyCode: string | null | undefined;
  usdFxRateLocked: number | null | undefined;
  locale?: string;
  unavailableLabel?: string;
  emptyLabel?: string;
}): {
  primary: string;
  secondary: string;
  usdAmount: number | null;
  localAmount: number | null;
  localCurrencyCode: string;
  conversionUnavailable: boolean;
} {
  const {
    amountLocal,
    localCurrencyCode,
    usdFxRateLocked,
    locale = "en-US",
    unavailableLabel = "Conversion unavailable",
    emptyLabel = "Not set",
  } = input;

  const normalizedLocalCurrency = normalizeCurrencyCode(localCurrencyCode);
  if (amountLocal == null || !Number.isFinite(Number(amountLocal))) {
    return {
      primary: emptyLabel,
      secondary: emptyLabel,
      usdAmount: null,
      localAmount: null,
      localCurrencyCode: normalizedLocalCurrency,
      conversionUnavailable: false,
    };
  }

  const normalizedLocalAmount = roundMoney(Number(amountLocal));
  const secondary = `${formatCurrencyAmount(
    normalizedLocalAmount,
    normalizedLocalCurrency,
    locale
  )} (${normalizedLocalCurrency})`;

  const usdAmount = convertLocalToUsd(
    normalizedLocalAmount,
    normalizedLocalCurrency,
    usdFxRateLocked
  );

  if (usdAmount == null) {
    // Show the local amount as the primary value; secondary notes that USD is not locked.
    // This avoids a broken-state feel when FX is simply not configured yet.
    void unavailableLabel; // kept in signature for callers that pass it; no longer used as primary
    return {
      primary: formatCurrencyAmount(normalizedLocalAmount, normalizedLocalCurrency, locale),
      secondary: "USD not locked",
      usdAmount: null,
      localAmount: normalizedLocalAmount,
      localCurrencyCode: normalizedLocalCurrency,
      conversionUnavailable: true,
    };
  }

  return {
    primary: formatUsdAmount(usdAmount, locale),
    secondary,
    usdAmount,
    localAmount: normalizedLocalAmount,
    localCurrencyCode: normalizedLocalCurrency,
    conversionUnavailable: false,
  };
}
