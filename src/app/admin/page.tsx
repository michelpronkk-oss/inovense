import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient, type Lead } from "@/lib/supabase-server";
import { format } from "date-fns";
import { STATUS_CONFIG, LANE_COLORS } from "@/app/admin/config";
import {
  convertLeadLocalAmountToUsd,
  derivePaymentState,
  fmtUsd,
} from "@/lib/payment-utils";

export const metadata: Metadata = { title: "Overview | Inovense CRM" };

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let leads: Lead[] = [];
  let error: string | null = null;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error: sbError } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (sbError) throw sbError;
    leads = (data ?? []) as Lead[];
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load leads.";
  }

  /* ─── Pipeline counts ────────────────────────────────────────────────────── */
  const counts = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    active: leads.filter((l) =>
      ["reviewing", "qualified", "proposal_sent", "payment_requested",
       "deposit_paid", "onboarding_sent", "onboarding_completed", "active"].includes(l.status)
    ).length,
    won: leads.filter((l) => l.status === "won").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  /* ─── Revenue metrics ─────────────────────────────────────────────────────── */
  let cashCollectedUsd = 0;
  let depositsCollectedUsd = 0;
  let completedRevenueUsd = 0;
  let outstandingBalanceUsd = 0;
  let leadsWithPrices = 0;
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

    if (ps.kind === "no_price") continue;

    leadsWithPrices++;

    if (ps.kind === "fully_paid") {
      const totalUsd = convertForMetric(lead, ps.total);
      if (totalUsd != null) {
        cashCollectedUsd += totalUsd;
        depositsCollectedUsd += totalUsd; // full payment encompasses deposit
      }
      if (lead.project_status === "completed" && totalUsd != null) {
        completedRevenueUsd += totalUsd;
      }
    } else if (ps.kind === "deposit_paid") {
      const paidUsd = convertForMetric(lead, ps.paid);
      const remainingUsd = convertForMetric(lead, ps.remaining);
      if (paidUsd != null) {
        cashCollectedUsd += paidUsd;
        depositsCollectedUsd += paidUsd;
      }
      if (remainingUsd != null) {
        outstandingBalanceUsd += remainingUsd;
      }
    } else if (ps.kind === "unpaid") {
      const totalUsd = convertForMetric(lead, ps.total);
      if (totalUsd != null) {
        outstandingBalanceUsd += totalUsd;
      }
    }
  }
  const missingFxLeadCount = missingFxLeadIds.size;

  const recent = leads.slice(0, 6);
  const hasData = leads.length > 0 && !error;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pipeline and financial summary.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Pipeline ─────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
          Pipeline
        </p>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total", value: counts.total, color: "text-zinc-100", accent: "border-t-zinc-700/80" },
          { label: "New", value: counts.new, color: "text-brand", accent: "border-t-brand/50" },
          { label: "Active", value: counts.active, color: "text-blue-400", accent: "border-t-blue-500/40" },
          { label: "Won", value: counts.won, color: "text-emerald-400", accent: "border-t-emerald-500/40" },
          { label: "Lost", value: counts.lost, color: "text-zinc-600", accent: "border-t-zinc-700/80" },
        ].map(({ label, value, color, accent }) => (
          <div
            key={label}
            className={`rounded-xl border border-zinc-800 border-t-2 bg-zinc-900/50 px-5 py-4 ${accent}`}
          >
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
              {label}
            </p>
            <p className={`text-3xl font-semibold tabular-nums leading-none ${color}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Revenue ──────────────────────────────────────────────────────── */}
      {hasData && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
              Revenue
            </p>
            {leadsWithPrices > 0 && (
              <p className="text-[10px] text-zinc-700">
                USD internal reporting across{" "}
                {leadsWithPrices} lead{leadsWithPrices !== 1 ? "s" : ""} with
                price set
              </p>
            )}
          </div>
          {missingFxLeadCount > 0 && (
            <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-[11px] text-amber-300">
              Conversion unavailable for {missingFxLeadCount} lead
              {missingFxLeadCount !== 1 ? "s" : ""}. Set a locked USD FX rate
              on each lead to include them in USD totals.
            </div>
          )}
          <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <RevenueMetric
              label="Cash collected"
              value={fmtUsd(cashCollectedUsd)}
              sub="USD, deposits + full payments"
              accent="border-t-emerald-500/40"
              valueColor="text-emerald-300"
              empty={cashCollectedUsd === 0}
            />
            <RevenueMetric
              label="Completed revenue"
              value={fmtUsd(completedRevenueUsd)}
              sub="USD, fully paid + project complete"
              accent="border-t-violet-500/30"
              valueColor="text-violet-300"
              empty={completedRevenueUsd === 0}
            />
            <RevenueMetric
              label="Outstanding"
              value={fmtUsd(outstandingBalanceUsd)}
              sub="USD unpaid balances across pipeline"
              accent="border-t-amber-500/30"
              valueColor="text-amber-300"
              empty={outstandingBalanceUsd === 0}
            />
            <RevenueMetric
              label="Deposits collected"
              value={fmtUsd(depositsCollectedUsd)}
              sub="USD, all deposit-stage payments"
              accent="border-t-zinc-600/60"
              valueColor="text-zinc-200"
              empty={depositsCollectedUsd === 0}
            />
          </div>
        </>
      )}

      {/* ── Recent leads ─────────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
            Recent submissions
          </p>
          <Link
            href="/admin/leads"
            className="text-xs text-zinc-600 transition-colors hover:text-brand"
          >
            View all →
          </Link>
        </div>

        {leads.length === 0 && !error ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/70">
                  {["Date", "Name", "Company", "Lane", "Budget", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {recent.map((lead) => (
                  <tr
                    key={lead.id}
                    className="transition-colors hover:bg-zinc-800/20"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs tabular-nums text-zinc-600">
                      {format(new Date(lead.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="font-medium text-zinc-200 transition-colors hover:text-brand"
                      >
                        {lead.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-500">
                      {lead.company_name}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={
                          LANE_COLORS[lead.service_lane] ?? LANE_COLORS.default
                        }
                      >
                        {lead.service_lane}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-zinc-600">
                      {lead.budget_range}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={
                          STATUS_CONFIG[lead.status]?.color ??
                          STATUS_CONFIG.new.color
                        }
                      >
                        {STATUS_CONFIG[lead.status]?.label ?? lead.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Revenue metric card ────────────────────────────────────────────────── */

function RevenueMetric({
  label,
  value,
  sub,
  accent,
  valueColor,
  empty,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  valueColor: string;
  empty: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 border-t-2 bg-zinc-900/50 px-5 py-4 ${accent}`}
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold tabular-nums leading-none ${
          empty ? "text-zinc-700" : valueColor
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[10px] text-zinc-700">{sub}</p>
    </div>
  );
}

/* ─── Shared primitives ──────────────────────────────────────────────────── */

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
        <span className="h-1.5 w-1.5 rounded-full bg-brand/50" />
      </div>
      <p className="text-sm text-zinc-600">
        No submissions yet. Intake briefs will appear here once received.
      </p>
    </div>
  );
}
