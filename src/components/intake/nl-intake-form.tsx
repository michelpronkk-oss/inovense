"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitIntake } from "@/app/intake/actions";
import { nlIntakeSchema, type NlIntakeFormData } from "@/app/nl/intake/nl-schema";

/* ─── Select wrapper ────────────────────────────────────────────────────── */

function FormSelect({
  id,
  placeholder,
  error,
  children,
  ...props
}: React.ComponentProps<"select"> & {
  id: string;
  placeholder: string;
  error?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={error}
        className={cn(
          "h-10 w-full appearance-none rounded-xl border bg-input/30 px-3 pr-9 text-sm outline-none transition-colors",
          "focus:ring-[3px] focus:ring-ring/50",
          error
            ? "border-destructive focus:border-destructive text-foreground"
            : "border-input focus:border-ring text-foreground",
          "[&>option]:bg-zinc-900 [&>option]:text-zinc-100"
        )}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {children}
      </select>
      <div
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
      >
        <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
          <path
            d="M1 1l5 5 5-5"
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

/* ─── Field label + error message ──────────────────────────────────────── */

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-destructive">{message}</p>;
}

function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-medium text-zinc-300"
    >
      {children}
      {optional && (
        <span className="ml-1.5 text-xs font-normal text-zinc-600">
          optioneel
        </span>
      )}
    </label>
  );
}

/* ─── Section divider ───────────────────────────────────────────────────── */

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 pb-2 pt-2">
      <div className="h-px flex-1 bg-zinc-800" />
      <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        {label}
      </span>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

/* ─── Success state ─────────────────────────────────────────────────────── */

function SuccessState({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">

      {/* Icon */}
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M3.5 10.5l4.5 4.5 8.5-9"
            stroke="#49A0A4"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Label */}
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-brand">
        Brief ontvangen
      </p>

      {/* Heading */}
      <h2 className="mb-5 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
        We nemen snel contact op.
      </h2>

      {/* Body */}
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
        Je brief is ontvangen door het Inovense team. Verwacht een reactie op{" "}
        <span className="text-zinc-200">{email}</span> binnen 24 uur. We komen
        terug met een duidelijke richting, geen pitch deck.
      </p>

      {/* Divider */}
      <div className="my-10 flex w-full max-w-xs items-center gap-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">
          Terwijl je wacht
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Trust items */}
      <ul className="mb-10 space-y-2.5 text-left">
        {[
          "Check je inbox. Ons e-mailadres is hello@inovense.com.",
          "We beoordelen elke brief persoonlijk voor we reageren.",
          "Geen geautomatiseerde follow-ups. Een echte reactie binnen 24 uur.",
        ].map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-zinc-500">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/50" />
            {item}
          </li>
        ))}
      </ul>

      {/* Action */}
      <Button
        asChild
        variant="outline"
        className="rounded-full border-zinc-700 bg-transparent px-8 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-50"
      >
        <Link href="/nl">Terug naar home</Link>
      </Button>

    </div>
  );
}

/* ─── Main form ─────────────────────────────────────────────────────────── */

export default function NlIntakeForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NlIntakeFormData>({
    resolver: standardSchemaResolver(nlIntakeSchema),
    defaultValues: {
      serviceLane: undefined,
      projectType: undefined,
      budget: undefined,
      timeline: undefined,
    },
  });

  async function onSubmit(data: NlIntakeFormData) {
    setStatus("loading");
    setServerError(null);

    const result = await submitIntake(data);

    if (result.success) {
      setSubmittedEmail(data.email);
      setStatus("success");
    } else {
      setServerError(result.error ?? "Er is iets misgegaan. Probeer het opnieuw.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return <SuccessState email={submittedEmail} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">

      {/* ── Over jou ── */}
      <div>
        <SectionDivider label="Over jou" />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">

          <div>
            <FieldLabel htmlFor="fullName">Volledige naam</FieldLabel>
            <Input
              id="fullName"
              placeholder="Jan de Vries"
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              {...register("fullName")}
            />
            <FieldError message={errors.fullName?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="company">Bedrijfsnaam</FieldLabel>
            <Input
              id="company"
              placeholder="Jouw Bedrijf B.V."
              autoComplete="organization"
              aria-invalid={!!errors.company}
              {...register("company")}
            />
            <FieldError message={errors.company?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="email">Zakelijk e-mailadres</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="jan@bedrijf.nl"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="website" optional>
              Website of social link
            </FieldLabel>
            <Input
              id="website"
              type="url"
              placeholder="https://jouwsite.nl"
              autoComplete="url"
              {...register("website")}
            />
          </div>

        </div>
      </div>

      {/* ── Jouw project ── */}
      <div>
        <SectionDivider label="Jouw project" />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">

          <div>
            <FieldLabel htmlFor="serviceLane">Service</FieldLabel>
            <FormSelect
              id="serviceLane"
              placeholder="Kies een service"
              error={!!errors.serviceLane}
              {...register("serviceLane")}
            >
              <option value="Build">Build</option>
              <option value="Systems">Systems</option>
              <option value="Growth">Growth</option>
              <option value="Not sure yet">Weet ik nog niet</option>
            </FormSelect>
            <FieldError message={errors.serviceLane?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="projectType">Projecttype</FieldLabel>
            <FormSelect
              id="projectType"
              placeholder="Kies een type"
              error={!!errors.projectType}
              {...register("projectType")}
            >
              <option value="Website">Website</option>
              <option value="Landing page">Landingspagina</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Microsite">Microsite</option>
              <option value="Digital product">Digitaal product</option>
              <option value="Automation">Automatisering</option>
              <option value="Internal system">Intern systeem</option>
              <option value="Growth support">Groeiopdrach</option>
              <option value="Other">Anders</option>
            </FormSelect>
            <FieldError message={errors.projectType?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="budget">Budgetrange</FieldLabel>
            <FormSelect
              id="budget"
              placeholder="Kies een range"
              error={!!errors.budget}
              {...register("budget")}
            >
              <option value="Under €1,500">Onder €1.500</option>
              <option value="€1,500-€3,500">€1.500 - €3.500</option>
              <option value="€3,500-€7,500">€3.500 - €7.500</option>
              <option value="€7,500-€15,000">€7.500 - €15.000</option>
              <option value="€15,000+">€15.000+</option>
            </FormSelect>
            <FieldError message={errors.budget?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="timeline">Tijdlijn</FieldLabel>
            <FormSelect
              id="timeline"
              placeholder="Kies een tijdlijn"
              error={!!errors.timeline}
              {...register("timeline")}
            >
              <option value="ASAP">Zo snel mogelijk</option>
              <option value="Within 2 weeks">Binnen 2 weken</option>
              <option value="Within 1 month">Binnen 1 maand</option>
              <option value="Within 2-3 months">Binnen 2-3 maanden</option>
              <option value="Flexible">Flexibel</option>
            </FormSelect>
            <FieldError message={errors.timeline?.message} />
          </div>

        </div>
      </div>

      {/* ── Project brief ── */}
      <div>
        <SectionDivider label="Project brief" />
        <div className="mt-6">
          <FieldLabel htmlFor="details">Vertel ons over je project</FieldLabel>
          <Textarea
            id="details"
            placeholder="Wat bouw je, voor wie is het, en hoe ziet een goed resultaat eruit? Hoe meer context je ons geeft, hoe beter we kunnen reageren."
            rows={6}
            aria-invalid={!!errors.details}
            className="resize-none"
            {...register("details")}
          />
          <FieldError message={errors.details?.message} />
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
        <Button
          type="submit"
          disabled={status === "loading"}
          size="lg"
          className="rounded-full bg-brand px-10 text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {status === "loading" ? "Versturen..." : "Brief versturen"}
        </Button>

        <p className="text-xs text-zinc-600">
          We reageren binnen 24 uur. Geen pitch decks, geen templates.
        </p>
      </div>

      {/* Server error */}
      {status === "error" && serverError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </p>
      )}

    </form>
  );
}
