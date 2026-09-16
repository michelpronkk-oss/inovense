/**
 * Pure presentation math for the Workforce activity chart - no React, no
 * Recharts, no path aliases, so this stays trivially unit-testable and
 * reusable if another dashboard chart needs the same scale/format rules.
 */

/**
 * Picks a Y-axis ceiling that never leaves a huge empty range above small,
 * real counts (values of 0-2 get a ceiling of 2, not an arbitrary round
 * number like 10), while still rounding up sensibly once counts grow.
 */
export function niceMax(rawMax: number): number {
  const safe = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 1;
  if (safe <= 4) return Math.max(2, Math.ceil(safe));
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const normalized = safe / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

/** Whole-number Y ticks only - never a fabricated scale independent of the actual data. */
export function integerTicks(max: number): number[] {
  const safeMax = Number.isFinite(max) && max > 0 ? Math.floor(max) : 1;
  if (safeMax <= 4) return Array.from({ length: safeMax + 1 }, (_, index) => index);
  const step = Math.ceil(safeMax / 4);
  const ticks: number[] = [];
  for (let value = 0; value <= safeMax; value += step) ticks.push(value);
  if (ticks[ticks.length - 1] !== safeMax) ticks.push(safeMax);
  return ticks;
}

/** Short UTC weekday tick, e.g. "MON" or (narrow) "M" - bucket days are UTC-dated strings, so formatting stays UTC too. */
export function formatDayTick(day: string, narrow: boolean): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: narrow ? "narrow" : "short", timeZone: "UTC" }).toUpperCase();
}

/** Full tooltip date, e.g. "Tue, Sep 1" - same UTC bucket day, human-readable. */
export function formatTooltipDate(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return day;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
