import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient, type Lead, type LeadStatus } from "@/lib/supabase-server";
import { format } from "date-fns";
import { STATUS_CONFIG, LANE_COLORS, LEAD_SOURCE_LABELS } from "@/app/admin/config";
import LeadsFilter from "./leads-filter";
import { Suspense } from "react";

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
        <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
          <table className="w-full min-w-[1020px] text-sm">
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
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-zinc-600">
                    {lead.lead_source ? (LEAD_SOURCE_LABELS[lead.lead_source] ?? lead.lead_source) : <span className="text-zinc-800">—</span>}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
