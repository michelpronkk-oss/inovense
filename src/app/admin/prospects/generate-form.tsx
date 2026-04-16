"use client";

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

export default function GenerateForm({
  sourceOptions,
}: {
  sourceOptions: Array<{ value: string; label: string }>;
}) {
  const [state, formAction, isPending] = useActionState(
    generateProspectsFromBrief,
    INITIAL_GENERATE_STATE
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field name="market" label="Market" placeholder="Netherlands" />
        <Field name="niche" label="Niche" placeholder="B2B SaaS" />
        <Field name="location" label="Location" placeholder="Amsterdam" />
        <Field name="volume" label="Volume" placeholder="15" defaultValue="15" />
        <label className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Source</span>
          <select name="source" defaultValue="outbound" className={inputClassName}>
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

function Field({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputClassName}
      />
    </label>
  );
}
