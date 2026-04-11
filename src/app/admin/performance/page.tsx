import type { Metadata } from "next";
import {
  formatPathLabel,
  formatSourceLabel,
  getAdminPerformanceSnapshot,
  type PerformanceSignal,
} from "@/app/admin/performance/data";

export const metadata: Metadata = { title: "Performance | Inovense CRM" };

export const dynamic = "force-dynamic";

function formatSignedCount(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}

function formatSignedPp(value: number): string {
  const rounded = Number(value.toFixed(1));
  if (rounded > 0) return `+${rounded.toFixed(1)}pp`;
  if (rounded < 0) return `${rounded.toFixed(1)}pp`;
  return "0.0pp";
}

export default async function AdminPerformancePage() {
  const performance = await getAdminPerformanceSnapshot();

  const sessionsTodayValue: string | number = performance.query.sessionsFailed
    ? "--"
    : performance.sessions.today;
  const sessions7dValue: string | number = performance.query.sessionsFailed
    ? "--"
    : performance.sessions.last7d;
  const sessions30dValue: string | number = performance.query.sessionsFailed
    ? "--"
    : performance.sessions.last30d;
  const leads30dValue: string | number = performance.query.leadsFailed
    ? "--"
    : performance.leads.captured30d;
  const sessionToLeadValue: string | number =
    performance.query.sessionsFailed || performance.query.leadsFailed
      ? "--"
      : performance.leads.sessionToLeadRate;

  const leadToWonValue: string | number = performance.query.leadsFailed
    ? "--"
    : performance.funnel.leadToWonRate;
  const wonToDepositValue: string | number = performance.query.leadsFailed
    ? "--"
    : performance.funnel.wonToDepositRate;
  const depositToCompletedValue: string | number = performance.query.leadsFailed
    ? "--"
    : performance.funnel.depositToCompletedRate;

  const sessionsTrend = performance.query.sessionsFailed
    ? undefined
    : {
        label: `${formatSignedCount(performance.comparison.sessions30d.delta)} vs prev 30d`,
        tone: performance.comparison.sessions30d.direction,
      };

  const leadsTrend = performance.query.leadsFailed
    ? undefined
    : {
        label: `${formatSignedCount(performance.comparison.leads30d.delta)} vs prev 30d`,
        tone: performance.comparison.leads30d.direction,
      };

  const sessionToLeadTrend =
    performance.query.sessionsFailed || performance.query.leadsFailed
      ? undefined
      : {
          label: `${formatSignedPp(performance.comparison.sessionToLead30d.deltaPp)} vs prev 30d`,
          tone: performance.comparison.sessionToLead30d.direction,
        };

  const hasSourceBreakdowns = performance.sessions.topSources.length > 0;
  const hasSourceOutcomes = performance.sourceOutcomes.length > 0;
  const landingByLeads = performance.landingOutcomes.filter((row) => row.leads > 0).slice(0, 5);

  const sessionBreakdownScale = Math.max(performance.sessions.last30d, 1);

  let statusTitle: string | null = null;
  let statusBody: string | null = null;

  if (performance.query.health === "unavailable") {
    statusTitle = "Performance data is temporarily unavailable";
    statusBody =
      "Traffic and lead-side performance data could not be loaded. Verify traffic migrations and service-role access.";
  } else if (performance.query.sessionsFailed) {
    statusTitle = "Traffic session data unavailable";
    statusBody =
      "Lead-stage metrics are available, but session traffic rows are not readable right now.";
  } else if (performance.query.leadsFailed) {
    statusTitle = "Lead-stage data unavailable";
    statusBody =
      "Traffic session metrics are available, but lead-stage progression metrics are currently unavailable.";
  } else if (performance.sessions.last30d === 0 && performance.leads.captured30d === 0) {
    statusTitle = "No performance activity in the last 30 days";
    statusBody =
      "Once sessions and leads are captured, this page will surface source quality and stage progression.";
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Performance</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Traffic quality, lead capture, and business stage progression in one compact operator view.
        </p>
      </div>

      {statusTitle && statusBody && (
        <div className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3.5">
          <p className="text-xs font-medium text-zinc-300">{statusTitle}</p>
          <p className="mt-1.5 text-[11px] text-zinc-600">{statusBody}</p>
        </div>
      )}

      <section className="mb-8">
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
            Performance Signals
          </p>
        </div>

        {performance.signals.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-8 text-center">
            <p className="text-sm text-zinc-600">
              Not enough complete data yet to generate reliable performance signals.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {performance.signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
            Traffic + Lead Capture
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <MetricCard label="Sessions today" value={sessionsTodayValue} />
          <MetricCard label="Sessions 7d" value={sessions7dValue} />
          <MetricCard
            label="Sessions 30d"
            value={sessions30dValue}
            sub={performance.query.sessionsFailed ? "Traffic metrics unavailable" : "Current 30d window"}
            trend={sessionsTrend}
          />
          <MetricCard
            label="Leads captured (30d)"
            value={leads30dValue}
            sub={performance.query.leadsFailed ? "Lead metrics unavailable" : "Leads created in 30d window"}
            trend={leadsTrend}
          />
          <MetricCard
            label="Session -> Lead (30d)"
            value={sessionToLeadValue}
            sub={
              performance.query.sessionsFailed || performance.query.leadsFailed
                ? "Awaiting complete capture data"
                : `${performance.comparison.sessionToLead30d.currentNumerator} leads / ${
                    performance.comparison.sessionToLead30d.currentDenominator
                  } sessions`
            }
            trend={sessionToLeadTrend}
          />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
            Business Stages (30d Lead Cohort)
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricCard
            label="Lead -> Won"
            value={leadToWonValue}
            sub={
              performance.query.leadsFailed
                ? "Lead-stage metrics unavailable"
                : `${performance.funnel.won30d}/${performance.funnel.leads30d} leads`
            }
            accent="border-t-blue-500/35"
            valueColor="text-blue-300"
          />
          <MetricCard
            label="Won -> Deposit Paid"
            value={wonToDepositValue}
            sub={
              performance.query.leadsFailed
                ? "Lead-stage metrics unavailable"
                : `${performance.funnel.wonWithDeposit30d}/${performance.funnel.won30d} won leads`
            }
            accent="border-t-emerald-500/35"
            valueColor="text-emerald-300"
          />
          <MetricCard
            label="Deposit Paid -> Completed"
            value={depositToCompletedValue}
            sub={
              performance.query.leadsFailed
                ? "Lead-stage metrics unavailable"
                : `${performance.funnel.completedFromDeposit30d}/${performance.funnel.depositPaid30d} deposit-paid leads`
            }
            accent="border-t-amber-500/35"
            valueColor="text-amber-300"
          />
        </div>
      </section>

      {(hasSourceBreakdowns || landingByLeads.length > 0 || performance.sessions.topPaths.length > 0) && (
        <section className="mb-8">
          <div className="mb-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
              Traffic Distribution (30d)
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {hasSourceBreakdowns && (
              <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
                <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                    Top traffic sources by sessions
                  </p>
                </div>
                <ul className="divide-y divide-zinc-800/40">
                  {performance.sessions.topSources.map(({ source, count }) => (
                    <li key={source} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-zinc-400">{formatSourceLabel(source)}</span>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-brand/50"
                            style={{ width: `${Math.round((count / sessionBreakdownScale) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs tabular-nums text-zinc-600">
                          {count}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                  Best landing pages by lead generation
                </p>
              </div>

              {landingByLeads.length > 0 ? (
                <ul className="divide-y divide-zinc-800/40">
                  {landingByLeads.map((row) => (
                    <li key={row.path} className="flex items-center justify-between px-4 py-2.5">
                      <div className="min-w-0 pr-3">
                        <p className="truncate font-mono text-[11px] text-zinc-400">{formatPathLabel(row.path)}</p>
                        <p className="mt-1 text-[10px] tabular-nums text-zinc-600">
                          {row.leads} lead{row.leads !== 1 ? "s" : ""} from {row.sessions} session
                          {row.sessions !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-300">{row.sessionToLeadRate}</span>
                    </li>
                  ))}
                </ul>
              ) : performance.sessions.topPaths.length > 0 ? (
                <ul className="divide-y divide-zinc-800/40">
                  {performance.sessions.topPaths.map((row) => (
                    <li key={row.path} className="flex items-center justify-between px-4 py-2.5">
                      <div className="min-w-0 pr-3">
                        <p className="truncate font-mono text-[11px] text-zinc-400">{formatPathLabel(row.path)}</p>
                        <p className="mt-1 text-[10px] tabular-nums text-zinc-600">
                          {row.count} session{row.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-zinc-700">No lead-linked rows yet</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6">
                  <p className="text-xs text-zinc-600">No landing page activity in the current 30d window.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
            Source Outcomes (30d Lead Cohort)
          </p>
        </div>

        {!hasSourceOutcomes ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-10 text-center">
            <p className="text-sm text-zinc-600">
              No source outcome rows yet. This table populates when leads include first-touch source data.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/70">
                    {[
                      "Source",
                      "Sessions",
                      "Leads",
                      "Session -> Lead",
                      "Won",
                      "Lead -> Won",
                      "Deposit paid",
                      "Won -> Deposit",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {performance.sourceOutcomes.map((row) => (
                    <tr key={row.source} className="transition-colors hover:bg-zinc-800/20">
                      <td className="px-4 py-3.5 text-xs text-zinc-300">{formatSourceLabel(row.source)}</td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-zinc-500">{row.sessions}</td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-zinc-500">{row.leads}</td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-zinc-300">
                        {row.sessionToLeadRate}
                      </td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-zinc-500">{row.won}</td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-zinc-300">
                        {row.leadToWonRate}
                      </td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-zinc-500">{row.depositPaid}</td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-zinc-300">
                        {row.wonToDepositRate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function SignalCard({ signal }: { signal: PerformanceSignal }) {
  const accentClass =
    signal.tone === "positive"
      ? "border-t-emerald-500/40"
      : signal.tone === "attention"
        ? "border-t-amber-500/45"
        : "border-t-zinc-700/70";

  return (
    <div className={`rounded-xl border border-zinc-800 border-t-2 bg-zinc-900/40 px-4 py-3.5 ${accentClass}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">{signal.title}</p>
      <p className="mt-2 text-xs text-zinc-300">{signal.text}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  trend,
  accent = "border-t-zinc-700/60",
  valueColor = "text-zinc-200",
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { label: string; tone: "up" | "down" | "flat" };
  accent?: string;
  valueColor?: string;
}) {
  const isMuted = value === 0 || value === "0%" || value === "--";

  const trendClass =
    trend?.tone === "up"
      ? "text-emerald-400"
      : trend?.tone === "down"
        ? "text-amber-400"
        : "text-zinc-600";

  return (
    <div
      className={`rounded-xl border border-zinc-800 border-t-2 bg-zinc-900/50 px-4 py-3.5 sm:px-5 sm:py-4 ${accent}`}
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">{label}</p>
      <p
        className={`text-xl font-semibold tabular-nums leading-none sm:text-2xl ${
          isMuted ? "text-zinc-700" : valueColor
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-2 text-[10px] text-zinc-700">{sub}</p>}
      {trend && <p className={`mt-1 text-[10px] ${trendClass}`}>{trend.label}</p>}
    </div>
  );
}
