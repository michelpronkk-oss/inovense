import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient, type Lead } from "@/lib/supabase-server";
import { format } from "date-fns";
import { STATUS_CONFIG, LANE_COLORS } from "@/app/admin/config";

export const metadata: Metadata = { title: "Overview | Inovense CRM" };

export const dynamic = "force-dynamic";

const statCards = (counts: Record<string, number>) => [
  {
    label: "Total",
    value: counts.total,
    valueColor: "text-zinc-100",
    accent: "border-t-zinc-700/80",
  },
  {
    label: "New",
    value: counts.new,
    valueColor: "text-brand",
    accent: "border-t-brand/50",
  },
  {
    label: "Active",
    value: counts.active,
    valueColor: "text-blue-400",
    accent: "border-t-blue-500/40",
  },
  {
    label: "Won",
    value: counts.won,
    valueColor: "text-emerald-400",
    accent: "border-t-emerald-500/40",
  },
  {
    label: "Lost",
    value: counts.lost,
    valueColor: "text-zinc-600",
    accent: "border-t-zinc-700/80",
  },
];

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

  const counts = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    active: leads.filter((l) =>
      ["reviewing", "qualified", "proposal_sent"].includes(l.status)
    ).length,
    won: leads.filter((l) => l.status === "won").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  const recent = leads.slice(0, 6);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Intake submissions and pipeline status.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards(counts).map(({ label, value, valueColor, accent }) => (
          <div
            key={label}
            className={`rounded-xl border-t-2 border border-zinc-800 bg-zinc-900/50 px-5 py-4 ${accent}`}
          >
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
              {label}
            </p>
            <p className={`text-3xl font-semibold tabular-nums leading-none ${valueColor}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent leads */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">
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
          <EmptyState message="No submissions yet. Intake briefs will appear here once received." />
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
                      <Badge className={LANE_COLORS[lead.service_lane] ?? LANE_COLORS.default}>
                        {lead.service_lane}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-zinc-600">
                      {lead.budget_range}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={STATUS_CONFIG[lead.status]?.color ?? STATUS_CONFIG.new.color}>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
        <span className="h-1.5 w-1.5 rounded-full bg-brand/50" />
      </div>
      <p className="text-sm text-zinc-600">{message}</p>
    </div>
  );
}
