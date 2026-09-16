export type WorkforceActivityRange = "24h" | "7d" | "30d";
export type WorkforceActivityGranularity = "hour" | "day";

export type WorkforceActivityRangeDefinition = {
  range: WorkforceActivityRange;
  start: string;
  end: string;
  bucketStart: string;
  bucketCount: number;
  granularity: WorkforceActivityGranularity;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function asValidDate(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("A valid range end is required.");
  return date;
}

function utcDayStart(date: Date): Date {
  const start = new Date(date.getTime());
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function utcHourStart(date: Date): Date {
  const start = new Date(date.getTime());
  start.setUTCMinutes(0, 0, 0);
  return start;
}

/**
 * One authoritative definition shared by the server query, aggregation, and
 * chart labels. Calendar ranges are UTC because the workspace has no reliable
 * timezone contract yet; 24H is a rolling window with 24 UTC-hour buckets.
 */
export function getWorkforceActivityRangeDefinition(
  range: WorkforceActivityRange,
  now: Date | string | number = new Date(),
): WorkforceActivityRangeDefinition {
  const end = asValidDate(now);
  if (range === "24h") {
    const start = new Date(end.getTime() - 24 * HOUR_MS);
    const bucketStart = utcHourStart(end);
    bucketStart.setUTCHours(bucketStart.getUTCHours() - 23);
    return {
      range,
      start: start.toISOString(),
      end: end.toISOString(),
      bucketStart: bucketStart.toISOString(),
      bucketCount: 24,
      granularity: "hour",
    };
  }

  const bucketStart = utcDayStart(end);
  bucketStart.setUTCDate(bucketStart.getUTCDate() - (range === "7d" ? 6 : 29));
  return {
    range,
    start: bucketStart.toISOString(),
    end: end.toISOString(),
    bucketStart: bucketStart.toISOString(),
    bucketCount: range === "7d" ? 7 : 30,
    granularity: "day",
  };
}

export function isWorkforceActivityRange(value: string | null | undefined): value is WorkforceActivityRange {
  return value === "24h" || value === "7d" || value === "30d";
}

export const workforceActivityBucketSizeMs: Record<WorkforceActivityGranularity, number> = {
  hour: HOUR_MS,
  day: DAY_MS,
};
