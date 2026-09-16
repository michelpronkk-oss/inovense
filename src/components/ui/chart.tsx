"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

/**
 * A trimmed shadcn-style Chart primitive: a typed series config, a
 * ChartContainer that injects each series' color as a CSS variable
 * (`--color-<key>`) and wraps Recharts' ResponsiveContainer, and a
 * ChartTooltip/ChartTooltipContent pair. This intentionally does not carry
 * the generic light/dark-theme or icon-config machinery of the full shadcn
 * registry component - this codebase has one dark theme and three fixed
 * series, so that generality isn't load-bearing here.
 */
export type ChartConfig = Record<string, { label: string; color: string }>

type ChartContextValue = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextValue | null>(null)

export function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error("useChart must be used within a <ChartContainer />")
  return ctx
}

export function ChartContainer({
  id,
  className,
  config,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const reactId = React.useId()
  const chartId = `chart-${id ?? reactId.replace(/:/g, "")}`
  const style = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [`--color-${key}`, value.color])
  ) as React.CSSProperties

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn("[&_.recharts-cartesian-axis-tick_text]:fill-current", className)}
        style={style}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

export const ChartTooltip = RechartsPrimitive.Tooltip
