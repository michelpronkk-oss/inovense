import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { TrafficSession } from "@/lib/supabase-server";

type SourceRow = { source: string | null; count: number };
type PathRow = { path: string | null; count: number };

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

function fmtSource(source: string | null): string {
  if (!source) return "Unknown";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function fmtPath(path: string | null): string {
  if (!path || path === "/") return "/";
  return path.length > 32 ? path.slice(0, 30) + "…" : path;
}

export async function TrafficAttributionBlock() {
  let sessions: Pick<TrafficSession, "first_seen_at" | "first_touch_source" | "landing_path">[] = [];
  let recentLeads: { first_touch_source: string | null; landing_path: string | null; created_at: string }[] = [];
  let error = false;

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

    if (sessionResult.error) throw sessionResult.error;
    sessions = sessionResult.data ?? [];
    recentLeads = leadResult.data ?? [];
  } catch {
    error = true;
  }

  if (error) return null;
  if (sessions.length === 0 && recentLeads.length === 0) return null;

  const todayStart = startOf(0);
  const sevenDaysAgo = startOf(7);

  const sessionsToday = sessions.filter((s) => s.first_seen_at >= todayStart).length;
  const sessions7d = sessions.filter((s) => s.first_seen_at >= sevenDaysAgo).length;
  const sessions30d = sessions.length;
  const leads30d = recentLeads.length;

  // Top sources by session count
  const sourceMap = new Map<string, number>();
  for (const s of sessions) {
    const key = s.first_touch_source ?? "unknown";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const topSources: SourceRow[] = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top landing pages by session count
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

  return (
    <div className="mb-8">
      <div className="mb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-700">
          Traffic + Attribution
        </p>
      </div>

      {/* Session counts */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sessions today" value={sessionsToday} />
        <StatCard label="Sessions 7d" value={sessions7d} />
        <StatCard label="Sessions 30d" value={sessions30d} />
        <StatCard
          label="Conversion 30d"
          value={conversionRate}
          sub={`${leads30d} lead${leads30d !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Sources + Landing pages */}
      {(topSources.length > 0 || topPaths.length > 0) && (
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
                  <li key={source ?? "unknown"} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-zinc-400">{fmtSource(source)}</span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-brand/50"
                          style={{ width: `${Math.round((count / sessions30d) * 100)}%` }}
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
                  <li key={path ?? "/"} className="flex items-center justify-between px-4 py-2.5">
                    <span className="font-mono text-[11px] text-zinc-400">{fmtPath(path)}</span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-brand/50"
                          style={{ width: `${Math.round((count / sessions30d) * 100)}%` }}
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
  const isEmpty = value === 0 || value === "0%";
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
