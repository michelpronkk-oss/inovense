import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const rangeSource = fs.readFileSync(path.join(root, "src/lib/dashboard/workforce-activity-range.ts"), "utf8");
const activitySource = fs.readFileSync(path.join(root, "src/lib/dashboard/workforce-activity.ts"), "utf8")
  .replace(/^import type .*?;\r?\nimport \{[\s\S]*?\} from "@\/lib\/dashboard\/workforce-activity-range";\r?\n/m, "");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-workforce-range-"));

try {
  const source = `${rangeSource}\n${activitySource}`;
  const code = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmpDir, "workforce-activity-range.mjs");
  fs.writeFileSync(file, code);
  const mod = await import(`${pathToFileURL(file).href}?v=${Math.random()}`);

  const now = "2026-09-16T12:34:56.000Z";
  const hour = mod.getWorkforceActivityRangeDefinition("24h", now);
  assert.equal(hour.bucketCount, 24);
  assert.equal(hour.granularity, "hour");
  assert.equal(hour.start, "2026-09-15T12:34:56.000Z");
  assert.equal(hour.bucketStart, "2026-09-15T13:00:00.000Z");

  const week = mod.getWorkforceActivityRangeDefinition("7d", now);
  assert.equal(week.start, "2026-09-10T00:00:00.000Z");
  assert.equal(week.bucketCount, 7);
  assert.equal(week.granularity, "day");
  const month = mod.getWorkforceActivityRangeDefinition("30d", now);
  assert.equal(month.start, "2026-08-18T00:00:00.000Z");
  assert.equal(month.bucketCount, 30);

  const item = (id, occurredAt, category = "approval", status = "approved") => ({
    id, occurredAt, category, status, title: id, description: id, operatorKey: null, connectorKey: null,
    severity: category === "failure" ? "failure" : "success", relatedRoute: null, technicalEventId: id,
  });
  const chart = mod.aggregateWorkforceActivity([
    item("held", "2026-09-16T12:10:00.000Z", "approval", "pending"),
    item("held", "2026-09-16T12:10:00.000Z", "approval", "pending"),
    item("exec", "2026-09-16T11:59:59.999Z", "execution", "completed"),
    item("old", "2026-09-15T12:00:00.000Z"),
    item("future", "2026-09-17T00:00:00.000Z"),
    item("invalid", "not-a-timestamp"),
  ], hour);
  assert.equal(chart.buckets.length, 24);
  assert.equal(chart.prepared, 1, "duplicate approvals count once");
  assert.equal(chart.executed, 1, "execution remains separate from prepared work");
  assert.equal(chart.held, 1, "pending approval is held and prepared");
  assert.equal(chart.total, 2, "out-of-window and invalid timestamps are excluded");
  assert.equal(chart.buckets.at(-1).held, 1, "the current partial UTC hour is retained");
  assert.equal(chart.buckets[0].prepared, 0, "the first partially covered bucket remains zero when no event is inside it");

  console.log("Workforce activity UTC range definitions, dedupe, boundary, future, invalid timestamp, and aggregation contracts passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
