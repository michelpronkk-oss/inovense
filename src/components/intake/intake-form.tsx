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
import { intakeSchema, type IntakeFormData } from "@/app/intake/schema";
import { readStoredAttribution } from "@/lib/attribution";

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
          optional
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
        Brief received
      </p>

      {/* Heading */}
      <h2 className="mb-5 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
        We&apos;ll be in touch.
      </h2>

      {/* Body */}
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
        Your brief has been sent to the Inovense team. Expect a reply to{" "}
        <span className="text-zinc-200">{email}</span> within 24 hours.
        We&apos;ll come back with a clear direction, not a pitch deck.
      </p>

      {/* Divider */}
      <div className="my-10 flex w-full max-w-xs items-center gap-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">
          While you wait
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Trust items */}
      <ul className="mb-10 space-y-2.5 text-left">
        {[
          "Check your inbox. Ours comes from hello@inovense.com.",
          "We review every brief personally before responding.",
          "No automated follow-ups. One real reply, within 24 hours.",
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
        <Link href="/">Back to home</Link>
      </Button>

    </div>
  );
}

/* ─── Main form ─────────────────────────────────────────────────────────── */

export default function IntakeForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IntakeFormData>({
    resolver: standardSchemaResolver(intakeSchema),
    defaultValues: {
      serviceLane: "" as never,
      projectType: "" as never,
      budget: "" as never,
      timeline: "" as never,
    },
  });

  async function onSubmit(data: IntakeFormData) {
    setStatus("loading");
    setServerError(null);

    const attribution = readStoredAttribution();
    const result = await submitIntake(data, attribution);

    if (result.success) {
      setSubmittedEmail(data.email);
      setStatus("success");
    } else {
      setServerError(result.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return <SuccessState email={submittedEmail} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">

      {/* ── About you ── */}
      <div>
        <SectionDivider label="About you" />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">

          <div>
            <FieldLabel htmlFor="fullName">Full name</FieldLabel>
            <Input
              id="fullName"
              placeholder="Alex Johnson"
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              {...register("fullName")}
            />
            <FieldError message={errors.fullName?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="company">Company name</FieldLabel>
            <Input
              id="company"
              placeholder="Acme Inc."
              autoComplete="organization"
              aria-invalid={!!errors.company}
              {...register("company")}
            />
            <FieldError message={errors.company?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="email">Work email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="alex@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="website" optional>
              Website or social link
            </FieldLabel>
            <Input
              id="website"
              type="url"
              placeholder="https://yoursite.com"
              autoComplete="url"
              {...register("website")}
            />
          </div>

        </div>
      </div>

      {/* ── Your project ── */}
      <div>
        <SectionDivider label="Your project" />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">

          <div>
            <FieldLabel htmlFor="serviceLane">Service lane</FieldLabel>
            <FormSelect
              id="serviceLane"
              placeholder="Select a service"
              error={!!errors.serviceLane}
              {...register("serviceLane")}
            >
              <option value="Build">Build</option>
              <option value="Systems">Systems</option>
              <option value="Growth">Growth</option>
              <option value="Not sure yet">Not sure yet</option>
            </FormSelect>
            <FieldError message={errors.serviceLane?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="projectType">Project type</FieldLabel>
            <FormSelect
              id="projectType"
              placeholder="Select a project type"
              error={!!errors.projectType}
              {...register("projectType")}
            >
              <option value="Website">Website</option>
              <option value="Landing page">Landing page</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Microsite">Microsite</option>
              <option value="Digital product">Digital product</option>
              <option value="Automation">Automation</option>
              <option value="Internal system">Internal system</option>
              <option value="Growth support">Growth support</option>
              <option value="Other">Other</option>
            </FormSelect>
            <FieldError message={errors.projectType?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="budget">Budget range</FieldLabel>
            <FormSelect
              id="budget"
              placeholder="Select a budget range"
              error={!!errors.budget}
              {...register("budget")}
            >
              <option value="Under $5,000">Under $5,000</option>
              <option value="$5,000-$10,000">$5,000 - $10,000</option>
              <option value="$10,000-$20,000">$10,000 - $20,000</option>
              <option value="$20,000-$40,000">$20,000 - $40,000</option>
              <option value="$40,000+">$40,000+</option>
            </FormSelect>
            <FieldError message={errors.budget?.message} />
          </div>

          <div>
            <FieldLabel htmlFor="timeline">Timeline</FieldLabel>
            <FormSelect
              id="timeline"
              placeholder="Select a timeline"
              error={!!errors.timeline}
              {...register("timeline")}
            >
              <option value="ASAP">ASAP</option>
              <option value="Within 2 weeks">Within 2 weeks</option>
              <option value="Within 1 month">Within 1 month</option>
              <option value="Within 2-3 months">Within 2-3 months</option>
              <option value="Flexible">Flexible</option>
            </FormSelect>
            <FieldError message={errors.timeline?.message} />
          </div>

        </div>
      </div>

      {/* ── Project brief ── */}
      <div>
        <SectionDivider label="Project brief" />
        <div className="mt-6">
          <FieldLabel htmlFor="details">Tell us about your project</FieldLabel>
          <Textarea
            id="details"
            placeholder="What are you building, who is it for, and where does your current acquisition flow break down? The more context you share, the better our review."
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
          {status === "loading" ? "Sending..." : "Submit brief"}
        </Button>

        <p className="text-xs text-zinc-600">
          We respond within 24 hours. Clear fit assessment, no generic pitch deck.
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
