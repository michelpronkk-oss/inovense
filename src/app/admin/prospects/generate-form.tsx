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
  excluded: 0,
  discarded: 0,
  summary: null,
};

const MARKET_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Netherlands",
] as const;

const NICHE_OPTIONS = [
  "Medspa",
  "Aesthetic clinic",
  "Cosmetic dentist",
  "Dental implants clinic",
  "Law firm",
  "Personal injury law firm",
  "Immigration law firm",
  "Business consultant",
  "High-ticket coach",
  "Fractional CFO",
  "Fractional CMO",
  "Marketing agency",
  "Creative agency",
  "Web agency",
  "Performance marketing agency",
  "Home remodeling company",
  "Roofing company",
  "HVAC company",
  "Solar installer",
  "Private clinic",
  "Wellness studio",
  "Performance studio",
  "B2B service provider",
  "IT consultancy",
  "Cybersecurity consultancy",
  "Recruitment firm",
] as const;

const LOCATION_BY_MARKET: Record<string, string[]> = {
  "United States": [
    "Miami",
    "Los Angeles",
    "New York",
    "Austin",
    "Dallas",
    "Chicago",
    "Phoenix",
    "Denver",
    "Houston",
    "Tampa",
    "San Diego",
    "Nashville",
    "Atlanta",
    "Scottsdale",
  ],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Leeds"],
  Canada: ["Toronto", "Vancouver", "Calgary"],
  Australia: ["Sydney", "Melbourne", "Brisbane"],
  Netherlands: ["Amsterdam", "Rotterdam", "Utrecht", "Eindhoven"],
};

type GeneratePreset = {
  label: string;
  market: string;
  niche: string;
  location: string;
  volume: string;
  source: string;
};

const PRIMARY_PRESETS: GeneratePreset[] = [
  { label: "US Medspas, Miami", market: "United States", niche: "Medspa", location: "Miami", volume: "18", source: "outbound" },
  { label: "US Medspas, Los Angeles", market: "United States", niche: "Medspa", location: "Los Angeles", volume: "18", source: "outbound" },
  { label: "US Aesthetic Clinics, New York", market: "United States", niche: "Aesthetic clinic", location: "New York", volume: "18", source: "outbound" },
  { label: "US Cosmetic Dentists, Austin", market: "United States", niche: "Cosmetic dentist", location: "Austin", volume: "18", source: "outbound" },
  { label: "US Dental Implants, Dallas", market: "United States", niche: "Dental implants clinic", location: "Dallas", volume: "18", source: "outbound" },
  { label: "US Law Firms, Chicago", market: "United States", niche: "Law firm", location: "Chicago", volume: "18", source: "outbound" },
  { label: "US Personal Injury Law, Phoenix", market: "United States", niche: "Personal injury law firm", location: "Phoenix", volume: "18", source: "outbound" },
  { label: "US Home Remodeling, Denver", market: "United States", niche: "Home remodeling company", location: "Denver", volume: "18", source: "outbound" },
  { label: "US Roofing Companies, Houston", market: "United States", niche: "Roofing company", location: "Houston", volume: "18", source: "outbound" },
  { label: "US HVAC Companies, Tampa", market: "United States", niche: "HVAC company", location: "Tampa", volume: "18", source: "outbound" },
  { label: "US Business Consultants, New York", market: "United States", niche: "Business consultant", location: "New York", volume: "18", source: "outbound" },
  { label: "US Fractional CFOs, Austin", market: "United States", niche: "Fractional CFO", location: "Austin", volume: "18", source: "outbound" },
  { label: "UK Aesthetic Clinics, London", market: "United Kingdom", niche: "Aesthetic clinic", location: "London", volume: "15", source: "outbound" },
  { label: "UK Dental Clinics, Manchester", market: "United Kingdom", niche: "Cosmetic dentist", location: "Manchester", volume: "15", source: "outbound" },
  { label: "UK Business Consultants, London", market: "United Kingdom", niche: "Business consultant", location: "London", volume: "15", source: "outbound" },
  { label: "UK Agencies, London", market: "United Kingdom", niche: "Marketing agency", location: "London", volume: "15", source: "outbound" },
];

const PARTNER_PRESETS: GeneratePreset[] = [
  { label: "US Marketing Agencies, Austin", market: "United States", niche: "Marketing agency", location: "Austin", volume: "18", source: "outbound" },
  { label: "US Creative Agencies, New York", market: "United States", niche: "Creative agency", location: "New York", volume: "18", source: "outbound" },
  { label: "UK Web Agencies, London", market: "United Kingdom", niche: "Web agency", location: "London", volume: "15", source: "outbound" },
  { label: "UK Performance Agencies, Manchester", market: "United Kingdom", niche: "Performance marketing agency", location: "Manchester", volume: "15", source: "outbound" },
  { label: "Canada Agencies, Toronto", market: "Canada", niche: "Marketing agency", location: "Toronto", volume: "15", source: "outbound" },
  { label: "Australia Agencies, Sydney", market: "Australia", niche: "Marketing agency", location: "Sydney", volume: "15", source: "outbound" },
];

const NL_PRESETS: GeneratePreset[] = [
  { label: "NL Aesthetic Clinics, Amsterdam", market: "Netherlands", niche: "Aesthetic clinic", location: "Amsterdam", volume: "15", source: "outbound" },
  { label: "NL Dental Clinics, Rotterdam", market: "Netherlands", niche: "Cosmetic dentist", location: "Rotterdam", volume: "15", source: "outbound" },
  { label: "NL Renovation Companies, Utrecht", market: "Netherlands", niche: "Home remodeling company", location: "Utrecht", volume: "15", source: "outbound" },
  { label: "NL Agencies, Amsterdam", market: "Netherlands", niche: "Marketing agency", location: "Amsterdam", volume: "15", source: "outbound" },
];

function isActivePreset(
  preset: GeneratePreset,
  market: string,
  niche: string,
  location: string,
  volume: string,
  source: string
) {
  return (
    preset.market === market &&
    preset.niche === niche &&
    preset.location === location &&
    preset.volume === volume &&
    preset.source === source
  );
}

export default function GenerateForm({
  sourceOptions,
}: {
  sourceOptions: Array<{ value: string; label: string }>;
}) {
  const [market, setMarket] = useState<string>("United States");
  const [niche, setNiche] = useState<string>("Medspa");
  const [location, setLocation] = useState<string>("Miami");
  const [volume, setVolume] = useState<string>("18");
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

  const activeCheck = (preset: GeneratePreset) =>
    isActivePreset(preset, market, niche, location, volume, source);

  function PresetChip({
    preset,
    dim,
  }: {
    preset: GeneratePreset;
    dim?: boolean;
  }) {
    const active = activeCheck(preset);
    return (
      <button
        key={preset.label}
        type="button"
        onClick={() => applyPreset(preset)}
        className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] transition-colors ${
          active
            ? "border-brand/45 bg-brand/15 text-brand"
            : dim
            ? "border-zinc-800/70 bg-zinc-900/40 text-zinc-600 hover:border-zinc-700 hover:text-zinc-300"
            : "border-zinc-700/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        }`}
      >
        {preset.label}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3 space-y-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
            Primary high-ticket
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRIMARY_PRESETS.map((preset) => (
              <PresetChip key={preset.label} preset={preset} />
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-800/60 pt-2.5">
          <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-700">
            Partner / channel
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PARTNER_PRESETS.map((preset) => (
              <PresetChip key={preset.label} preset={preset} dim />
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-800/60 pt-2.5">
          <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-700">
            Secondary NL / EU
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NL_PRESETS.map((preset) => (
              <PresetChip key={preset.label} preset={preset} dim />
            ))}
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
