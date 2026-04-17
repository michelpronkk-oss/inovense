
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
import { fitSignalsFromProspect, type ProspectFitSignal } from "@/lib/prospects/quality";
import {
  PROSPECT_STATUS_CONFIG,
  PROSPECT_LANE_OPTIONS,
  PROSPECT_LANGUAGE_OPTIONS,
  PROSPECT_SOURCE_OPTIONS,
} from "@/app/admin/config";
import ProspectsFilter from "./prospects-filter";
import SnippetLibrary from "./snippet-library";
import GenerateForm from "./generate-form";
import DeleteProspectButton from "./delete-prospect-button";
import {
  markProspectDoNotContactFromList,
  markProspectContactedFromList,
  updateProspectStatusFromList,
} from "./actions";

export const metadata: Metadata = { title: "Prospects | Inovense CRM" };
export const dynamic = "force-dynamic";

type FollowUpFilter = "today" | "overdue" | "next_7d" | "none";

type QueueView =
  | "needs_review"
  | "ready"
  | "active"
  | "qualified"
  | "archive"
  | "all";

const STALE_REVIEW_DAYS = 7;

const OUTREACH_STATUSES: ProspectStatus[] = [
  "ready_to_contact",
  "contacted",
  "replied",
  "qualified",
];

const WEEKLY_ACTIVITY_EVENT_TYPES = [
  "prospect.generated",
  "prospect.reviewed",
  "prospect.ready_to_contact",
  "prospect.contacted",
  "prospect.replied",
  "prospect.qualified",
  "prospect.converted_to_lead",
] as const;

function laneLabel(lane: ProspectLaneFit): string {
  return (
    PROSPECT_LANE_OPTIONS.find((opt) => opt.value === lane)?.label ?? "Uncertain"
  );
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

function parseQueueView(value: string | undefined): QueueView {
  const allowed: QueueView[] = ["needs_review", "ready", "active", "qualified", "archive", "all"];
  return allowed.includes(value as QueueView) ? (value as QueueView) : "needs_review";
}

function isStaleReviewedProspect(prospect: Prospect): boolean {
  if (prospect.status !== "researched") return false;
  const updated = new Date(prospect.updated_at);
  if (Number.isNaN(updated.getTime())) return false;
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - STALE_REVIEW_DAYS);
  return updated.getTime() < staleThreshold.getTime();
}

function isNeedsReviewProspect(prospect: Prospect): boolean {
  if (prospect.status === "new") return true;
  if (prospect.status === "researched" && !isStaleReviewedProspect(prospect)) return true;
  return false;
}

function queueViewLabel(view: QueueView): string {
  if (view === "needs_review") return "Needs review";
  if (view === "ready") return "Ready for outreach";
  if (view === "active") return "Contacted and replied";
  if (view === "qualified") return "Qualified and converted";
  if (view === "archive") return "Archive";
  return "All prospects";
}

function prospectsForQueueView(prospects: Prospect[], view: QueueView): Prospect[] {
  if (view === "needs_review") {
    return prospects.filter(isNeedsReviewProspect);
  }
  if (view === "ready") {
    return prospects.filter((prospect) => prospect.status === "ready_to_contact");
  }
  if (view === "active") {
    return prospects.filter(
      (prospect) => prospect.status === "contacted" || prospect.status === "replied"
    );
  }
  if (view === "qualified") {
    return prospects.filter(
      (prospect) =>
        prospect.status === "qualified" || prospect.status === "converted_to_lead"
    );
  }
  if (view === "archive") {
    return prospects.filter(
      (prospect) => prospect.status === "not_fit" || isStaleReviewedProspect(prospect)
    );
  }
  return prospects;
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

function fitSignalClassName(signal: ProspectFitSignal): string {
  if (signal.tone === "good") {
    return "border-emerald-500/25 bg-emerald-500/8 text-emerald-300";
  }
  if (signal.tone === "warn") {
    return "border-amber-500/25 bg-amber-500/8 text-amber-200";
  }
  return "border-zinc-700/60 bg-zinc-900/55 text-zinc-500";
}

function mobileFitSignalClassName(signal: ProspectFitSignal): string {
  const label = signal.label.toLowerCase();
  if (label.includes("website")) {
    return "border-cyan-500/30 bg-cyan-500/12 text-cyan-200";
  }
  if (label.includes("contact")) {
    return "border-brand/35 bg-brand/15 text-brand";
  }
  if (label.includes("agency") || label.includes("ecommerce") || label.includes("service")) {
    return "border-violet-500/30 bg-violet-500/12 text-violet-200";
  }
  if (label.includes("maps")) {
    return "border-orange-500/35 bg-orange-500/12 text-orange-200";
  }
  if (label.includes("platform") || label.includes("weak") || label.includes("manual")) {
    return "border-red-500/28 bg-red-500/10 text-red-300";
  }
  return fitSignalClassName(signal);
}

function condensedSignalText(signals: ProspectFitSignal[], max = 2): string | null {
  if (signals.length <= 1) return null;
  const rest = signals.slice(1);
  const labels = rest.slice(0, max).map((signal) => signal.label);
  const remainder = rest.length - labels.length;
  const suffix = remainder > 0 ? ` +${remainder}` : "";
  return `${labels.join(", ")}${suffix}`;
}

function weeklyEventCount(
  counts: Map<string, number>,
  eventType: (typeof WEEKLY_ACTIVITY_EVENT_TYPES)[number]
): number {
  return counts.get(eventType) ?? 0;
}

function statusCount(prospects: Prospect[], status: ProspectStatus): number {
  return prospects.filter((prospect) => prospect.status === status).length;
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

function ProspectSecondaryMenu({
  prospect,
  includeNotFit = true,
}: {
  prospect: Prospect;
  includeNotFit?: boolean;
}) {
  return (
    <details className="relative">
      <summary className="inline-flex h-7 list-none items-center rounded-md border border-zinc-700/70 px-2.5 text-[10px] uppercase tracking-[0.08em] text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300 [&::-webkit-details-marker]:hidden">
        More
      </summary>
      <div className="absolute right-0 z-20 mt-1 min-w-[150px] rounded-lg border border-zinc-800/90 bg-zinc-950/95 p-2 shadow-2xl shadow-black/40">
        <div className="flex flex-col items-start gap-1 text-[11px]">
          {includeNotFit && prospect.status !== "not_fit" && prospect.status !== "converted_to_lead" && (
            <form action={updateProspectStatusFromList.bind(null, prospect.id, "not_fit")}>
              <button type="submit" className="text-zinc-400 transition-colors hover:text-zinc-200">
                Not fit
              </button>
            </form>
          )}
          {prospect.status !== "converted_to_lead" && (
            <form action={markProspectDoNotContactFromList.bind(null, prospect.id)}>
              <button type="submit" className="text-amber-200/85 transition-colors hover:text-amber-100">
                Do not contact
              </button>
            </form>
          )}
          <DeleteProspectButton id={prospect.id} variant="subtle" />
        </div>
      </div>
    </details>
  );
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { status, language, lane, follow_up, view } = await searchParams;
  const followUpFilter = normalizeFollowUpFilter(follow_up);
  const statusFilter = parseStatusFilter(status);
  const languageFilter = parseLanguageFilter(language);
  const laneFilter = parseLaneFilter(lane);
  const queueView = parseQueueView(view);

  let prospects: Prospect[] = [];
  let error: string | null = null;
  const weeklyEventCounts = new Map<string, number>();

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

  try {
    const weekStart = new Date();
    const weekday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - weekday);
    weekStart.setHours(0, 0, 0, 0);

    const supabase = createSupabaseServerClient();
    const { data: events, error: eventsError } = await supabase
      .from("activity_events")
      .select("event_type")
      .gte("created_at", weekStart.toISOString())
      .in("event_type", [...WEEKLY_ACTIVITY_EVENT_TYPES]);

    if (!eventsError) {
      for (const row of events ?? []) {
        const eventType = row.event_type as string;
        weeklyEventCounts.set(eventType, (weeklyEventCounts.get(eventType) ?? 0) + 1);
      }
    }
  } catch {
    // Keep the core workspace running even if activity summary is unavailable.
  }

  const filteredProspects = prospects.filter((prospect) =>
    matchesFollowUpFilter(prospect.next_follow_up_at, followUpFilter)
  );

  const queueProspects = prospectsForQueueView(filteredProspects, queueView);
  const outreachProspects = filteredProspects.filter((prospect) =>
    OUTREACH_STATUSES.includes(prospect.status)
  );
  const convertedCount = statusCount(filteredProspects, "converted_to_lead");
  const staleReviewedCount = filteredProspects.filter(isStaleReviewedProspect).length;
  const needsReviewCount = prospectsForQueueView(filteredProspects, "needs_review").length;
  const overdueCount = filteredProspects.filter((prospect) =>
    matchesFollowUpFilter(prospect.next_follow_up_at, "overdue")
  ).length;
  const unscheduledCount = filteredProspects.filter(
    (prospect) => !prospect.next_follow_up_at && prospect.status !== "converted_to_lead"
  ).length;

  const hasFilters = Boolean(status || language || lane || follow_up || view);
  const readyCount = prospectsForQueueView(filteredProspects, "ready").length;
  const activeCount = prospectsForQueueView(filteredProspects, "active").length;

  const snippetLanguage = language === "nl" ? "nl" : "en";
  const snippetLane =
    lane === "build" || lane === "systems" || lane === "growth" || lane === "uncertain"
      ? lane
      : "all";
  const snippetLaneInput = snippetLane === "uncertain" ? "all" : snippetLane;
  const queueViews: QueueView[] = [
    "needs_review",
    "ready",
    "active",
    "qualified",
    "archive",
    "all",
  ];

  function queueViewHref(nextView: QueueView): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (language) params.set("language", language);
    if (lane) params.set("lane", lane);
    if (follow_up) params.set("follow_up", follow_up);
    if (nextView !== "needs_review") {
      params.set("view", nextView);
    }
    const query = params.toString();
    return query ? `/admin/prospects?${query}` : "/admin/prospects";
  }

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

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/25 p-3.5 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">Pipeline health</p>
          <p className="text-[11px] text-zinc-600">
            Generated {weeklyEventCount(weeklyEventCounts, "prospect.generated")} · Reviewed{" "}
            {weeklyEventCount(weeklyEventCounts, "prospect.reviewed")} · Contacted{" "}
            {weeklyEventCount(weeklyEventCounts, "prospect.contacted")} · Replied{" "}
            {weeklyEventCount(weeklyEventCounts, "prospect.replied")}
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <HealthMetric label="Need review" value={needsReviewCount} />
          <HealthMetric label="Ready" value={readyCount} />
          <HealthMetric label="Active" value={activeCount} />
          <HealthMetric label="Overdue" value={overdueCount} tone={overdueCount > 0 ? "warn" : "default"} />
          <HealthMetric
            label="No next touch"
            value={unscheduledCount}
            tone={unscheduledCount > 0 ? "warn" : "default"}
          />
        </div>
      </section>

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
              Set market inputs, then generate the next review batch.
            </p>
          </div>
          <p className="text-[10px] text-zinc-700">Generate for same-day review pace.</p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <GenerateForm sourceOptions={PROSPECT_SOURCE_OPTIONS.map((option) => ({ ...option }))} />

          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Generation notes
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-zinc-500">
              <li>One lane and one language per run.</li>
              <li>Keep volume realistic for the current queue.</li>
              <li>Use source labels for attribution history.</li>
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
            <h2 className="mt-1 text-sm font-medium text-zinc-100">Inbound review inbox</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Keep queue focused on active decisions. Move reviewed records to a clear next state.
            </p>
          </div>
          <p className="text-[11px] text-zinc-600">
            {queueViewLabel(queueView)} · {queueProspects.length} visible · {needsReviewCount} needing review
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-1.5">
          {queueViews.map((viewOption) => {
            const isActive = queueView === viewOption;
            const count = prospectsForQueueView(filteredProspects, viewOption).length;
            return (
              <Link
                key={viewOption}
                href={queueViewHref(viewOption)}
                className={`inline-flex h-7 items-center rounded-md border px-2.5 text-[10px] uppercase tracking-[0.08em] transition-colors ${
                  isActive
                    ? "border-brand/35 bg-brand/12 text-brand"
                    : "border-zinc-700/80 bg-zinc-900/60 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                {queueViewLabel(viewOption)} ({count})
              </Link>
            );
          })}
        </div>

        {staleReviewedCount > 0 && queueView === "needs_review" && (
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/25 px-4 py-3 text-xs text-zinc-500">
            {staleReviewedCount} reviewed prospect{staleReviewedCount === 1 ? "" : "s"} moved out of inbox after{" "}
            {STALE_REVIEW_DAYS} days. Open Archive to reprocess.
          </div>
        )}

        {queueProspects.length === 0 && !error ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-12 text-center">
            <p className="text-sm text-zinc-600">
              {hasFilters
                ? "No prospects match this inbox view and filter set."
                : "Inbox is clear. Generate or add new prospects to continue."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/70">
                    {["Company", "Fit signals", "Context", "Actions"].map((header) => (
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
                    const signals = fitSignalsFromProspect(prospect);
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
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${fitSignalClassName(
                                  signals[0]
                                )}`}
                              >
                                {signals[0].label}
                              </span>
                              {condensedSignalText(signals) && (
                                <p className="text-[11px] text-zinc-600">
                                  {condensedSignalText(signals)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700">No signals yet</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-500">
                          <p className="text-zinc-500">
                            {laneLabel(prospect.lane_fit)} · {languageLabel(prospect.outreach_language)} ·{" "}
                            {prospect.source}
                          </p>
                          <span
                            className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              PROSPECT_STATUS_CONFIG[prospect.status].color
                            }`}
                          >
                            {PROSPECT_STATUS_CONFIG[prospect.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {primaryAction ? (
                                <form action={updateProspectStatusFromList.bind(null, prospect.id, primaryAction.toStatus)}>
                                  <button
                                    type="submit"
                                    className={`inline-flex h-7 items-center rounded-md border px-2.5 text-[10px] uppercase tracking-[0.08em] transition-colors ${primaryAction.style}`}
                                  >
                                    {primaryAction.label}
                                  </button>
                                </form>
                              ) : null}
                              <Link
                                href={`/admin/prospects/${prospect.id}`}
                                className="inline-flex h-7 items-center rounded-md border border-zinc-700/70 px-2.5 text-[10px] uppercase tracking-[0.08em] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                              >
                                Open
                              </Link>
                              <ProspectSecondaryMenu prospect={prospect} />
                            </div>
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
                const primaryAction = queuePrimaryAction(prospect);
                const signals = fitSignalsFromProspect(prospect);
                return (
                  <article key={prospect.id} className="space-y-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/prospects/${prospect.id}`}
                          className="line-clamp-1 text-sm font-medium text-zinc-200 transition-colors hover:text-brand"
                        >
                          {prospect.company_name}
                        </Link>
                        <p className="mt-1 truncate text-xs text-zinc-600">
                          {prospect.website_url ?? "No website captured"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          PROSPECT_STATUS_CONFIG[prospect.status].color
                        }`}
                      >
                        {PROSPECT_STATUS_CONFIG[prospect.status].label}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-600">
                      {laneLabel(prospect.lane_fit)} · {languageLabel(prospect.outreach_language)}
                    </p>

                    {signals.length > 0 ? (
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${mobileFitSignalClassName(
                            signals[0]
                          )}`}
                        >
                          {signals[0].label}
                        </span>
                        {condensedSignalText(signals) && (
                          <p className="text-[11px] text-zinc-600">{condensedSignalText(signals)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-700">No fit signals yet</p>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {primaryAction ? (
                          <form action={updateProspectStatusFromList.bind(null, prospect.id, primaryAction.toStatus)}>
                            <button
                              type="submit"
                              className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[10px] uppercase tracking-[0.08em] transition-colors ${primaryAction.style}`}
                            >
                              {primaryAction.label}
                            </button>
                          </form>
                        ) : null}
                        <Link
                          href={`/admin/prospects/${prospect.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-zinc-700/70 px-2.5 text-[10px] uppercase tracking-[0.08em] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                        >
                          Open
                        </Link>
                        <ProspectSecondaryMenu prospect={prospect} />
                      </div>
                    </div>
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
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[11px] text-zinc-600">
              {outreachProspects.length} outreach-active · {convertedCount} converted to lead
            </p>
            <SnippetLibrary language={snippetLanguage} lane={snippetLaneInput} />
          </div>
        </div>

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
                          <div className="flex flex-wrap items-center gap-1.5">
                            {primaryAction?.type === "contact" && (
                              <form action={markProspectContactedFromList.bind(null, prospect.id)}>
                                <button
                                  type="submit"
                                  className="inline-flex h-7 items-center rounded-md border border-brand/30 bg-brand/10 px-2.5 text-[10px] uppercase tracking-[0.08em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
                                >
                                  {primaryAction.label}
                                </button>
                              </form>
                            )}
                            {primaryAction?.type === "status" && (
                              <form action={updateProspectStatusFromList.bind(null, prospect.id, primaryAction.toStatus)}>
                                <button
                                  type="submit"
                                  className="inline-flex h-7 items-center rounded-md border border-brand/30 bg-brand/10 px-2.5 text-[10px] uppercase tracking-[0.08em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
                                >
                                  {primaryAction.label}
                                </button>
                              </form>
                            )}
                            {prospect.status === "qualified" && !prospect.converted_lead_id && (
                              <Link
                                href={`/admin/prospects/${prospect.id}`}
                                className="inline-flex h-7 items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 text-[10px] uppercase tracking-[0.08em] text-emerald-300 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/15"
                              >
                                Convert to lead
                              </Link>
                            )}
                            <Link
                              href={`/admin/prospects/${prospect.id}`}
                              className="inline-flex h-7 items-center rounded-md border border-zinc-700/70 px-2.5 text-[10px] uppercase tracking-[0.08em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                            >
                              Open
                            </Link>
                            {prospect.converted_lead_id && (
                              <Link
                                href={`/admin/leads/${prospect.converted_lead_id}`}
                                className="inline-flex h-7 items-center rounded-md border border-emerald-500/20 px-2.5 text-[10px] text-emerald-300 transition-colors hover:border-emerald-500/35 hover:text-emerald-200"
                              >
                                View lead
                              </Link>
                            )}
                            <ProspectSecondaryMenu prospect={prospect} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-800/40 md:hidden">
              {outreachProspects.map((prospect) => {
                const primaryAction = outreachPrimaryAction(prospect);

                return (
                  <article key={prospect.id} className="space-y-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/prospects/${prospect.id}`}
                          className="line-clamp-1 text-sm font-medium text-zinc-200 transition-colors hover:text-brand"
                        >
                          {prospect.company_name}
                        </Link>
                        <p className="mt-1 truncate text-xs text-zinc-600">
                          {prospect.contact_name ?? prospect.contact_value ?? "No contact captured"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          PROSPECT_STATUS_CONFIG[prospect.status].color
                        }`}
                      >
                        {PROSPECT_STATUS_CONFIG[prospect.status].label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600">
                      <p className="truncate">Channel: {prospect.contact_channel}</p>
                      <p className="truncate">Language: {languageLabel(prospect.outreach_language)}</p>
                      <p className="truncate">Last: {formatDateTime(prospect.last_contact_at)}</p>
                      <p className="truncate">Next: {formatDateTime(prospect.next_follow_up_at)}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {primaryAction?.type === "contact" && (
                        <form action={markProspectContactedFromList.bind(null, prospect.id)}>
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center rounded-md border border-brand/30 bg-brand/10 px-2.5 text-[10px] uppercase tracking-[0.08em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
                          >
                            {primaryAction.label}
                          </button>
                        </form>
                      )}
                      {primaryAction?.type === "status" && (
                        <form action={updateProspectStatusFromList.bind(null, prospect.id, primaryAction.toStatus)}>
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center rounded-md border border-brand/30 bg-brand/10 px-2.5 text-[10px] uppercase tracking-[0.08em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
                          >
                            {primaryAction.label}
                          </button>
                        </form>
                      )}
                      {prospect.status === "qualified" && !prospect.converted_lead_id && (
                        <Link
                          href={`/admin/prospects/${prospect.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 text-[10px] uppercase tracking-[0.08em] text-emerald-300 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/15"
                        >
                          Convert to lead
                        </Link>
                      )}
                      <Link
                        href={`/admin/prospects/${prospect.id}`}
                        className="inline-flex h-8 items-center rounded-md border border-zinc-700/70 px-2.5 text-[10px] uppercase tracking-[0.08em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                      >
                        Open
                      </Link>
                      {prospect.converted_lead_id && (
                        <Link
                          href={`/admin/leads/${prospect.converted_lead_id}`}
                          className="inline-flex h-8 items-center rounded-md border border-emerald-500/20 px-2.5 text-[10px] text-emerald-300 transition-colors hover:border-emerald-500/35 hover:text-emerald-200"
                        >
                          View lead
                        </Link>
                      )}
                      <ProspectSecondaryMenu prospect={prospect} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function HealthMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  const valueClassName = tone === "warn" ? "text-amber-200" : "text-zinc-100";
  const borderClassName = tone === "warn" ? "border-amber-500/20" : "border-zinc-800/80";
  const bgClassName = tone === "warn" ? "bg-amber-500/6" : "bg-zinc-900/35";

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${borderClassName} ${bgClassName}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
        {label}
      </p>
      <p className={`mt-1 text-base font-semibold tabular-nums sm:text-lg ${valueClassName}`}>{value}</p>
    </div>
  );
}
