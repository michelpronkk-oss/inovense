"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import {
  generateProspectsFromBrief,
  type GenerateProspectsState,
} from "./actions";

const inputClassName =
  "h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none transition focus:border-brand/50";

const INITIAL_GENERATE_STATE: GenerateProspectsState = {
  ok: false,
  error: null,
  inserted: 0,
  duplicates: 0,
  discarded: 0,
  summary: null,
};

const MARKET_OPTIONS = [
  "Netherlands",
  "United Kingdom",
  "United States",
] as const;

const NICHE_OPTIONS = [
  "Digital marketing agency",
  "Shopify agency",
  "Ecommerce brand",
  "Consultant",
  "Interior designer",
  "Renovation company",
  "Beauty salon",
  "Beauty clinic",
] as const;

const LOCATION_BY_MARKET: Record<string, string[]> = {
  Netherlands: ["Amsterdam", "Rotterdam", "Utrecht"],
  "United Kingdom": ["London", "Manchester", "Birmingham"],
  "United States": ["New York", "Austin", "Miami", "Los Angeles"],
};

type GeneratePreset = {
  label: string;
  market: string;
  niche: string;
  location: string;
  volume: string;
  source: string;
};

const RECOMMENDED_PRESETS: GeneratePreset[] = [
  {
    label: "UK Agencies, London",
    market: "United Kingdom",
    niche: "Digital marketing agency",
    location: "London",
    volume: "15",
    source: "outbound",
  },
  {
    label: "UK Agencies, Manchester",
    market: "United Kingdom",
    niche: "Digital marketing agency",
    location: "Manchester",
    volume: "15",
    source: "outbound",
  },
  {
    label: "NL Agencies, Amsterdam",
    market: "Netherlands",
    niche: "Digital marketing agency",
    location: "Amsterdam",
    volume: "15",
    source: "outbound",
  },
  {
    label: "NL Renovation, Amsterdam",
    market: "Netherlands",
    niche: "Renovation company",
    location: "Amsterdam",
    volume: "15",
    source: "outbound",
  },
  {
    label: "NL Interior, Amsterdam",
    market: "Netherlands",
    niche: "Interior designer",
    location: "Amsterdam",
    volume: "15",
    source: "outbound",
  },
];

const SECONDARY_PRESETS: GeneratePreset[] = [
  {
    label: "UK Shopify Agencies, London",
    market: "United Kingdom",
    niche: "Shopify agency",
    location: "London",
    volume: "15",
    source: "outbound",
  },
  {
    label: "NL Renovation, Utrecht",
    market: "Netherlands",
    niche: "Renovation company",
    location: "Utrecht",
    volume: "15",
    source: "outbound",
  },
  {
    label: "US Agencies, Austin",
    market: "United States",
    niche: "Digital marketing agency",
    location: "Austin",
    volume: "18",
    source: "outbound",
  },
];

export default function GenerateForm({
  sourceOptions,
}: {
  sourceOptions: Array<{ value: string; label: string }>;
}) {
  const [market, setMarket] = useState<string>("United Kingdom");
  const [niche, setNiche] = useState<string>("Digital marketing agency");
  const [location, setLocation] = useState<string>("London");
  const [volume, setVolume] = useState<string>("15");
  const [source, setSource] = useState<string>("outbound");

  const [state, formAction, isPending] = useActionState(
    generateProspectsFromBrief,
    INITIAL_GENERATE_STATE
  );

  const locationOptions = useMemo(() => {
    const marketLocations = LOCATION_BY_MARKET[market] ?? [];
    const merged = new Set<string>(marketLocations);
    Object.values(LOCATION_BY_MARKET).forEach((items) => {
      items.forEach((item) => merged.add(item));
    });
    return Array.from(merged);
  }, [market]);

  function applyPreset(preset: GeneratePreset) {
    setMarket(preset.market);
    setNiche(preset.niche);
    setLocation(preset.location);
    setVolume(preset.volume);
    setSource(preset.source);
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
          Recommended presets
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RECOMMENDED_PRESETS.map((preset) => {
            const active =
              preset.market === market &&
              preset.niche === niche &&
              preset.location === location &&
              preset.volume === volume &&
              preset.source === source;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? "border-brand/45 bg-brand/15 text-brand"
                    : "border-zinc-700/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 border-t border-zinc-800/60 pt-2">
          <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-700">Secondary</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SECONDARY_PRESETS.map((preset) => {
              const active =
                preset.market === market &&
                preset.niche === niche &&
                preset.location === location &&
                preset.volume === volume &&
                preset.source === source;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] transition-colors ${
                    active
                      ? "border-brand/45 bg-brand/15 text-brand"
                      : "border-zinc-700/80 bg-zinc-900/60 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Market</span>
          <input
            name="market"
            value={market}
            onChange={(event) => setMarket(event.target.value)}
            list="prospects-market-options"
            placeholder="Select market"
            className={inputClassName}
          />
          <datalist id="prospects-market-options">
            {MARKET_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Niche</span>
          <input
            name="niche"
            value={niche}
            onChange={(event) => setNiche(event.target.value)}
            list="prospects-niche-options"
            placeholder="Select or type niche"
            className={inputClassName}
          />
          <datalist id="prospects-niche-options">
            {NICHE_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Location</span>
          <input
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            list="prospects-location-options"
            placeholder="Select or type location"
            className={inputClassName}
          />
          <datalist id="prospects-location-options">
            {locationOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Volume</span>
          <input
            name="volume"
            type="number"
            min={1}
            max={50}
            value={volume}
            onChange={(event) => setVolume(event.target.value)}
            className={inputClassName}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Source</span>
          <select
            name="source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={inputClassName}
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-brand/30 bg-brand/10 px-3 text-xs font-medium uppercase tracking-[0.08em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15 disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Generating..." : "Generate prospects"}
          </button>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">
          {state.error}
        </p>
      ) : null}

      {state.ok && state.summary ? (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-xs text-emerald-300">
          {state.summary}
        </p>
      ) : null}
    </form>
  );
}
