import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const chartComponentSource = read("src/components/dashboard/workforce-activity-chart.tsx");
const chartPrimitiveSource = read("src/components/ui/chart.tsx");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-workforce-chart-"));

try {
  // Static contracts: the chart is a real Recharts composition wired to
  // Auterim's own dark theme via CSS variables, not a generic template.
  assert.match(chartComponentSource, /from "recharts"/, "the chart uses Recharts, not a hand-rolled SVG path");
  assert.match(chartComponentSource, /accessibilityLayer/, "the chart opts into Recharts' accessibility layer");
  assert.match(chartComponentSource, /stroke="var\(--cyan\)"/, "prepared uses the shared cyan token, not a hardcoded hex reintroduced ad hoc");
  assert.match(chartComponentSource, /stroke="var\(--green\)"/);
  assert.match(chartComponentSource, /strokeDasharray/, "held-at-approval is differentiated by dash, not color alone");
  assert.match(chartComponentSource, /prefers-reduced-motion/, "reduced motion is read from the real media query, not assumed");
  assert.doesNotMatch(chartComponentSource, /Math\.random/, "no randomized or fabricated data enters the chart");
  assert.match(chartPrimitiveSource, /ResponsiveContainer/, "ChartContainer wraps Recharts' own responsive sizing");

  // Pure scale/format helpers: no React, no Recharts, no path aliases - so
  // this transform+import is a plain TS module, nothing to stub.
  const scaleSource = read("src/lib/dashboard/chart-scale.ts");
  const code = esbuild.transformSync(scaleSource, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmpDir, "chart-scale.mjs");
  fs.writeFileSync(file, code);
  const scale = await import(`${pathToFileURL(file).href}?v=${Math.random()}`);

  // niceMax: never a huge empty range for sparse real counts (0-2), still
  // rounds up sensibly once activity grows.
  assert.equal(scale.niceMax(0), 2, "an all-zero period still gets a legible, non-degenerate axis ceiling");
  assert.equal(scale.niceMax(1), 2);
  assert.equal(scale.niceMax(2), 2, "a max of 2 keeps a tight axis instead of a fabricated 0-10 scale");
  assert.equal(scale.niceMax(8), 10);
  assert.equal(scale.niceMax(37), 50, "37 rounds up to the next '1/2/5/10' nice ceiling, not an arbitrary value");
  assert.equal(scale.niceMax(NaN), 2, "invalid input never produces a NaN axis ceiling");
  assert.equal(scale.niceMax(-5), 2, "a negative input never produces a nonsensical ceiling");

  // integerTicks: always whole numbers, always includes 0 and the max.
  for (const max of [2, 4, 10, 37, 0, NaN, -3]) {
    const ticks = scale.integerTicks(scale.niceMax(max));
    assert.ok(ticks.every((tick) => Number.isInteger(tick)), `every Y tick for max=${max} is a whole number`);
    assert.ok(ticks.every((tick) => Number.isFinite(tick)), `no NaN/Infinity ticks for max=${max}`);
    assert.equal(ticks[0], 0, `ticks for max=${max} start at zero`);
    assert.equal(ticks[ticks.length - 1], scale.niceMax(max), `ticks for max=${max} reach the real ceiling`);
  }

  // Day formatting is UTC-anchored, matching how normalizeWorkforceActivity
  // buckets by UTC day string - the tick text must never silently roll to
  // an adjacent day under a different local timezone interpretation.
  assert.equal(scale.formatDayTick("2026-09-01", false), "TUE");
  assert.equal(scale.formatDayTick("2026-09-01", true), "T");
  assert.equal(scale.formatTooltipDate("2026-09-01"), "Tue, Sep 1");
  assert.equal(scale.formatDayTick("not-a-date", false), "", "an invalid day string never renders as a garbled or NaN tick label");
  assert.equal(scale.formatTooltipDate("not-a-date"), "not-a-date", "an invalid day string falls back to the raw value, never a NaN date");

  console.log("Workforce activity chart component contracts and scale/format helpers passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
