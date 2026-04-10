"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PLATFORM_OPTIONS, PLANNER_STATUS_OPTIONS, TEMPLATE_OPTIONS } from "./config";

export function PlannerFilter({ weeks }: { weeks: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const week = searchParams.get("week") ?? "";
  const platform = searchParams.get("platform") ?? "";
  const status = searchParams.get("status") ?? "";
  const template = searchParams.get("template") ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  const hasFilters = !!(week || platform || status || template);
  const selectClass =
    "h-8 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 pr-8 text-sm text-zinc-300 appearance-none outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SelectShell>
        <select
          value={week}
          onChange={(event) => update("week", event.target.value)}
          className={selectClass}
        >
          <option value="">All weeks</option>
          {weeks.map((weekLabel) => (
            <option key={weekLabel} value={weekLabel}>
              {weekLabel}
            </option>
          ))}
        </select>
      </SelectShell>

      <SelectShell>
        <select
          value={platform}
          onChange={(event) => update("platform", event.target.value)}
          className={selectClass}
        >
          <option value="">All platforms</option>
          {PLATFORM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SelectShell>

      <SelectShell>
        <select
          value={status}
          onChange={(event) => update("status", event.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {PLANNER_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SelectShell>

      <SelectShell>
        <select
          value={template}
          onChange={(event) => update("template", event.target.value)}
          className={selectClass}
        >
          <option value="">All templates</option>
          {TEMPLATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SelectShell>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
