"use client";

import { type ReactNode, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CreativeCanvas } from "./canvas";
import {
  clampAccentIntensity,
  CREATIVE_FORMAT_SPECS,
  CREATIVE_MODE_OPTIONS,
  CREATIVE_MODE_SPECS,
  CREATIVE_TEMPLATE_SPECS,
  DEFAULT_CREATIVE_STATE,
  type CreativeState,
  type CreativeTemplateId,
  createCreativeState,
  createCreativeStateForMode,
  getTemplatesForMode,
  SERVICE_LANE_OPTIONS,
} from "./types";

const DISTRIBUTION_PRESETS: {
  label: string;
  description: string;
  template: CreativeTemplateId;
}[] = [
  {
    label: "Offer post",
    description: "Poster-on-scene offer creative",
    template: "poster_scene",
  },
  {
    label: "Authority statement",
    description: "Large-type editorial brand position",
    template: "gradient_statement",
  },
  {
    label: "Ad visual",
    description: "Hard CTA campaign frame",
    template: "campaign_cta",
  },
  {
    label: "Proof post",
    description: "Outcome-led metric spotlight",
    template: "proof_metric",
  },
  {
    label: "Case snippet",
    description: "SilentSpend editorial case composition",
    template: "editorial_frame",
  },
];

export function CreativeStudio() {
  const [state, setState] = useState<CreativeState>(DEFAULT_CREATIVE_STATE);
  const [mobilePanel, setMobilePanel] = useState<"preview" | "controls">("preview");

  const activeTemplate = CREATIVE_TEMPLATE_SPECS[state.template];
  const activeMode = CREATIVE_MODE_SPECS[state.mode];

  const templatesForMode = useMemo(
    () => getTemplatesForMode(state.mode).map((id) => CREATIVE_TEMPLATE_SPECS[id]),
    [state.mode],
  );

  const supportedFormats = useMemo(
    () => activeTemplate.supportedFormats.map((id) => CREATIVE_FORMAT_SPECS[id]),
    [activeTemplate],
  );

  function updateField<K extends keyof CreativeState>(field: K, value: CreativeState[K]) {
    setState((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleModeChange(mode: CreativeState["mode"]) {
    setState(createCreativeStateForMode(mode));
  }

  function handleTemplateChange(templateId: CreativeState["template"]) {
    setState(createCreativeState(templateId));
  }

  function handleFormatChange(formatId: CreativeState["format"]) {
    updateField("format", formatId);
  }

  function applyPreset(templateId: CreativeTemplateId) {
    setState(createCreativeState(templateId));
    setMobilePanel("preview");
  }

  const formatMeta = CREATIVE_FORMAT_SPECS[state.format];

  return (
    <section className="space-y-7">
      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Internal creative engine</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Creative Studio</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-500">
          V3 art-directed families for publish-ready social, editorial, and campaign creative. Built around stronger
          composition systems, not more template noise.
        </p>
      </header>

      <div className="xl:hidden">
        <div className="inline-flex w-full items-center rounded-xl border border-zinc-800/80 bg-zinc-900/55 p-1">
          <button
            type="button"
            onClick={() => setMobilePanel("preview")}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
              mobilePanel === "preview"
                ? "bg-zinc-800/90 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("controls")}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
              mobilePanel === "controls"
                ? "bg-zinc-800/90 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            Controls
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[372px_minmax(0,1fr)]">
        <aside
          className={cn(
            "order-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/45 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.3)] sm:p-5 xl:order-1 xl:sticky xl:top-20 xl:h-fit",
            mobilePanel === "controls" ? "block" : "hidden xl:block",
          )}
        >
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-zinc-800/75 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Creative controls</h2>
              <p className="text-xs text-zinc-500">Intent, family, and copy direction</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
                onClick={() => setState(DEFAULT_CREATIVE_STATE)}
              >
                Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="xl:hidden border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
                onClick={() => setMobilePanel("preview")}
              >
                Preview
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <ControlField label="Use case">
              <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1">
                {DISTRIBUTION_PRESETS.map((preset) => {
                  const active = state.template === preset.template;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.template)}
                      className={cn(
                        "shrink-0 rounded-xl border px-3 py-2 text-left transition",
                        active
                          ? "border-brand/55 bg-brand/15 text-zinc-100"
                          : "border-zinc-700/75 bg-zinc-950/72 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                      )}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{preset.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </ControlField>

            <ControlField label="Content mode">
              <div className="grid grid-cols-3 gap-2">
                {CREATIVE_MODE_OPTIONS.map((mode) => {
                  const active = state.mode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleModeChange(mode.id)}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-semibold uppercase tracking-[0.13em] transition",
                        active
                          ? "border-brand/60 bg-brand/20 text-zinc-100"
                          : "border-zinc-700/75 bg-zinc-950/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                      )}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-zinc-500">{activeMode.description}</p>
            </ControlField>

            <ControlField label="Template family">
              <select
                value={state.template}
                onChange={(event) => handleTemplateChange(event.target.value as CreativeState["template"])}
                className={fieldClassName}
              >
                {templatesForMode.map((template) => (
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
                placeholder="Primary message"
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

        <div
          className={cn(
            "order-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/45 p-4 shadow-[0_18px_54px_rgba(0,0,0,0.3)] lg:p-6 xl:order-2",
            mobilePanel === "preview" ? "block" : "hidden xl:block",
          )}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/75 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Live branded preview</h2>
              <p className="text-xs text-zinc-500">
                Mode: {state.mode} &middot; Template: {activeTemplate.label}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-zinc-700/80 bg-zinc-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                {formatMeta.label}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="xl:hidden border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
                onClick={() => setMobilePanel("controls")}
              >
                Controls
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${state.mode}:${state.template}:${state.format}`}
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
        Brand mode for editorial authority, Social mode for proof and poster publishing, and Ad mode for hard CTA campaign outputs.
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
