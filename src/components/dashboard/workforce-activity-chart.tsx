"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatActivityTick, formatActivityTooltip, integerTicks, niceMax } from "@/lib/dashboard/chart-scale";
import type { WorkforceActivitySummary } from "@/lib/activity/types";
import type { WorkforceActivityChartSummary } from "@/lib/dashboard/workforce-activity";

export type WorkforceSeriesKey = "prepared" | "executed" | "held";

export const workforceChartConfig: ChartConfig = {
  prepared: { label: "Prepared", color: "var(--cyan)" },
  executed: { label: "Executed", color: "var(--green)" },
  held: { label: "Held at approval", color: "var(--amber)" },
};

type ChartPoint = { start: string; end: string; prepared: number; executed: number; held: number };

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getReducedMotionSnapshot(): boolean {
  return typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
}
function getReducedMotionServerSnapshot(): boolean {
  return false;
}
/** Reads the live prefers-reduced-motion media query as external browser
 * state via useSyncExternalStore - avoids the setState-in-effect cascade a
 * naive useState+useEffect subscription would cause on every mount. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}

function WorkforceTooltip({ active, payload, label, data, granularity }: { active?: boolean; payload?: Array<{ dataKey?: string | number; value?: number | string; color?: string }>; label?: string; data?: ChartPoint[]; granularity: "hour" | "day" }) {
  if (!active || !payload || payload.length === 0 || typeof label !== "string") return null;
  const point = data?.find((item) => item.start === label);
  return (
    <div className="wa-chart-tooltip" role="status">
      <div className="wa-chart-tooltip-date">{point ? formatActivityTooltip(point.start, point.end, granularity) : label}</div>
      <div className="wa-chart-tooltip-rows">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? "");
          const config = workforceChartConfig[key];
          if (!config) return null;
          const value = typeof entry.value === "number" && Number.isFinite(entry.value) ? entry.value : 0;
          return (
            <div className="wa-chart-tooltip-row" key={key}>
              <span className="wa-chart-tooltip-marker" data-series={key} aria-hidden="true" />
              <span className="wa-chart-tooltip-label">{config.label}</span>
              <span className="wa-chart-tooltip-value">{value.toLocaleString("en-US")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Renders a small dot only on the most recent real bucket - never on every point. */
function makeLatestPointDot(color: string, lastIndex: number) {
  return function LatestPointDot(props: { cx?: number; cy?: number; index?: number }) {
    if (props.index !== lastIndex || typeof props.cx !== "number" || typeof props.cy !== "number") return null;
    return <circle cx={props.cx} cy={props.cy} r={3} fill={color} stroke="#0a0d12" strokeWidth={1.5} />;
  };
}

export function WorkforceActivityChart({ summary }: { summary: WorkforceActivitySummary | WorkforceActivityChartSummary }) {
  const reducedMotion = useReducedMotion();
  const [hidden, setHidden] = useState<ReadonlySet<WorkforceSeriesKey>>(new Set());
  const toggleSeries = (key: WorkforceSeriesKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const chartSummary = summary as WorkforceActivityChartSummary;
  const granularity = chartSummary.granularity ?? "day";
  const data: ChartPoint[] = useMemo(() => {
    if (Array.isArray(chartSummary.buckets) && chartSummary.buckets.length > 0) return chartSummary.buckets.map((item) => ({ start: item.start, end: item.end, prepared: item.prepared, executed: item.executed, held: item.held }));
    return summary.daily.map((item) => ({ start: `${item.day}T00:00:00.000Z`, end: `${item.day}T23:59:59.999Z`, prepared: item.prepared, executed: item.executed, held: item.held }));
  }, [chartSummary.buckets, summary.daily]);

  const hasActivity = summary.prepared > 0 || summary.executed > 0 || summary.held > 0;
  const rawMax = Math.max(1, ...data.flatMap((point) => [point.prepared, point.executed, point.held]));
  const max = niceMax(rawMax);
  const ticks = integerTicks(max);
  const lastIndex = data.length - 1;
  // Recharts already distinguishes an initial mount (grows the path in from
  // its baseline) from a later data-driven update (morphs the existing path
  // to the new one) without any extra state - this single duration sits
  // between the initial-reveal and live-update targets for both cases.
  const animationDuration = reducedMotion ? 0 : 600;
  const rangeLabel = chartSummary.range === "24h" ? "24-hour range" : chartSummary.range === "30d" ? "30-day range" : `${data.length}-day range`;

  return (
    <div className="wa-chart">
      <div className="wa-chart-legend" role="group" aria-label={`Series totals for the ${rangeLabel}`}>
        {(Object.keys(workforceChartConfig) as WorkforceSeriesKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className="wa-chart-legend-item"
            data-series={key}
            data-hidden={hidden.has(key) || undefined}
            onClick={() => toggleSeries(key)}
            aria-pressed={!hidden.has(key)}
          >
            <span className="wa-chart-legend-dot" data-series={key} aria-hidden="true" />
            <span className="wa-chart-legend-label">{workforceChartConfig[key].label}</span>
            <span className="wa-chart-legend-value">{summary[key]}</span>
          </button>
        ))}
      </div>

      <div className="wa-chart-plot">
        <span className="sr-only">
          {hasActivity
            ? `${rangeLabel}: ${summary.prepared} prepared, ${summary.executed} executed, and ${summary.held} held at approval.`
            : `${rangeLabel}: no workforce activity recorded.`}
        </span>
        {hasActivity ? (
          <ChartContainer config={workforceChartConfig} className="wa-chart-container">
            <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -18 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="start"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--text-faint)" }}
                tickFormatter={(start: string) => formatActivityTick(start, granularity, data.length > 14)}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                width={26}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={[0, max]}
                ticks={ticks}
                tick={{ fontSize: 10, fill: "var(--text-faint)" }}
              />
              <ChartTooltip cursor={{ stroke: "rgba(255,255,255,0.14)" }} content={<WorkforceTooltip data={data} granularity={granularity} />} isAnimationActive={false} />
              {!hidden.has("prepared") && (
                <Area
                  type="monotone"
                  dataKey="prepared"
                  stroke="var(--cyan)"
                  fill="var(--cyan)"
                  fillOpacity={0.08}
                  strokeWidth={1.75}
                  dot={makeLatestPointDot("var(--cyan)", lastIndex)}
                  activeDot={{ r: 3.5, strokeWidth: 0 }}
                  isAnimationActive={!reducedMotion}
                  animationDuration={animationDuration}
                />
              )}
              {!hidden.has("executed") && (
                <Area
                  type="monotone"
                  dataKey="executed"
                  stroke="var(--green)"
                  fill="var(--green)"
                  fillOpacity={0.07}
                  strokeWidth={1.75}
                  dot={makeLatestPointDot("var(--green)", lastIndex)}
                  activeDot={{ r: 3.5, strokeWidth: 0 }}
                  isAnimationActive={!reducedMotion}
                  animationDuration={animationDuration}
                />
              )}
              {!hidden.has("held") && (
                <Line
                  type="monotone"
                  dataKey="held"
                  stroke="var(--amber)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={makeLatestPointDot("var(--amber)", lastIndex)}
                  activeDot={{ r: 3.5, strokeWidth: 0 }}
                  isAnimationActive={!reducedMotion}
                  animationDuration={animationDuration}
                />
              )}
            </ComposedChart>
          </ChartContainer>
        ) : (
          <div className="wa-chart-empty">
            <strong>No workforce activity in this period.</strong>
            <span>Prepared, executed, and held work will appear here once operators begin monitoring.</span>
          </div>
        )}
      </div>
    </div>
  );
}
