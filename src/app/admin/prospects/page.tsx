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
} from "@/app/admin/config";
import ProspectsFilter from "./prospects-filter";
import SnippetLibrary from "./snippet-library";
import { markProspectContactedFromList } from "./actions";

export const metadata: Metadata = { title: "Prospects | Inovense CRM" };
export const dynamic = "force-dynamic";

type FollowUpFilter = "today" | "overdue" | "next_7d" | "none";

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

  const dueTodayCount = prospects.filter((prospect) =>
    matchesFollowUpFilter(prospect.next_follow_up_at, "today")
  ).length;
  const overdueCount = prospects.filter((prospect) =>
    matchesFollowUpFilter(prospect.next_follow_up_at, "overdue")
  ).length;
  const qualifiedCount = prospects.filter((prospect) => prospect.status === "qualified").length;
  const convertedCount = prospects.filter(
    (prospect) => prospect.status === "converted_to_lead"
  ).length;

  const hasFilters = Boolean(status || language || lane || follow_up);

  const snippetLanguage = language === "nl" ? "nl" : "en";
  const snippetLane =
    lane === "build" || lane === "systems" || lane === "growth" || lane === "uncertain"
      ? lane
      : "all";
  const snippetLaneInput = snippetLane === "uncertain" ? "all" : snippetLane;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Prospects</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Outbound targets before they become real CRM leads.
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Prospects" value={String(prospects.length)} sub="Total tracked targets" />
        <MetricCard label="Due today" value={String(dueTodayCount)} sub="Follow-up discipline window" />
        <MetricCard label="Qualified" value={String(qualifiedCount)} sub="Ready for conversion review" />
        <MetricCard label="Converted" value={String(convertedCount)} sub="Moved into lead flow" />
      </div>

      {overdueCount > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {overdueCount} prospect{overdueCount !== 1 ? "s are" : " is"} overdue for follow-up.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {filteredProspects.length === 0 && !error ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                <span className="h-1.5 w-1.5 rounded-full bg-brand/50" />
              </div>
              <p className="text-sm text-zinc-600">
                {hasFilters
                  ? "No prospects match current filters."
                  : "No prospects yet. Start by adding outbound targets."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-800/80">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/80 bg-zinc-900/70">
                      {[
                        "Company",
                        "Contact",
                        "Lane",
                        "Language",
                        "Source",
                        "Next follow-up",
                        "Status",
                        "Actions",
                      ].map((header) => (
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
                    {filteredProspects.map((prospect) => (
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
                              {prospect.website_url ?? "No website captured"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-500">
                          <p className="text-zinc-400">{prospect.contact_name ?? "No contact name"}</p>
                          <p className="mt-1">
                            {prospect.contact_channel}
                            {prospect.contact_value
                              ? ` | ${prospect.contact_value}`
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-500">
                          {laneLabel(prospect.lane_fit)}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-500">
                          {languageLabel(prospect.outreach_language)}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-500">{prospect.source}</td>
                        <td className="px-4 py-4 text-xs tabular-nums text-zinc-500">
                          {prospect.next_follow_up_at
                            ? format(new Date(prospect.next_follow_up_at), "MMM d, yyyy HH:mm")
                            : "Not set"}
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
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/prospects/${prospect.id}`}
                              className="inline-flex items-center rounded-md border border-zinc-700/70 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                            >
                              Open
                            </Link>
                            {prospect.status !== "converted_to_lead" && (
                              <form
                                action={markProspectContactedFromList.bind(
                                  null,
                                  prospect.id
                                )}
                              >
                                <button
                                  type="submit"
                                  className="inline-flex items-center rounded-md border border-brand/30 bg-brand/10 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
                                >
                                  Mark contacted
                                </button>
                              </form>
                            )}
                          </div>
                          {prospect.converted_lead_id ? (
                            <Link
                              href={`/admin/leads/${prospect.converted_lead_id}`}
                              className="mt-1 inline-block text-[10px] text-emerald-300 transition-colors hover:text-emerald-200"
                            >
                              View lead &rarr;
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-zinc-800/40 md:hidden">
                {filteredProspects.map((prospect) => (
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

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-600">
                      <span>{laneLabel(prospect.lane_fit)}</span>
                      <span className="text-zinc-800">|</span>
                      <span>{languageLabel(prospect.outreach_language)}</span>
                      <span className="text-zinc-800">|</span>
                      <span>{prospect.source}</span>
                    </div>

                    <div className="text-[11px] text-zinc-600">
                      {prospect.next_follow_up_at
                        ? `Next follow-up: ${format(
                            new Date(prospect.next_follow_up_at),
                            "MMM d, yyyy HH:mm"
                          )}`
                        : "Next follow-up not set"}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/admin/prospects/${prospect.id}`}
                        className="inline-flex items-center rounded-md border border-zinc-700/70 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                      >
                        Open
                      </Link>
                      {prospect.status !== "converted_to_lead" && (
                        <form
                          action={markProspectContactedFromList.bind(
                            null,
                            prospect.id
                          )}
                        >
                          <button
                            type="submit"
                            className="inline-flex items-center rounded-md border border-brand/30 bg-brand/10 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
                          >
                            Mark contacted
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/35 p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Outreach snippets
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Internal copy support only. No auto-send. Keep outreach human and contextual.
            </p>
            <p className="mt-2 text-[10px] text-zinc-700">
              Showing {snippetLanguage.toUpperCase()} snippets for{" "}
              {laneLabelForSnippet(snippetLaneInput)}.
            </p>
          </div>
          <SnippetLibrary language={snippetLanguage} lane={snippetLaneInput} />
        </aside>
      </div>
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
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/35 px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold tabular-nums text-zinc-100">{value}</p>
      <p className="mt-0.5 text-[10px] text-zinc-700">{sub}</p>
    </div>
  );
}
