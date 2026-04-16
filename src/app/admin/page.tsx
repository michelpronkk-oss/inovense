import type { Metadata } from "next";
import Link from "next/link";
import {
  createSupabaseServerClient,
  type Lead,
  type Prospect,
} from "@/lib/supabase-server";
import { format } from "date-fns";
import { STATUS_CONFIG, LANE_COLORS } from "@/app/admin/config";
import { MarketMarker } from "@/app/admin/market-marker";
import { deriveWeeklyOperatingSummary } from "@/lib/weekly-operating-summary";

export const metadata: Metadata = { title: "Overview | Inovense CRM" };

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let leads: Lead[] = [];
  let prospects: Prospect[] = [];
  let error: string | null = null;
  let prospectsError: string | null = null;

  const supabase = createSupabaseServerClient();

  try {
    const { data, error: leadsErr } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (leadsErr) throw leadsErr;
    leads = (data ?? []) as Lead[];
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load leads.";
  }

  try {
    const { data, error: sbErr } = await supabase
      .from("prospects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (sbErr) throw sbErr;
    prospects = (data ?? []) as Prospect[];
  } catch (err) {
    prospectsError = err instanceof Error ? err.message : "Prospects data unavailable.";
  }

  /* Section */
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

  const recent = leads.slice(0, 6);
  const weeklySummary = deriveWeeklyOperatingSummary({ leads, prospects });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>
          {!error && (
            <div className="mt-1.5 flex items-center gap-3 text-[11px]">
              <span className="text-zinc-600">
                Active{" "}
                <span className="font-medium tabular-nums text-zinc-400">
                  {counts.active}
                </span>
              </span>
              <span className="text-zinc-800">&middot;</span>
              <span className="text-zinc-600">
                New{" "}
                <span className="font-medium tabular-nums text-zinc-400">
                  {counts.new}
                </span>
              </span>
              <span className="text-zinc-800">&middot;</span>
              <span className="text-zinc-600">
                Total{" "}
                <span className="font-medium tabular-nums text-zinc-400">
                  {counts.total}
                </span>
              </span>
            </div>
          )}
        </div>
        <p className="text-[11px] tabular-nums text-zinc-700">
          {format(new Date(), "MMM d, yyyy")}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {prospectsError && !error && (
        <div className="mb-4 rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3.5 py-2.5 text-[11px] text-zinc-500">
          Prospect data unavailable. Lead pipeline is unaffected.
        </div>
      )}

      {/* Attention */}
      {!error && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/45">
          <div className="px-4 py-4 sm:px-5">
            <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Act on first
            </p>
            {weeklySummary.priorityItems.length > 0 ? (
              <ul className="space-y-1.5">
                {weeklySummary.priorityItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2.5"
                  >
                    <Link
                      href={item.href}
                      className="text-xs font-medium text-zinc-100 transition-colors hover:text-brand"
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-zinc-600">{item.detail}</span>
                      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-amber-200/85">
                        {item.ageLabel}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-zinc-600">
                Pipeline is clean. No urgent follow-up right now.
              </p>
            )}
          </div>

          <div className="border-t border-zinc-800/60 bg-zinc-950/25 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-zinc-500">
              <span>
                Proposal <span className="text-zinc-300">{weeklySummary.proposals.dueCount}</span>
              </span>
              <span className="text-zinc-800">&middot;</span>
              <span>
                Deposit <span className="text-zinc-300">{weeklySummary.deposits.dueCount}</span>
              </span>
              <span className="text-zinc-800">&middot;</span>
              <span>
                Onboarding <span className="text-zinc-300">{weeklySummary.onboarding.dueCount}</span>
              </span>
              <span className="text-zinc-800">&middot;</span>
              <span>
                Prospects <span className="text-zinc-300">{weeklySummary.prospects.attentionCount}</span>
              </span>
              <span className="text-zinc-800">&middot;</span>
              <span>
                Active <span className="text-zinc-300">{weeklySummary.active.attentionCount}</span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Recent leads */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
            Recent submissions
          </p>
          <Link
            href="/admin/leads"
            className="text-xs text-zinc-600 transition-colors hover:text-brand"
          >
            View all &rarr;
          </Link>
        </div>

        {leads.length === 0 && !error ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">

            {/* Mobile: stacked cards */}
            <div className="divide-y divide-zinc-800/50 md:hidden">
              {recent.map((lead) => (
                <div key={lead.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="font-medium text-zinc-200 transition-colors hover:text-brand"
                        >
                          {lead.full_name}
                        </Link>
                        <MarketMarker
                          countryCode={lead.country_code}
                          countrySource={lead.country_source}
                          leadSource={lead.lead_source}
                        />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {lead.company_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge
                        className={
                          STATUS_CONFIG[lead.status]?.color ??
                          STATUS_CONFIG.new.color
                        }
                      >
                        {STATUS_CONFIG[lead.status]?.label ?? lead.status}
                      </Badge>
                      <Badge
                        className={
                          LANE_COLORS[lead.service_lane] ?? LANE_COLORS.default
                        }
                      >
                        {lead.service_lane}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-700">
                    {lead.budget_range && (
                      <span>{lead.budget_range}</span>
                    )}
                    {lead.budget_range && (
                      <span className="text-zinc-800">&middot;</span>
                    )}
                    <span className="tabular-nums">
                      {format(new Date(lead.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <table className="hidden w-full text-sm md:table">
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
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">
                          {lead.company_name}
                        </span>
                        <MarketMarker
                          countryCode={lead.country_code}
                          countrySource={lead.country_source}
                          leadSource={lead.lead_source}
                        />
                      </div>
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

/* Shared primitives */

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

