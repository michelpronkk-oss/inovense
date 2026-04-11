import Link from "next/link";
import {
  formatPathLabel,
  formatSourceLabel,
  getAdminPerformanceSnapshot,
} from "@/app/admin/performance/data";

export async function TrafficAttributionBlock() {
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

  const sessionToLeadValue: string | number =
    performance.query.sessionsFailed || performance.query.leadsFailed
      ? "--"
      : performance.leads.sessionToLeadRate;

  const sessionToLeadSub =
    performance.query.sessionsFailed || performance.query.leadsFailed
      ? "Awaiting complete performance data"
      : `${performance.leads.captured30d} submitted/manual lead${
          performance.leads.captured30d !== 1 ? "s" : ""
        } captured`;

  const showBreakdowns =
    performance.sessions.topSources.length > 0 || performance.sessions.topPaths.length > 0;

  const sessionBreakdownScale = Math.max(performance.sessions.last30d, 1);

  let stateTitle: string | null = null;
  let stateBody: string | null = null;

  if (performance.query.health === "unavailable") {
    stateTitle = "Performance data is temporarily unavailable";
    stateBody =
      "The snapshot stays visible so operators can verify status quickly. Check traffic migrations and service-role access.";
  } else if (performance.query.sessionsFailed) {
    stateTitle = "Traffic sessions unavailable";
    stateBody =
      "Lead-side performance data is readable, but traffic session rows are not. Verify migration and policy access.";
  } else if (performance.query.leadsFailed) {
    stateTitle = "Lead attribution unavailable";
    stateBody =
      "Traffic sessions are readable, but lead attribution fields are not. Verify lead column permissions and migrations.";
  } else if (performance.sessions.last30d === 0 && performance.leads.captured30d === 0) {
    stateTitle = "No performance activity in the last 30 days";
    stateBody =
      "Once sessions and leads are captured, this snapshot will show source quality and traffic-to-lead performance.";
  } else if (performance.sessions.last30d === 0 && performance.leads.captured30d > 0) {
    stateTitle = "Leads captured, session stream pending";
    stateBody =
      "Recent leads are available, but no traffic session rows were captured in the same 30-day window.";
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
            Performance Snapshot
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Lead = submitted inquiry or manual CRM lead.
          </p>
        </div>
        <Link
          href="/admin/performance"
          className="text-[11px] text-zinc-600 transition-colors hover:text-brand"
        >
          Open performance
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sessions today" value={sessionsTodayValue} />
        <StatCard label="Sessions 7d" value={sessions7dValue} />
        <StatCard label="Sessions 30d" value={sessions30dValue} />
        <StatCard
          label="Session -> Lead (30d)"
          value={sessionToLeadValue}
          sub={sessionToLeadSub}
        />
      </div>

      {stateTitle && stateBody && (
        <div className="mb-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3.5">
          <p className="text-xs font-medium text-zinc-300">{stateTitle}</p>
          <p className="mt-1.5 text-[11px] text-zinc-600">{stateBody}</p>
        </div>
      )}

      {showBreakdowns && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {performance.sessions.topSources.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                  Top traffic sources (30d)
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
                      <span className="w-7 text-right text-xs tabular-nums text-zinc-600">
                        {count}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {performance.sessions.topPaths.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                  Top landing pages (30d)
                </p>
              </div>
              <ul className="divide-y divide-zinc-800/40">
                {performance.sessions.topPaths.map(({ path, count }) => (
                  <li key={path} className="flex items-center justify-between px-4 py-2.5">
                    <span className="font-mono text-[11px] text-zinc-400">{formatPathLabel(path)}</span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-brand/50"
                          style={{ width: `${Math.round((count / sessionBreakdownScale) * 100)}%` }}
                        />
                      </div>
                      <span className="w-7 text-right text-xs tabular-nums text-zinc-600">
                        {count}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  const isEmpty = value === 0 || value === "0%" || value === "--";

  return (
    <div className="rounded-xl border border-zinc-800 border-t-2 border-t-zinc-700/60 bg-zinc-900/50 px-4 py-3.5">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
        {label}
      </p>
      <p
        className={`text-xl font-semibold tabular-nums leading-none sm:text-2xl ${
          isEmpty ? "text-zinc-700" : "text-zinc-200"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[10px] text-zinc-700">{sub}</p>}
    </div>
  );
}
