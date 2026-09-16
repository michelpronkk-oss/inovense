/** Workspace-aware display time helpers. Persisted timestamps stay ISO/UTC;
 * only this presentation boundary applies the user's/browser locale. */
export function preferredLocale(locale?: string | null): string {
  if (locale?.trim()) return locale;
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en-US";
}

export function formatWorkspaceDateTime(value: string | null | undefined, locale?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Unknown time";
  return new Intl.DateTimeFormat(preferredLocale(locale), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatRelativeWorkspaceTime(value: string | null | undefined, now = Date.now(), locale?: string | null): string {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(timestamp)) return "Unknown time";
  const seconds = Math.round((timestamp - now) / 1000);
  const absolute = Math.abs(seconds);
  const unit = absolute < 60 ? "second" : absolute < 3600 ? "minute" : absolute < 86400 ? "hour" : "day";
  const divisor = unit === "second" ? 1 : unit === "minute" ? 60 : unit === "hour" ? 3600 : 86400;
  return new Intl.RelativeTimeFormat(preferredLocale(locale), { numeric: "auto" }).format(Math.round(seconds / divisor), unit);
}
