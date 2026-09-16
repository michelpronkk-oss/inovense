import type { WorkforceActivityItem, WorkforceActivitySummary } from "@/lib/activity/types";
import {
  getWorkforceActivityRangeDefinition,
  workforceActivityBucketSizeMs,
  type WorkforceActivityRange,
  type WorkforceActivityRangeDefinition,
} from "@/lib/dashboard/workforce-activity-range";

export type WorkforceActivityBucket = {
  start: string;
  end: string;
  count: number;
  prepared: number;
  executed: number;
  held: number;
};

export type WorkforceActivityChartSummary = WorkforceActivitySummary & {
  range: WorkforceActivityRange;
  windowStart: string;
  windowEnd: string;
  granularity: WorkforceActivityRangeDefinition["granularity"];
  buckets: WorkforceActivityBucket[];
  partialHistory: boolean;
};

function uniqueItems(items: WorkforceActivityItem[]): WorkforceActivityItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function baseSummary(items: WorkforceActivityItem[], daily: WorkforceActivitySummary["daily"]): WorkforceActivitySummary {
  return {
    runs: items.filter((item) => item.category === "operator_run").length,
    approvals: items.filter((item) => item.category === "approval").length,
    actions: items.filter((item) => item.category === "execution").length,
    issues: items.filter((item) => item.severity === "failure" || item.severity === "attention").length,
    total: items.length,
    prepared: items.filter((item) => item.category === "approval").length,
    executed: items.filter((item) => item.category === "execution").length,
    held: items.filter((item) => item.category === "approval" && item.status === "pending").length,
    daily,
  };
}

/** Pure, deterministic projection for the dashboard chart. */
export function aggregateWorkforceActivity(
  items: WorkforceActivityItem[],
  definition: WorkforceActivityRangeDefinition,
  partialHistory = false,
  fallbackSummary?: WorkforceActivitySummary,
): WorkforceActivityChartSummary {
  const start = Date.parse(definition.start);
  const end = Date.parse(definition.end);
  const bucketStart = Date.parse(definition.bucketStart);
  const bucketSize = workforceActivityBucketSizeMs[definition.granularity];
  const buckets: WorkforceActivityBucket[] = Array.from({ length: definition.bucketCount }, (_, index) => {
    const current = bucketStart + index * bucketSize;
    return {
      start: new Date(current).toISOString(),
      end: new Date(Math.min(current + bucketSize, end)).toISOString(),
      count: 0,
      prepared: 0,
      executed: 0,
      held: 0,
    };
  });

  const inWindow = uniqueItems(items.filter((item) => {
    const timestamp = Date.parse(item.occurredAt);
    return Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
  }));

  for (const item of inWindow) {
    const timestamp = Date.parse(item.occurredAt);
    const index = Math.floor((timestamp - bucketStart) / bucketSize);
    const bucket = buckets[index];
    if (!bucket) continue;
    bucket.count += 1;
    if (item.category === "approval") {
      bucket.prepared += 1;
      if (item.status === "pending") bucket.held += 1;
    }
    if (item.category === "execution") bucket.executed += 1;
  }

  const daily = definition.granularity === "day"
    ? buckets.map((bucket) => ({ day: bucket.start.slice(0, 10), count: bucket.count, prepared: bucket.prepared, executed: bucket.executed, held: bucket.held }))
    : (fallbackSummary?.daily ?? []);
  const summary = baseSummary(inWindow, daily);
  return {
    ...(fallbackSummary ? { ...fallbackSummary, ...summary } : summary),
    range: definition.range,
    windowStart: definition.start,
    windowEnd: definition.end,
    granularity: definition.granularity,
    buckets,
    partialHistory,
  };
}

export function buildWorkforceActivityChartSummary(
  items: WorkforceActivityItem[],
  range: WorkforceActivityRange,
  partialHistory = false,
  now: Date | string | number = new Date(),
): WorkforceActivityChartSummary {
  return aggregateWorkforceActivity(
    items,
    getWorkforceActivityRangeDefinition(range, now),
    partialHistory,
  );
}
