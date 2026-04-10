"use client";

import { useState, useTransition } from "react";
import { submitOnboarding } from "./actions";
import { getFieldsForLane } from "@/app/onboarding/fields";
import type { ClientLocale } from "@/lib/client-locale";

type Props = {
  token: string;
  companyName: string;
  fullName: string;
  serviceLane: string;
  locale: ClientLocale;
};

type OnboardingFormCopy = {
  briefLabel: string;
  welcomePrefix: string;
  introPrefix: string;
  introDetail: string;
  requiredFieldsLine: string;
  validationPrefix: string;
  genericError: string;
  successTitle: string;
  successMessage: string;
  submitIdle: string;
  submitPending: string;
  submittedLine: string;
};

const ONBOARDING_FORM_COPY: Record<ClientLocale, OnboardingFormCopy> = {
  en: {
    briefLabel: "Onboarding brief",
    welcomePrefix: "Welcome",
    introPrefix: "This brief is for",
    introDetail: "Fill in as much as you can. The more detail you provide, the faster we can move.",
    requiredFieldsLine: "Required fields are marked with an asterisk.",
    validationPrefix: "Please fill in",
    genericError: "Something went wrong. Please try again.",
    successTitle: "Onboarding brief received.",
    successMessage:
      "We have everything we need to get started. You will hear from us shortly with next steps.",
    submitIdle: "Submit onboarding brief",
    submitPending: "Submitting...",
    submittedLine: "Submitted directly to the Inovense team.",
  },
  nl: {
    briefLabel: "Onboarding",
    welcomePrefix: "Welkom",
    introPrefix: "Deze onboarding is voor",
    introDetail:
      "Vul in wat je al weet. Hoe concreter je input, hoe sneller we kunnen starten.",
    requiredFieldsLine: "Verplichte velden zijn gemarkeerd met een asterisk.",
    validationPrefix: "Vul in",
    genericError: "Er ging iets mis. Probeer het opnieuw.",
    successTitle: "Onboarding ontvangen.",
    successMessage:
      "We hebben alles om te starten. Je ontvangt snel de volgende stap van ons team.",
    submitIdle: "Onboarding versturen",
    submitPending: "Versturen...",
    submittedLine: "Wordt direct naar het Inovense team verstuurd.",
  },
};

function formatLaneLabel(serviceLane: string, locale: ClientLocale): string {
  if (locale === "en") {
    return serviceLane;
  }
  if (serviceLane === "Build") {
    return "Build";
  }
  if (serviceLane === "Systems") {
    return "Systems";
  }
  if (serviceLane === "Growth") {
    return "Growth";
  }
  return serviceLane;
}

export default function OnboardingForm({
  token,
  companyName,
  fullName,
  serviceLane,
  locale,
}: Props) {
  const copy = ONBOARDING_FORM_COPY[locale];
  const fields = getFieldsForLane(serviceLane, locale);
  const laneLabel = formatLaneLabel(serviceLane, locale);
  const firstName = fullName.split(" ")[0];

  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, ""]))
  );
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const requiredFields = fields.filter((f) => f.required);
    for (const f of requiredFields) {
      if (!values[f.key]?.trim()) {
        setError(`${copy.validationPrefix}: ${f.label}`);
        return;
      }
    }

    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) payload[k] = v.trim();
    }

    startTransition(async () => {
      const result = await submitOnboarding(token, payload);
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error ?? copy.genericError);
      }
    });
  }

  if (done) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden
          >
            <path
              d="M3.75 9.75l3.75 3.75 6.75-7.5"
              stroke="#49A0A4"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mb-3 text-xl font-semibold text-zinc-50">
          {copy.successTitle}
        </h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-500">
          {copy.successMessage}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-brand/25 bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
            {laneLabel}
          </span>
          <span className="text-[11px] text-zinc-600">{copy.briefLabel}</span>
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-50">
          {copy.welcomePrefix}, {firstName}.
        </h1>
        <p className="text-sm leading-relaxed text-zinc-500">
          {copy.introPrefix} <span className="text-zinc-300">{companyName}</span>.{" "}
          {copy.introDetail} {copy.requiredFieldsLine}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {fields.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={field.key}
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600"
            >
              {field.label}
              {field.required && (
                <span className="ml-1 text-brand/80">*</span>
              )}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={field.key}
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                rows={4}
                placeholder={field.placeholder}
                className="w-full resize-none rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 py-3 text-sm leading-relaxed text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
              />
            ) : (
              <input
                id={field.key}
                type="text"
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-10 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3.5 text-sm text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
              />
            )}
          </div>
        ))}

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-brand/90 disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? copy.submitPending : copy.submitIdle}
          </button>
          <p className="text-xs text-zinc-700">
            {copy.submittedLine}
          </p>
        </div>
      </form>
    </div>
  );
}
