
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import {
  createSupabaseServerClient,
  type Prospect,
  type ProspectStatus,
  type ProspectLaneFit,
  type ProspectOutreachLanguage,
} from "@/lib/supabase-server";
import {
  PROSPECT_STATUS_CONFIG,
  PROSPECT_LANE_OPTIONS,
  PROSPECT_LANGUAGE_OPTIONS,
  PROSPECT_SOURCE_OPTIONS,
} from "@/app/admin/config";
import ProspectsFilter from "./prospects-filter";
import SnippetLibrary from "./snippet-library";
import GenerateForm from "./generate-form";
import {
  markProspectContactedFromList,
  updateProspectStatusFromList,
} from "./actions";

export const metadata: Metadata = { title: "Prospects | Inovense CRM" };
export const dynamic = "force-dynamic";

type FollowUpFilter = "today" | "overdue" | "next_7d" | "none";

type StageKey =
  | "new"
  | "reviewed"
  | "shortlisted"
  | "outreach_ready"
  | "contacted"
  | "replied"
  | "converted";

const QUEUE_STATUSES: ProspectStatus[] = [
  "new",
  "researched",
  "ready_to_contact",
  "qualified",
  "not_fit",
];

const OUTREACH_STATUSES: ProspectStatus[] = [
  "ready_to_contact",
  "contacted",
  "replied",
  "qualified",
];

function laneLabel(lane: ProspectLaneFit): string {
  return (
    PROSPECT_LANE_OPTIONS.find((opt) => opt.value === lane)?.label ?? "Uncertain"
  );
}

function laneLabelForSnippet(lane: ProspectLaneFit | "all"): string {
  if (lane === "all") return "all lanes";
  return laneLabel(lane);
}

function languageLabel(language: ProspectOutreachLanguage): string {
  return (
    PROSPECT_LANGUAGE_OPTIONS.find((opt) => opt.value === language)?.label ??
    language.toUpperCase()
  );
}

function normalizeFollowUpFilter(value: string | undefined): FollowUpFilter | null {
  if (value === "today") return "today";
  if (value === "overdue") return "overdue";
  if (value === "next_7d") return "next_7d";
  if (value === "none") return "none";
  return null;
}

function parseStatusFilter(value: string | undefined): ProspectStatus | null {
  if (!value) return null;
  const allowed: ProspectStatus[] = [
    "new",
    "researched",
    "ready_to_contact",
    "contacted",
    "replied",
    "qualified",
    "converted_to_lead",
    "not_fit",
  ];
  return allowed.includes(value as ProspectStatus) ? (value as ProspectStatus) : null;
}

function parseLanguageFilter(
  value: string | undefined
): ProspectOutreachLanguage | null {
  if (value === "en" || value === "nl") return value;
  return null;
}

function parseLaneFilter(value: string | undefined): ProspectLaneFit | null {
  const allowed: ProspectLaneFit[] = ["build", "systems", "growth", "uncertain"];
  return allowed.includes(value as ProspectLaneFit)
    ? (value as ProspectLaneFit)
    : null;
}

function matchesFollowUpFilter(
  nextFollowUpAt: string | null,
  filter: FollowUpFilter | null
): boolean {
  if (!filter) return true;
  if (!nextFollowUpAt) return filter === "none";
  if (filter === "none") return false;

  const now = new Date();
  const due = new Date(nextFollowUpAt);
  if (Number.isNaN(due.getTime())) return false;

  if (filter === "overdue") {
    return due.getTime() < now.getTime();
  }

  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  if (filter === "today") {
    return due >= startToday && due < endToday;
  }

  const nextSeven = new Date(now);
  nextSeven.setDate(nextSeven.getDate() + 7);
  return due >= now && due <= nextSeven;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return format(parsed, "MMM d, yyyy HH:mm");
}

function fitSignalsForProspect(prospect: Prospect): string[] {
  const signals: string[] = [];
  if (prospect.website_url) signals.push("website");
  if (prospect.contact_value) signals.push("contact route");
  if (prospect.opening_angle) signals.push("opening angle");
  if (prospect.notes) signals.push("research notes");
  if (prospect.next_follow_up_at) signals.push("follow-up scheduled");
  return signals;
}

function statusCount(prospects: Prospect[], status: ProspectStatus): number {
  return prospects.filter((prospect) => prospect.status === status).length;
}

function stageCount(prospects: Prospect[], stage: StageKey): number {
  if (stage === "new") return statusCount(prospects, "new");
  if (stage === "reviewed") return statusCount(prospects, "researched");
  if (stage === "shortlisted") return statusCount(prospects, "qualified");
  if (stage === "outreach_ready") return statusCount(prospects, "ready_to_contact");
  if (stage === "contacted") return statusCount(prospects, "contacted");
  if (stage === "replied") return statusCount(prospects, "replied");
  return statusCount(prospects, "converted_to_lead");
}

function queuePrimaryAction(prospect: Prospect) {
  if (prospect.status === "new") {
    return {
      label: "Mark reviewed",
      toStatus: "researched" as ProspectStatus,
      style:
        "border-brand/30 bg-brand/10 text-brand hover:border-brand/50 hover:bg-brand/15",
    };
  }

  if (prospect.status === "researched") {
    return {
      label: "Shortlist",
      toStatus: "ready_to_contact" as ProspectStatus,
      style:
        "border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/45 hover:bg-emerald-500/15",
    };
  }

  if (prospect.status === "not_fit") {
    return {
      label: "Re-open",
      toStatus: "researched" as ProspectStatus,
      style:
        "border-zinc-700/80 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100",
    };
  }

  return null;
}

function outreachPrimaryAction(prospect: Prospect) {
  if (prospect.status === "ready_to_contact") {
    return { type: "contact" as const, label: "Mark touched" };
  }

  if (prospect.status === "contacted") {
    return {
      type: "status" as const,
      label: "Mark replied",
      toStatus: "replied" as ProspectStatus,
    };
  }

  if (prospect.status === "replied") {
    return {
      type: "status" as const,
      label: "Mark qualified",
      toStatus: "qualified" as ProspectStatus,
    };
  }

  return null;
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { status, language, lane, follow_up } = await searchParams;
  const followUpFilter = normalizeFollowUpFilter(follow_up);
  const statusFilter = parseStatusFilter(status);
  const languageFilter = parseLanguageFilter(language);
  const laneFilter = parseLaneFilter(lane);

  let prospects: Prospect[] = [];
  let error: string | null = null;

  try {
    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("prospects")
      .select("*")
      .order("updated_at", { ascending: false });

    if (statusFilter) query = query.eq("status", statusFilter);
    if (languageFilter) query = query.eq("outreach_language", languageFilter);
    if (laneFilter) query = query.eq("lane_fit", laneFilter);

    const { data, error: sbError } = await query;
    if (sbError) throw sbError;
    prospects = (data ?? []) as Prospect[];
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load prospects.";
  }

  const filteredProspects = prospects.filter((prospect) =>
    matchesFollowUpFilter(prospect.next_follow_up_at, followUpFilter)
  );

  const queueProspects = filteredProspects.filter((prospect) =>
    QUEUE_STATUSES.includes(prospect.status)
  );
  const outreachProspects = filteredProspects.filter((prospect) =>
    OUTREACH_STATUSES.includes(prospect.status)
  );
  const convertedCount = statusCount(filteredProspects, "converted_to_lead");
  const qualifiedCount = statusCount(filteredProspects, "qualified");

  const dueTodayCount = filteredProspects.filter((prospect) =>
    matchesFollowUpFilter(prospect.next_follow_up_at, "today")
  ).length;
  const overdueCount = filteredProspects.filter((prospect) =>
    matchesFollowUpFilter(prospect.next_follow_up_at, "overdue")
  ).length;
  const unscheduledCount = filteredProspects.filter(
    (prospect) => !prospect.next_follow_up_at && prospect.status !== "converted_to_lead"
  ).length;

  const hasFilters = Boolean(status || language || lane || follow_up);

  const snippetLanguage = language === "nl" ? "nl" : "en";
  const snippetLane =
    lane === "build" || lane === "systems" || lane === "growth" || lane === "uncertain"
      ? lane
      : "all";
  const snippetLaneInput = snippetLane === "uncertain" ? "all" : snippetLane;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Prospects</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Operator workspace for the outbound top of funnel: generate, queue, and outreach progression.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense>
            <ProspectsFilter />
          </Suspense>
          <Link
            href="/admin/prospects/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-3 text-xs font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add prospect
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-7">
        <MetricCard label="New" value={String(stageCount(filteredProspects, "new"))} sub="Generated" />
        <MetricCard label="Reviewed" value={String(stageCount(filteredProspects, "reviewed"))} sub="Research pass" />
        <MetricCard label="Shortlisted" value={String(stageCount(filteredProspects, "shortlisted"))} sub="High fit" />
        <MetricCard
          label="Outreach ready"
          value={String(stageCount(filteredProspects, "outreach_ready"))}
          sub="Ready to touch"
        />
        <MetricCard label="Contacted" value={String(stageCount(filteredProspects, "contacted"))} sub="First touch sent" />
        <MetricCard label="Replied" value={String(stageCount(filteredProspects, "replied"))} sub="Conversation open" />
        <MetricCard label="Converted" value={String(stageCount(filteredProspects, "converted"))} sub="Moved to lead" />
      </div>

      {(overdueCount > 0 || unscheduledCount > 0) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {overdueCount > 0 && (
            <p>
              {overdueCount} prospect{overdueCount !== 1 ? "s are" : " is"} overdue for follow-up.
            </p>
          )}
          {unscheduledCount > 0 && (
            <p className={overdueCount > 0 ? "mt-1" : ""}>
              {unscheduledCount} active prospect{unscheduledCount !== 1 ? "s have" : " has"} no next touch scheduled.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">Generate</p>
            <h2 className="mt-1 text-sm font-medium text-zinc-100">Queue generation brief</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Define target market inputs first, then create prospects against that brief.
            </p>
          </div>
          <p className="text-[10px] text-zinc-700">Commercial setup first, tooling second.</p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <GenerateForm sourceOptions={PROSPECT_SOURCE_OPTIONS.map((option) => ({ ...option }))} />

          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Generation notes
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-zinc-500">
              <li>Keep each brief tied to one lane and one language.</li>
              <li>Target volume should be realistic for same-day review.</li>
              <li>Use source labels to preserve pipeline attribution.</li>
            </ul>
            <Link
              href="/admin/prospects/new"
              className="mt-3 inline-flex text-[11px] text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Open manual capture
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">Queue</p>
            <h2 className="mt-1 text-sm font-medium text-zinc-100">Review and shortlist</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Review fit signals quickly, then move prospects to shortlist or reject.
            </p>
          </div>
          <p className="text-[11px] text-zinc-600">
            {queueProspects.length} in queue · {qualifiedCount} qualified · {dueTodayCount} due today
          </p>
        </div>

        {queueProspects.length === 0 && !error ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-12 text-center">
            <p className="text-sm text-zinc-600">
              {hasFilters
                ? "No queue prospects match current filters."
                : "Queue is clear. Generate or add new prospects to continue."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/70">
                    {["Company", "Fit signals", "Lane and source", "Status", "Actions"].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {queueProspects.map((prospect) => {
                    const primaryAction = queuePrimaryAction(prospect);
                    const signals = fitSignalsForProspect(prospect);
                    return (
                      <tr key={prospect.id} className="transition-colors hover:bg-zinc-800/20">
                        <td className="px-4 py-4">
                          <div className="min-w-[240px]">
                            <Link
                              href={`/admin/prospects/${prospect.id}`}
                              className="font-medium text-zinc-200 transition-colors hover:text-brand"
                            >
                              {prospect.company_name}
                            </Link>
                            <p className="mt-0.5 text-xs text-zinc-600">
                              {prospect.website_url ?? "No website captured"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {signals.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {signals.map((signal) => (
                                <span
                                  key={`${prospect.id}-${signal}`}
                                  className="inline-flex items-center rounded-full border border-zinc-700/70 bg-zinc-900/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-500"
                                >
                                  {signal}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700">No signals yet</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-500">
                          <p>{laneLabel(prospect.lane_fit)}</p>
                          <p className="mt-1 text-zinc-600">
                            {languageLabel(prospect.outreach_language)} · {prospect.source}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                              PROSPECT_STATUS_CONFIG[prospect.status].color
                            }`}
                          >
                            {PROSPECT_STATUS_CONFIG[prospect.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/prospects/${prospect.id}`}
                              className="inline-flex items-center rounded-md border border-zinc-700/70 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                            >
                              Open
                            </Link>
                            {primaryAction ? (
                              <form action={updateProspectStatusFromList.bind(null, prospect.id, primaryAction.toStatus)}>
                                <button
                                  type="submit"
                                  className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors ${primaryAction.style}`}
                                >
                                  {primaryAction.label}
                                </button>
                              </form>
                            ) : null}
                            {prospect.status !== "not_fit" && prospect.status !== "converted_to_lead" && (
                              <form action={updateProspectStatusFromList.bind(null, prospect.id, "not_fit")}>
                                <button
                                  type="submit"
                                  className="inline-flex items-center rounded-md border border-zinc-700/80 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
                                >
                                  Reject
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-800/40 md:hidden">
              {queueProspects.map((prospect) => {
                const signals = fitSignalsForProspect(prospect);
                return (
                  <article key={prospect.id} className="space-y-2 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/prospects/${prospect.id}`}
                          className="font-medium text-zinc-200 transition-colors hover:text-brand"
                        >
                          {prospect.company_name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-zinc-600">
                          {prospect.website_url ?? "No website captured"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          PROSPECT_STATUS_CONFIG[prospect.status].color
                        }`}
                      >
                        {PROSPECT_STATUS_CONFIG[prospect.status].label}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      {laneLabel(prospect.lane_fit)} · {languageLabel(prospect.outreach_language)}
                    </p>
                    {signals.length > 0 && (
                      <p className="text-[11px] text-zinc-500">Signals: {signals.join(", ")}</p>
                    )}
                    <Link
                      href={`/admin/prospects/${prospect.id}`}
                      className="inline-flex items-center rounded-md border border-zinc-700/70 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                    >
                      Open
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">Outreach</p>
            <h2 className="mt-1 text-sm font-medium text-zinc-100">Execute and follow up</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Keep next touch clear, log response progression, and convert qualified prospects into leads.
            </p>
          </div>
          <p className="text-[11px] text-zinc-600">
            {outreachProspects.length} outreach-active · {convertedCount} converted to lead
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            {outreachProspects.length === 0 && !error ? (
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-12 text-center">
                <p className="text-sm text-zinc-600">
                  {hasFilters
                    ? "No outreach prospects match current filters."
                    : "No outreach queue yet. Promote shortlisted prospects to outreach-ready first."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-zinc-800/80">
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800/80 bg-zinc-900/70">
                        {["Company", "Channel", "Last touch", "Next touch", "Status", "Actions"].map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {outreachProspects.map((prospect) => {
                        const primaryAction = outreachPrimaryAction(prospect);
                        return (
                          <tr key={prospect.id} className="transition-colors hover:bg-zinc-800/20">
                            <td className="px-4 py-4">
                              <div className="min-w-[220px]">
                                <Link
                                  href={`/admin/prospects/${prospect.id}`}
                                  className="font-medium text-zinc-200 transition-colors hover:text-brand"
                                >
                                  {prospect.company_name}
                                </Link>
                                <p className="mt-0.5 text-xs text-zinc-600">
                                  {prospect.contact_name ?? "No contact name"}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-zinc-500">
                              <p>{prospect.contact_channel}</p>
                              <p className="mt-1 truncate text-zinc-600">
                                {prospect.contact_value ?? "No contact value"}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-xs tabular-nums text-zinc-500">
                              {formatDateTime(prospect.last_contact_at)}
                            </td>
                            <td className="px-4 py-4 text-xs tabular-nums text-zinc-500">
                              {formatDateTime(prospect.next_follow_up_at)}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                  PROSPECT_STATUS_CONFIG[prospect.status].color
                                }`}
                              >
                                {PROSPECT_STATUS_CONFIG[prospect.status].label}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/admin/prospects/${prospect.id}`}
                                  className="inline-flex items-center rounded-md border border-zinc-700/70 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                                >
                                  Open
                                </Link>
                                {primaryAction?.type === "contact" && (
                                  <form action={markProspectContactedFromList.bind(null, prospect.id)}>
                                    <button
                                      type="submit"
                                      className="inline-flex items-center rounded-md border border-brand/30 bg-brand/10 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
                                    >
                                      {primaryAction.label}
                                    </button>
                                  </form>
                                )}
                                {primaryAction?.type === "status" && (
                                  <form action={updateProspectStatusFromList.bind(null, prospect.id, primaryAction.toStatus)}>
                                    <button
                                      type="submit"
                                      className="inline-flex items-center rounded-md border border-brand/30 bg-brand/10 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
                                    >
                                      {primaryAction.label}
                                    </button>
                                  </form>
                                )}
                                {prospect.status === "qualified" && !prospect.converted_lead_id && (
                                  <Link
                                    href={`/admin/prospects/${prospect.id}`}
                                    className="inline-flex items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-emerald-300 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/15"
                                  >
                                    Convert to lead
                                  </Link>
                                )}
                                {prospect.converted_lead_id && (
                                  <Link
                                    href={`/admin/leads/${prospect.converted_lead_id}`}
                                    className="text-[10px] text-emerald-300 transition-colors hover:text-emerald-200"
                                  >
                                    View lead
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-zinc-800/40 md:hidden">
                  {outreachProspects.map((prospect) => (
                    <article key={prospect.id} className="space-y-2 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/prospects/${prospect.id}`}
                            className="font-medium text-zinc-200 transition-colors hover:text-brand"
                          >
                            {prospect.company_name}
                          </Link>
                          <p className="mt-0.5 truncate text-xs text-zinc-600">
                            {prospect.contact_name ?? prospect.contact_value ?? "No contact captured"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            PROSPECT_STATUS_CONFIG[prospect.status].color
                          }`}
                        >
                          {PROSPECT_STATUS_CONFIG[prospect.status].label}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600">
                        Last: {formatDateTime(prospect.last_contact_at)}
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        Next: {formatDateTime(prospect.next_follow_up_at)}
                      </p>
                      <Link
                        href={`/admin/prospects/${prospect.id}`}
                        className="inline-flex items-center rounded-md border border-zinc-700/70 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                      >
                        Open
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/35 p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                Outreach openers
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Internal copy support only. Keep messages short, human, and lane-specific.
              </p>
              <p className="mt-2 text-[10px] text-zinc-700">
                Showing {snippetLanguage.toUpperCase()} snippets for {laneLabelForSnippet(snippetLaneInput)}.
              </p>
            </div>
            <SnippetLibrary language={snippetLanguage} lane={snippetLaneInput} />
          </aside>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/35 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
        {label}
      </p>
      <p className="mt-1.5 text-base font-semibold tabular-nums text-zinc-100 sm:text-lg">{value}</p>
      <p className="mt-0.5 text-[10px] text-zinc-700">{sub}</p>
    </div>
  );
}
