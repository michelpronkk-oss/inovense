import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { TrafficSession } from "@/lib/supabase-server";

type SourceRow = { source: string; count: number };
type PathRow = { path: string; count: number };

function startOf(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

function fmtPct(num: number, den: number): string {
  if (den === 0) return "0%";
  return `${((num / den) * 100).toFixed(1)}%`;
}

function fmtSource(source: string): string {
  if (!source || source === "unknown") return "Unknown";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function fmtPath(path: string): string {
  if (!path || path === "/") return "/";
  return path.length > 32 ? path.slice(0, 30) + "..." : path;
}

export async function TrafficAttributionBlock() {
  let sessions: Pick<TrafficSession, "first_seen_at" | "first_touch_source" | "landing_path">[] = [];
  let recentLeads: { first_touch_source: string | null; landing_path: string | null; created_at: string }[] = [];
  let sessionsQueryFailed = false;
  let leadsQueryFailed = false;

  try {
    const supabase = createSupabaseServerClient();
    const thirtyDaysAgo = startOf(30);

    const [sessionResult, leadResult] = await Promise.all([
      supabase
        .from("traffic_sessions")
        .select("first_seen_at, first_touch_source, landing_path")
        .gte("first_seen_at", thirtyDaysAgo)
        .order("first_seen_at", { ascending: false }),
      supabase
        .from("leads")
        .select("first_touch_source, landing_path, created_at")
        .gte("created_at", thirtyDaysAgo),
    ]);

    if (sessionResult.error) {
      sessionsQueryFailed = true;
    } else {
      sessions = sessionResult.data ?? [];
    }

    if (leadResult.error) {
      leadsQueryFailed = true;
    } else {
      recentLeads = leadResult.data ?? [];
    }
  } catch {
    sessionsQueryFailed = true;
    leadsQueryFailed = true;
  }

  const todayStart = startOf(0);
  const sevenDaysAgo = startOf(7);

  const sessionsToday = sessions.filter((s) => s.first_seen_at >= todayStart).length;
  const sessions7d = sessions.filter((s) => s.first_seen_at >= sevenDaysAgo).length;
  const sessions30d = sessions.length;
  const leads30d = recentLeads.length;
  const hasTrafficData = sessions30d > 0;
  const hasLeadData = leads30d > 0;
  const hasAnyData = hasTrafficData || hasLeadData;

  const sourceMap = new Map<string, number>();
  for (const s of sessions) {
    const key = s.first_touch_source ?? "unknown";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const topSources: SourceRow[] = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const pathMap = new Map<string, number>();
  for (const s of sessions) {
    const key = s.landing_path ?? "/";
    pathMap.set(key, (pathMap.get(key) ?? 0) + 1);
  }
  const topPaths: PathRow[] = Array.from(pathMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const conversionRate = fmtPct(leads30d, sessions30d);
  const showSessionBreakdowns = topSources.length > 0 || topPaths.length > 0;

  const sessionsTodayValue: string | number = sessionsQueryFailed ? "--" : sessionsToday;
  const sessions7dValue: string | number = sessionsQueryFailed ? "--" : sessions7d;
  const sessions30dValue: string | number = sessionsQueryFailed ? "--" : sessions30d;
  const conversionValue: string | number =
    sessionsQueryFailed || leadsQueryFailed ? "--" : conversionRate;

  const conversionSub =
    sessionsQueryFailed || leadsQueryFailed
      ? "Awaiting complete attribution data"
      : `${leads30d} lead${leads30d !== 1 ? "s" : ""}`;

  const sessionBreakdownScale = Math.max(sessions30d, 1);

  let stateTitle: string | null = null;
  let stateBody: string | null = null;

  if (sessionsQueryFailed && leadsQueryFailed) {
    stateTitle = "Traffic data is temporarily unavailable";
    stateBody =
      "This panel stays visible so the team can verify status quickly. Check the latest traffic migration and access policies.";
  } else if (sessionsQueryFailed) {
    stateTitle = "Session stream is unavailable";
    stateBody =
      "Lead attribution fields are readable, but traffic session rows are not. Verify migration and RLS/service-role access.";
  } else if (leadsQueryFailed) {
    stateTitle = "Lead attribution fields are unavailable";
    stateBody =
      "Traffic session rows are readable, but lead attribution columns are not. Verify migration and column permissions.";
  } else if (!hasAnyData) {
    stateTitle = "No tracked sessions in the last 30 days";
    stateBody =
      "Once visitors land on tracked pages, top sources and landing pages will populate here automatically.";
  } else if (!hasTrafficData && hasLeadData) {
    stateTitle = "Leads detected, sessions pending";
    stateBody =
      "Recent leads exist, but there are no tracked session rows in the last 30 days yet.";
  }

  return (
    <div className="mb-8">
      <div className="mb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
          Traffic + Attribution
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sessions today" value={sessionsTodayValue} />
        <StatCard label="Sessions 7d" value={sessions7dValue} />
        <StatCard label="Sessions 30d" value={sessions30dValue} />
        <StatCard label="Conversion 30d" value={conversionValue} sub={conversionSub} />
      </div>

      {stateTitle && stateBody && (
        <div className="mb-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3.5">
          <p className="text-xs font-medium text-zinc-300">{stateTitle}</p>
          <p className="mt-1.5 text-[11px] text-zinc-600">{stateBody}</p>
        </div>
      )}

      {showSessionBreakdowns && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topSources.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                  Top sources (30d)
                </p>
              </div>
              <ul className="divide-y divide-zinc-800/40">
                {topSources.map(({ source, count }) => (
                  <li key={source} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-zinc-400">{fmtSource(source)}</span>
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

          {topPaths.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                  Landing pages (30d)
                </p>
              </div>
              <ul className="divide-y divide-zinc-800/40">
                {topPaths.map(({ path, count }) => (
                  <li key={path} className="flex items-center justify-between px-4 py-2.5">
                    <span className="font-mono text-[11px] text-zinc-400">{fmtPath(path)}</span>
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
