"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createManualLead } from "./actions";
import { ALL_LANES, LEAD_SOURCE_OPTIONS } from "@/app/admin/config";

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-700 outline-none transition focus:border-zinc-600 focus:ring-0 sm:text-sm";

const selectCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-base text-zinc-100 outline-none transition focus:border-zinc-600 focus:ring-0 appearance-none sm:text-sm";

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
      {children}
      {required && <span className="ml-1 text-brand/70">*</span>}
    </p>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
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

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-5 py-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
          {title}
        </h2>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </div>
  );
}

export default function NewLeadForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    full_name: "",
    company_name: "",
    work_email: "",
    website_or_social: "",
    service_lane: "",
    project_type: "",
    budget_range: "",
    timeline: "",
    project_details: "",
    lead_source: "",
  });

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createManualLead(fields);
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.push(`/admin/leads/${result.id}`);
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <Link
          href="/admin/leads"
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to leads
        </Link>
        <h1 className="text-xl font-semibold text-zinc-50">Add lead</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manually create a lead from a referral, DM, call, or outbound contact.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Left: contact + source */}
          <div className="flex flex-col gap-4 lg:col-span-1">

            <SectionCard title="Contact">
              <div>
                <Label required>Full name</Label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Jane Smith"
                  value={fields.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label required>Company</Label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Acme Ltd"
                  value={fields.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label required>Work email</Label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="jane@acme.com"
                  value={fields.work_email}
                  onChange={(e) => set("work_email", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Website or social</Label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="acme.com or @handle"
                  value={fields.website_or_social}
                  onChange={(e) => set("website_or_social", e.target.value)}
                  autoComplete="off"
                />
              </div>
            </SectionCard>

            <SectionCard title="Source">
              <div>
                <Label required>Lead source</Label>
                <SelectWrapper>
                  <select
                    className={selectCls}
                    value={fields.lead_source}
                    onChange={(e) => set("lead_source", e.target.value)}
                  >
                    <option value="">Select source</option>
                    {LEAD_SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
            </SectionCard>

          </div>

          {/* Right: project details */}
          <div className="flex flex-col gap-4 lg:col-span-2">

            <SectionCard title="Project">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label required>Service lane</Label>
                  <SelectWrapper>
                    <select
                      className={selectCls}
                      value={fields.service_lane}
                      onChange={(e) => set("service_lane", e.target.value)}
                    >
                      <option value="">Select lane</option>
                      {ALL_LANES.map((lane) => (
                        <option key={lane} value={lane}>
                          {lane}
                        </option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <Label>Project type</Label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Landing page"
                    value={fields.project_type}
                    onChange={(e) => set("project_type", e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>Budget range</Label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. 5-10k"
                    value={fields.budget_range}
                    onChange={(e) => set("budget_range", e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label>Timeline</Label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. 4-6 weeks"
                    value={fields.timeline}
                    onChange={(e) => set("timeline", e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Brief">
              <div>
                <Label>Project details</Label>
                <textarea
                  rows={6}
                  className={`${inputCls} resize-none`}
                  placeholder="Notes on what they need, goals, context from the conversation..."
                  value={fields.project_details}
                  onChange={(e) => set("project_details", e.target.value)}
                />
              </div>
            </SectionCard>

          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <p className="text-xs text-zinc-700">
              Fields marked <span className="text-brand/70">*</span> are required.
              The lead will be created with status <span className="text-zinc-500">New</span>.
            </p>
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/admin/leads"
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg border border-brand/30 bg-brand/10 px-5 py-2 text-sm font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/15 disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create lead"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
