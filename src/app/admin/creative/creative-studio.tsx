"use client";

import { type ReactNode, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CreativeCanvas } from "./canvas";
import {
  BACKGROUND_MODE_OPTIONS,
  clampAccentIntensity,
  CREATIVE_FORMAT_SPECS,
  CREATIVE_TEMPLATE_OPTIONS,
  CREATIVE_TEMPLATE_SPECS,
  DEFAULT_CREATIVE_STATE,
  type CreativeState,
  createCreativeState,
  SERVICE_LANE_OPTIONS,
} from "./types";

export function CreativeStudio() {
  const [state, setState] = useState<CreativeState>(DEFAULT_CREATIVE_STATE);

  const activeTemplate = CREATIVE_TEMPLATE_SPECS[state.template];

  const supportedFormats = useMemo(
    () =>
      activeTemplate.supportedFormats.map((formatId) => CREATIVE_FORMAT_SPECS[formatId]),
    [activeTemplate],
  );

  function updateField<K extends keyof CreativeState>(field: K, value: CreativeState[K]) {
    setState((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleTemplateChange(templateId: CreativeState["template"]) {
    const nextState = createCreativeState(templateId);
    setState(nextState);
  }

  function handleFormatChange(formatId: CreativeState["format"]) {
    updateField("format", formatId);
  }

  const formatMeta = CREATIVE_FORMAT_SPECS[state.format];

  return (
    <section className="space-y-7">
      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Internal creative engine</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Creative Studio</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-500">
          Build reusable premium visuals for ads, founder content, offers, and case authority. Layout logic is
          componentized so this can evolve into Remotion scenes later.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[365px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-zinc-800/80 bg-zinc-900/45 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.28)] xl:sticky xl:top-20 xl:h-fit">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-zinc-800/75 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Creative controls</h2>
              <p className="text-xs text-zinc-500">Template and copy inputs</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
              onClick={() => setState(DEFAULT_CREATIVE_STATE)}
            >
              Reset
            </Button>
          </div>

          <div className="space-y-4">
            <ControlField label="Visual type">
              <select
                value={state.template}
                onChange={(event) => handleTemplateChange(event.target.value as CreativeState["template"])}
                className={fieldClassName}
              >
                {CREATIVE_TEMPLATE_OPTIONS.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">{activeTemplate.description}</p>
            </ControlField>

            <ControlField label="Format">
              <select
                value={state.format}
                onChange={(event) => handleFormatChange(event.target.value as CreativeState["format"])}
                className={fieldClassName}
              >
                {supportedFormats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.label}
                  </option>
                ))}
              </select>
            </ControlField>

            <ControlField label="Title">
              <Textarea
                value={state.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="min-h-24 rounded-xl border-zinc-700/80 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600"
                placeholder="Primary headline"
              />
            </ControlField>

            <ControlField label="Subtitle">
              <Textarea
                value={state.subtitle}
                onChange={(event) => updateField("subtitle", event.target.value)}
                className="min-h-20 rounded-xl border-zinc-700/80 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600"
                placeholder="Supportive context"
              />
            </ControlField>

            <div className="grid grid-cols-2 gap-3">
              <ControlField label="Eyebrow">
                <Input
                  value={state.eyebrow}
                  onChange={(event) => updateField("eyebrow", event.target.value)}
                  className="rounded-xl border-zinc-700/80 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600"
                  placeholder="Label"
                />
              </ControlField>

              <ControlField label="CTA text">
                <Input
                  value={state.ctaText}
                  onChange={(event) => updateField("ctaText", event.target.value)}
                  className="rounded-xl border-zinc-700/80 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600"
                  placeholder="Call to action"
                />
              </ControlField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ControlField label="Service lane">
                <select
                  value={state.serviceLane}
                  onChange={(event) => updateField("serviceLane", event.target.value as CreativeState["serviceLane"])}
                  className={fieldClassName}
                >
                  {SERVICE_LANE_OPTIONS.map((lane) => (
                    <option key={lane} value={lane}>
                      {lane}
                    </option>
                  ))}
                </select>
              </ControlField>

              <ControlField label="Background mode">
                <select
                  value={state.backgroundMode}
                  onChange={(event) =>
                    updateField("backgroundMode", event.target.value as CreativeState["backgroundMode"])
                  }
                  className={fieldClassName}
                >
                  {BACKGROUND_MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </ControlField>
            </div>

            <ControlField label="Proof badge (optional)">
              <Input
                value={state.proofBadge}
                onChange={(event) => updateField("proofBadge", event.target.value)}
                className="rounded-xl border-zinc-700/80 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600"
                placeholder="Ex: +62% qualified pipeline"
              />
            </ControlField>

            <ControlField label="Accent intensity">
              <div className="space-y-2 rounded-xl border border-zinc-700/80 bg-zinc-950/70 px-3 py-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={state.accentIntensity}
                  onChange={(event) =>
                    updateField("accentIntensity", clampAccentIntensity(Number(event.target.value)))
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800"
                />
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  <span>Restrained</span>
                  <span>{state.accentIntensity}%</span>
                  <span>Assertive</span>
                </div>
              </div>
            </ControlField>

            <ControlField label="Logo">
              <button
                type="button"
                onClick={() => updateField("showLogo", !state.showLogo)}
                className={cn(
                  "relative flex h-9 w-16 items-center rounded-full border px-1 transition",
                  state.showLogo
                    ? "border-brand/70 bg-brand/20"
                    : "border-zinc-700/80 bg-zinc-900/75",
                )}
                aria-pressed={state.showLogo}
              >
                <span
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform",
                    state.showLogo
                      ? "translate-x-7 bg-brand shadow-[0_0_18px_rgba(73,160,164,0.52)]"
                      : "translate-x-0 bg-zinc-500",
                  )}
                />
                <span className="sr-only">Toggle logo</span>
              </button>
            </ControlField>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/55 p-3 text-xs text-zinc-500">
              Active output: {formatMeta.width} x {formatMeta.height} px
            </div>
          </div>
        </aside>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/45 p-4 shadow-[0_18px_54px_rgba(0,0,0,0.28)] lg:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/75 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Live branded preview</h2>
              <p className="text-xs text-zinc-500">Premium dark composition with reusable template structure</p>
            </div>
            <div className="inline-flex items-center rounded-full border border-zinc-700/80 bg-zinc-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
              {formatMeta.label}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${state.template}:${state.format}:${state.backgroundMode}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            >
              <CreativeCanvas state={state} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
        Tip: switch templates to load tuned defaults, then adjust copy and intensity for each campaign variant.
      </div>
    </section>
  );
}

function ControlField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const fieldClassName =
  "h-10 w-full rounded-xl border border-zinc-700/80 bg-zinc-950/70 px-3 text-sm text-zinc-100 outline-none transition focus-visible:border-brand/70 focus-visible:ring-[3px] focus-visible:ring-brand/25";
