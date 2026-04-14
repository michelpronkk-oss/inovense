import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient, type Lead, type LeadStatus } from "@/lib/supabase-server";
import { format } from "date-fns";
import { STATUS_CONFIG, LANE_COLORS, LEAD_SOURCE_LABELS } from "@/app/admin/config";
import LeadsFilter from "./leads-filter";
import { Suspense } from "react";
import {
  convertLeadLocalAmountToUsd,
  derivePaymentState,
  fmtUsd,
} from "@/lib/payment-utils";
import { MarketMarker } from "@/app/admin/market-marker";
import {
  formatReminderAge,
  getLifecycleReminders,
  type LifecycleReminderKind,
} from "@/lib/lifecycle-reminders";

export const metadata: Metadata = { title: "Leads | Inovense CRM" };

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { status, lane, source } = await searchParams;

  let leads: Lead[] = [];
  let error: string | null = null;

  try {
    const supabase = createSupabaseServerClient();
    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status as LeadStatus);
    if (lane) query = query.eq("service_lane", lane);
    if (source) query = query.eq("lead_source", source);

    const { data, error: sbError } = await query;
    if (sbError) throw sbError;
    leads = (data ?? []) as Lead[];
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load leads.";
  }

  const isFiltered = !!(status || lane || source);

  /* ─── Revenue metrics ─────────────────────────────────────────────────── */
  let cashCollectedUsd = 0;
  let completedRevenueUsd = 0;
  let outstandingBalanceUsd = 0;
  let activeLeadsWithPrice = 0;
  const missingFxLeadIds = new Set<string>();

  function convertForMetric(lead: Lead, amountLocal: number): number | null {
    const amountUsd = convertLeadLocalAmountToUsd(lead, amountLocal);
    if (amountUsd == null && amountLocal > 0) {
      missingFxLeadIds.add(lead.id);
    }
    return amountUsd;
  }

  for (const lead of leads) {
    const ps = derivePaymentState(lead);
    const total = ps.kind !== "no_price" ? ps.total : 0;

    if (ps.kind === "fully_paid") {
      const totalUsd = convertForMetric(lead, total);
      if (totalUsd != null) {
        cashCollectedUsd += totalUsd;
        if (lead.project_status === "completed") {
          completedRevenueUsd += totalUsd;
        }
      }
    } else if (ps.kind === "deposit_paid") {
      const paidUsd = convertForMetric(lead, ps.paid);
      const remainingUsd = convertForMetric(lead, ps.remaining);
      if (paidUsd != null) cashCollectedUsd += paidUsd;
      if (remainingUsd != null) outstandingBalanceUsd += remainingUsd;
      activeLeadsWithPrice++;
    } else if (ps.kind === "unpaid" && total > 0) {
      const totalUsd = convertForMetric(lead, total);
      if (totalUsd != null) outstandingBalanceUsd += totalUsd;
      activeLeadsWithPrice++;
    }
  }
  const missingFxLeadCount = missingFxLeadIds.size;

  const showMetrics = leads.length > 0 && !error;
  const attentionRows = leads.flatMap((lead) => {
    const primaryReminder = getLifecycleReminders(lead)[0];
    if (!primaryReminder) return [];
    return [{ lead, reminder: primaryReminder }];
  });
  const attentionByLeadId = new Map(
    attentionRows.map(({ lead, reminder }) => [lead.id, reminder])
  );
  const attentionCounts: Record<LifecycleReminderKind, number> = {
    proposal_follow_up: 0,
    deposit_pending: 0,
    onboarding_pending: 0,
  };
  for (const row of attentionRows) {
    attentionCounts[row.reminder.kind] += 1;
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Leads</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {error
              ? "Could not load leads."
              : `${leads.length} submission${leads.length !== 1 ? "s" : ""}${isFiltered ? " matching filters" : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense>
            <LeadsFilter />
          </Suspense>
          <Link
            href="/admin/leads/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-3 text-xs font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add lead
          </Link>
        </div>
      </div>

      {showMetrics && (
        <div className="mb-6 space-y-3">
          {missingFxLeadCount > 0 && (
            <p className="text-[11px] text-zinc-700">
              USD reporting excludes {missingFxLeadCount} lead{missingFxLeadCount !== 1 ? "s" : ""} without a locked FX rate.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Cash collected",
                value: fmtUsd(cashCollectedUsd),
                sub: "USD deposits + full payments",
              },
              {
                label: "Completed revenue",
                value: fmtUsd(completedRevenueUsd),
                sub: "USD fully paid + project complete",
              },
              {
                label: "Outstanding",
                value: fmtUsd(outstandingBalanceUsd),
                sub: `USD across ${activeLeadsWithPrice} lead${
                  activeLeadsWithPrice !== 1 ? "s" : ""
                }`,
              },
              {
                label: "Total leads",
                value: String(leads.length),
                sub: isFiltered ? "Filtered view" : "All time",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-3 sm:px-4 sm:py-3.5"
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                  {m.label}
                </p>
                <p className="mt-1.5 text-base font-semibold tabular-nums text-zinc-100 sm:text-lg">
                  {m.value}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-700">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {attentionRows.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-amber-300/80">
                Needs attention
              </p>
              <p className="mt-1 text-sm text-amber-100">
                {attentionRows.length} lead{attentionRows.length !== 1 ? "s" : ""} currently need follow-up.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {attentionCounts.proposal_follow_up > 0 && (
                <span className="inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-0.5 text-amber-100">
                  Proposal: {attentionCounts.proposal_follow_up}
                </span>
              )}
              {attentionCounts.deposit_pending > 0 && (
                <span className="inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-0.5 text-amber-100">
                  Deposit: {attentionCounts.deposit_pending}
                </span>
              )}
              {attentionCounts.onboarding_pending > 0 && (
                <span className="inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-0.5 text-amber-100">
                  Onboarding: {attentionCounts.onboarding_pending}
                </span>
              )}
            </div>
          </div>
          <ul className="mt-3.5 space-y-2.5">
            {attentionRows.slice(0, 6).map(({ lead, reminder }) => (
              <li key={lead.id} className="rounded-lg border border-zinc-800/80 bg-zinc-900/45 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="text-xs font-medium text-zinc-200 transition-colors hover:text-brand"
                  >
                    {lead.full_name} · {lead.company_name}
                  </Link>
                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-amber-200/90">
                    {formatReminderAge(reminder)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400">{reminder.title}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {leads.length === 0 && !error ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <span className="h-1.5 w-1.5 rounded-full bg-brand/50" />
          </div>
          <p className="text-sm text-zinc-600">
            {isFiltered
              ? "No leads match the current filters."
              : "No submissions yet. Intake briefs will appear here once received."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/80">

          {/* Mobile: stacked lead cards */}
          <div className="divide-y divide-zinc-800/40 md:hidden">
            {leads.map((lead) => (
              <div key={lead.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="font-medium text-zinc-200 transition-colors hover:text-brand"
                    >
                      {lead.full_name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {lead.company_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_CONFIG[lead.status]?.color ?? STATUS_CONFIG.new.color
                      }`}
                    >
                      {STATUS_CONFIG[lead.status]?.label ?? lead.status}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        LANE_COLORS[lead.service_lane] ?? LANE_COLORS.default
                      }`}
                    >
                      {lead.service_lane}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-600">
                  <MarketMarker
                    countryCode={lead.country_code}
                    countrySource={lead.country_source}
                    leadSource={lead.lead_source}
                  />
                  {lead.lead_source && (
                    <>
                      <span className="text-zinc-800">&middot;</span>
                      <span>{LEAD_SOURCE_LABELS[lead.lead_source] ?? lead.lead_source}</span>
                    </>
                  )}
                  {lead.budget_range && (
                    <>
                      <span className="text-zinc-800">&middot;</span>
                      <span>{lead.budget_range}</span>
                    </>
                  )}
                  <span className="text-zinc-800">&middot;</span>
                  <span className="tabular-nums">
                    {format(new Date(lead.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                {attentionByLeadId.get(lead.id) && (
                  <div className="mt-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-2.5 py-1.5">
                    <p className="text-[11px] font-medium text-amber-100">
                      {attentionByLeadId.get(lead.id)!.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-amber-200/80">
                      {formatReminderAge(attentionByLeadId.get(lead.id)!)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/70">
                  {[
                    "Date",
                    "Name",
                    "Company",
                    "Source",
                    "Lane",
                    "Type",
                    "Budget",
                    "Timeline",
                    "Status",
                    "Attention",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="transition-colors hover:bg-zinc-800/20"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-xs tabular-nums text-zinc-600">
                      {format(new Date(lead.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="font-medium text-zinc-200 transition-colors hover:text-brand"
                      >
                        {lead.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-zinc-500">
                      {lead.company_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                        {lead.lead_source
                          ? (LEAD_SOURCE_LABELS[lead.lead_source] ?? lead.lead_source)
                          : <span className="text-zinc-800">—</span>}
                        <MarketMarker
                          countryCode={lead.country_code}
                          countrySource={lead.country_source}
                          leadSource={lead.lead_source}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          LANE_COLORS[lead.service_lane] ?? LANE_COLORS.default
                        }`}
                      >
                        {lead.service_lane}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-600">
                      {lead.project_type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-zinc-600">
                      {lead.budget_range}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-zinc-600">
                      {lead.timeline}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_CONFIG[lead.status]?.color ??
                          STATUS_CONFIG.new.color
                        }`}
                      >
                        {STATUS_CONFIG[lead.status]?.label ?? lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {attentionByLeadId.get(lead.id) ? (
                        <div className="space-y-0.5">
                          <p className="text-xs text-amber-100">
                            {attentionByLeadId.get(lead.id)!.title}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.08em] text-amber-300/80">
                            {formatReminderAge(attentionByLeadId.get(lead.id)!)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
