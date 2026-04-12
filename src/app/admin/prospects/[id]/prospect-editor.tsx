"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  PROSPECT_CONTACT_CHANNEL_OPTIONS,
  PROSPECT_LANGUAGE_OPTIONS,
  PROSPECT_LANE_OPTIONS,
  PROSPECT_SOURCE_OPTIONS,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_CONFIG,
} from "@/app/admin/config";
import type { Prospect } from "@/lib/supabase-server";
import {
  convertProspectToLead,
  markProspectContacted,
  updateProspect,
  type ProspectUpdateInput,
} from "../actions";
import SnippetLibrary from "../snippet-library";

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

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return normalized.toISOString().slice(0, 16);
}

function toActionInput(prospect: Prospect): ProspectUpdateInput {
  return {
    company_name: prospect.company_name,
    website_url: prospect.website_url ?? "",
    contact_name: prospect.contact_name ?? "",
    contact_channel: prospect.contact_channel,
    contact_value: prospect.contact_value ?? "",
    country_code: prospect.country_code ?? "",
    outreach_language: prospect.outreach_language,
    lane_fit: prospect.lane_fit,
    status: prospect.status,
    source: prospect.source,
    notes: prospect.notes ?? "",
    opening_angle: prospect.opening_angle ?? "",
    last_contact_at: toDateTimeLocal(prospect.last_contact_at),
    next_follow_up_at: toDateTimeLocal(prospect.next_follow_up_at),
  };
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return format(parsed, "MMM d, yyyy HH:mm");
}

export default function ProspectEditor({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const [fields, setFields] = useState<ProspectUpdateInput>(() => toActionInput(prospect));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusMeta = PROSPECT_STATUS_CONFIG[fields.status];

  const snippetLane =
    fields.lane_fit === "build" || fields.lane_fit === "systems" || fields.lane_fit === "growth"
      ? fields.lane_fit
      : "all";

  const snippetDescriptor = useMemo(() => {
    if (snippetLane === "all") return "all lanes";
    return (
      PROSPECT_LANE_OPTIONS.find((option) => option.value === snippetLane)?.label ??
      "all lanes"
    );
  }, [snippetLane]);

  function set<K extends keyof ProspectUpdateInput>(key: K, value: ProspectUpdateInput[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();

    startTransition(async () => {
      const result = await updateProspect(prospect.id, fields);
      if (!result.success) {
        setError(result.error ?? "Failed to update prospect.");
        return;
      }

      setSuccess("Prospect updated.");
      router.refresh();
    });
  }

  function handleMarkContacted() {
    clearMessages();

    startTransition(async () => {
      const result = await markProspectContacted(prospect.id);
      if (!result.success) {
        setError(result.error ?? "Failed to mark contacted.");
        return;
      }

      const nowIso = new Date().toISOString();
      setFields((prev) => ({
        ...prev,
        status: "contacted",
        last_contact_at: toDateTimeLocal(nowIso),
      }));
      setSuccess("Prospect marked as contacted.");
      router.refresh();
    });
  }

  function handleConvert() {
    clearMessages();

    startTransition(async () => {
      const result = await convertProspectToLead(prospect.id);
      if (!result.success) {
        setError(result.error ?? "Failed to convert prospect.");
        return;
      }

      if (result.id) {
        router.push(`/admin/leads/${result.id}`);
        return;
      }

      router.refresh();
      setSuccess("Prospect converted.");
    });
  }

  return (
    <div>
      <div className="mb-6">
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

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">{prospect.company_name}</h1>
            <p className="mt-1 text-sm text-zinc-500">Created {formatDate(prospect.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusMeta.color}`}
            >
              {statusMeta.label}
            </span>
            {prospect.converted_lead_id ? (
              <Link
                href={`/admin/leads/${prospect.converted_lead_id}`}
                className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 transition-colors hover:border-emerald-400/45 hover:text-emerald-200"
              >
                Converted lead
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form onSubmit={handleSave} className="flex flex-col gap-4 lg:col-span-2">
          <SectionCard title="Company and contact">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label required>Company name</Label>
                <input
                  type="text"
                  className={inputCls}
                  value={fields.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                />
              </div>
              <div>
                <Label>Website</Label>
                <input
                  type="text"
                  className={inputCls}
                  value={fields.website_url}
                  onChange={(e) => set("website_url", e.target.value)}
                />
              </div>
              <div>
                <Label>Contact name</Label>
                <input
                  type="text"
                  className={inputCls}
                  value={fields.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </div>
              <div>
                <Label>Contact value</Label>
                <input
                  type="text"
                  className={inputCls}
                  value={fields.contact_value}
                  onChange={(e) => set("contact_value", e.target.value)}
                />
              </div>
              <div>
                <Label>Contact channel</Label>
                <SelectWrapper>
                  <select
                    className={selectCls}
                    value={fields.contact_channel}
                    onChange={(e) =>
                      set("contact_channel", e.target.value as ProspectUpdateInput["contact_channel"])
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
                <Label>Country code</Label>
                <input
                  type="text"
                  maxLength={2}
                  className={inputCls}
                  value={fields.country_code}
                  onChange={(e) => set("country_code", e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Outreach setup">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label>Language</Label>
                <SelectWrapper>
                  <select
                    className={selectCls}
                    value={fields.outreach_language}
                    onChange={(e) =>
                      set(
                        "outreach_language",
                        e.target.value as ProspectUpdateInput["outreach_language"]
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
                <Label>Lane fit</Label>
                <SelectWrapper>
                  <select
                    className={selectCls}
                    value={fields.lane_fit}
                    onChange={(e) =>
                      set("lane_fit", e.target.value as ProspectUpdateInput["lane_fit"])
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
                <Label>Status</Label>
                <SelectWrapper>
                  <select
                    className={selectCls}
                    value={fields.status}
                    onChange={(e) => set("status", e.target.value as ProspectUpdateInput["status"])}
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
                <Label>Source</Label>
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

              <div>
                <Label>Last contact</Label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={fields.last_contact_at}
                  onChange={(e) => set("last_contact_at", e.target.value)}
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
            </div>

            <div>
              <Label>Opening angle</Label>
              <textarea
                rows={4}
                className={`${inputCls} resize-none`}
                value={fields.opening_angle}
                onChange={(e) => set("opening_angle", e.target.value)}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                rows={6}
                className={`${inputCls} resize-none`}
                value={fields.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              {!error && success ? <p className="text-sm text-emerald-400">{success}</p> : null}
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg border border-brand/30 bg-brand/10 px-5 py-2 text-sm font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/15 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>

        <aside className="flex flex-col gap-4">
          <SectionCard title="Actions">
            <div className="space-y-2">
              <button
                type="button"
                disabled={isPending || fields.status === "converted_to_lead"}
                onClick={handleMarkContacted}
                className="w-full rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/15 disabled:opacity-50"
              >
                Mark contacted
              </button>
              <button
                type="button"
                disabled={isPending || fields.status === "converted_to_lead"}
                onClick={handleConvert}
                className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/15 disabled:opacity-50"
              >
                Convert to lead
              </button>
              {prospect.converted_lead_id ? (
                <Link
                  href={`/admin/leads/${prospect.converted_lead_id}`}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-700/70 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                >
                  Open converted lead
                </Link>
              ) : null}
            </div>

            <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/45 p-3 text-xs text-zinc-500">
              <p>
                Last contact: <span className="text-zinc-300">{formatDate(prospect.last_contact_at)}</span>
              </p>
              <p className="mt-1">
                Next follow-up: <span className="text-zinc-300">{formatDate(prospect.next_follow_up_at)}</span>
              </p>
              <p className="mt-2 text-zinc-600">
                Conversion is explicit. Prospects do not count as leads until converted.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Snippet support">
            <p className="text-xs leading-relaxed text-zinc-500">
              Internal copy support only. No auto-send. Showing {fields.outreach_language.toUpperCase()} snippets for {snippetDescriptor}.
            </p>
            <SnippetLibrary language={fields.outreach_language} lane={snippetLane} />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
