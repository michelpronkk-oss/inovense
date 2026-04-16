"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PROSPECT_CONTACT_CHANNEL_OPTIONS,
  PROSPECT_LANGUAGE_OPTIONS,
  PROSPECT_LANE_OPTIONS,
  PROSPECT_SOURCE_OPTIONS,
  PROSPECT_STATUSES,
} from "@/app/admin/config";
import { createProspect, type ProspectCreateInput } from "../actions";

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-700 outline-none transition focus:border-zinc-600 focus:ring-0 sm:text-sm";

const selectCls =
  "w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-base text-zinc-100 outline-none transition focus:border-zinc-600 focus:ring-0 sm:text-sm";

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
      {required ? <span className="ml-1 text-brand/70">*</span> : null}
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

const INITIAL_FIELDS: ProspectCreateInput = {
  company_name: "",
  website_url: "",
  contact_name: "",
  contact_channel: "email",
  contact_value: "",
  country_code: "",
  outreach_language: "en",
  lane_fit: "uncertain",
  status: "new",
  source: "outbound",
  notes: "",
  opening_angle: "",
  next_follow_up_at: "",
};

export type ProspectGenerationSeed = {
  market?: string;
  niche?: string;
  location?: string;
  volume?: string;
  source?: string;
};

function normalizeSourceSeed(source?: string): ProspectCreateInput["source"] {
  const normalized = (source ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!normalized) return "outbound";
  const allowed = new Set([
    "outbound",
    "linkedin",
    "instagram",
    "referral",
    "website",
    "other",
  ]);
  return allowed.has(normalized) ? normalized : "outbound";
}

function buildSeedNotes(seed?: ProspectGenerationSeed): string {
  if (!seed) return "";

  const rows = [
    { label: "Market", value: seed.market },
    { label: "Niche", value: seed.niche },
    { label: "Location", value: seed.location },
    { label: "Volume target", value: seed.volume },
  ].filter((row) => Boolean((row.value ?? "").trim()));

  if (rows.length === 0) return "";

  return `Generation brief\n${rows
    .map((row) => `${row.label}: ${(row.value ?? "").trim()}`)
    .join("\n")}`;
}

export default function NewProspectForm({
  generationSeed,
}: {
  generationSeed?: ProspectGenerationSeed;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ProspectCreateInput>(() => ({
    ...INITIAL_FIELDS,
    source: normalizeSourceSeed(generationSeed?.source),
    notes: buildSeedNotes(generationSeed),
  }));

  function set<K extends keyof ProspectCreateInput>(key: K, value: ProspectCreateInput[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProspect(fields);
      if (!result.success) {
        setError(result.error ?? "Failed to create prospect.");
        return;
      }

      if (result.id) {
        router.push(`/admin/prospects/${result.id}`);
        return;
      }

      router.push("/admin/prospects");
    });
  }

  return (
    <div>
      <div className="mb-7">
        <Link
          href="/admin/prospects"
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
          Back to prospects
        </Link>
        <h1 className="text-xl font-semibold text-zinc-50">Add prospect</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Track an outbound target before it becomes a qualified CRM lead.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-1">
            <SectionCard title="Company">
              <div>
                <Label required>Company name</Label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Example Studio"
                  value={fields.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Website</Label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="example.com"
                  value={fields.website_url}
                  onChange={(e) => set("website_url", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Country code</Label>
                <input
                  type="text"
                  maxLength={2}
                  className={inputCls}
                  placeholder="NL"
                  value={fields.country_code}
                  onChange={(e) => set("country_code", e.target.value.toUpperCase())}
                  autoComplete="off"
                />
              </div>
            </SectionCard>

            <SectionCard title="Channel">
              <div>
                <Label>Contact name</Label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Alex"
                  value={fields.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label required>Contact channel</Label>
                <SelectWrapper>
                  <select
                    className={selectCls}
                    value={fields.contact_channel}
                    onChange={(e) =>
                      set("contact_channel", e.target.value as ProspectCreateInput["contact_channel"])
                    }
                  >
                    {PROSPECT_CONTACT_CHANNEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <Label>Contact value</Label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="name@company.com or profile URL"
                  value={fields.contact_value}
                  onChange={(e) => set("contact_value", e.target.value)}
                  autoComplete="off"
                />
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <SectionCard title="Outreach strategy">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label required>Language</Label>
                  <SelectWrapper>
                    <select
                      className={selectCls}
                      value={fields.outreach_language}
                      onChange={(e) =>
                        set(
                          "outreach_language",
                          e.target.value as ProspectCreateInput["outreach_language"]
                        )
                      }
                    >
                      {PROSPECT_LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <Label required>Lane fit</Label>
                  <SelectWrapper>
                    <select
                      className={selectCls}
                      value={fields.lane_fit}
                      onChange={(e) =>
                        set("lane_fit", e.target.value as ProspectCreateInput["lane_fit"])
                      }
                    >
                      {PROSPECT_LANE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <Label required>Status</Label>
                  <SelectWrapper>
                    <select
                      className={selectCls}
                      value={fields.status}
                      onChange={(e) => set("status", e.target.value as ProspectCreateInput["status"])}
                    >
                      {PROSPECT_STATUSES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>
                <div>
                  <Label required>Source</Label>
                  <SelectWrapper>
                    <select
                      className={selectCls}
                      value={fields.source}
                      onChange={(e) => set("source", e.target.value)}
                    >
                      {PROSPECT_SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>
              </div>

              <div>
                <Label>Opening angle</Label>
                <textarea
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder="Short strategic opener angle for first outreach touch."
                  value={fields.opening_angle}
                  onChange={(e) => set("opening_angle", e.target.value)}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <textarea
                  rows={5}
                  className={`${inputCls} resize-none`}
                  placeholder="Research notes, context, and qualification insights."
                  value={fields.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>

              <div>
                <Label>Next follow-up</Label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={fields.next_follow_up_at}
                  onChange={(e) => set("next_follow_up_at", e.target.value)}
                />
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <p className="text-xs text-zinc-700">
              Fields marked <span className="text-brand/70">*</span> are required.
              Prospect records are internal and not counted as leads until converted.
            </p>
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/admin/prospects"
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg border border-brand/30 bg-brand/10 px-5 py-2 text-sm font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/15 disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create prospect"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
