"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  PROSPECT_STATUSES,
  PROSPECT_LANGUAGE_OPTIONS,
  PROSPECT_LANE_OPTIONS,
} from "@/app/admin/config";

export default function ProspectsFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const currentStatus = searchParams.get("status") ?? "";
  const currentLanguage = searchParams.get("language") ?? "";
  const currentLane = searchParams.get("lane") ?? "";
  const followUp = searchParams.get("follow_up") ?? "";

  const selectClass =
    "h-8 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 pr-8 text-sm text-zinc-300 appearance-none outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <select
          value={currentStatus}
          onChange={(e) => update("status", e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {PROSPECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>

      <div className="relative">
        <select
          value={currentLanguage}
          onChange={(e) => update("language", e.target.value)}
          className={selectClass}
        >
          <option value="">All languages</option>
          {PROSPECT_LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>

      <div className="relative">
        <select
          value={currentLane}
          onChange={(e) => update("lane", e.target.value)}
          className={selectClass}
        >
          <option value="">All lanes</option>
          {PROSPECT_LANE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>

      <div className="relative">
        <select
          value={followUp}
          onChange={(e) => update("follow_up", e.target.value)}
          className={selectClass}
        >
          <option value="">All follow-up windows</option>
          <option value="today">Due today</option>
          <option value="overdue">Overdue</option>
          <option value="next_7d">Next 7 days</option>
          <option value="none">No follow-up set</option>
        </select>
        <ChevronIcon />
      </div>

      {(currentStatus || currentLanguage || currentLane || followUp) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
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
  );
}
