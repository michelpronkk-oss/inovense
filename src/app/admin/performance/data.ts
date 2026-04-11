import { derivePaymentState } from "@/lib/payment-utils";
import { createSupabaseServerClient, type Lead, type TrafficSession } from "@/lib/supabase-server";

const WINDOW_DAYS = 30;
const LOOKBACK_DAYS = WINDOW_DAYS * 2;

type TrendDirection = "up" | "down" | "flat";

type SessionRow = Pick<TrafficSession, "first_seen_at" | "first_touch_source" | "landing_path">;

type LeadRow = Pick<
  Lead,
  | "created_at"
  | "status"
  | "project_status"
  | "first_touch_source"
  | "landing_path"
  | "proposal_price"
  | "proposal_deposit"
  | "deposit_amount"
  | "deposit_paid_at"
  | "final_payment_paid_at"
>;

export type PerformanceSourceBreakdown = {
  source: string;
  count: number;
};

export type PerformancePathBreakdown = {
  path: string;
  count: number;
};

export type PerformanceSourceOutcome = {
  source: string;
  sessions: number;
  leads: number;
  sessionToLeadRate: string;
  won: number;
  leadToWonRate: string;
  depositPaid: number;
  wonToDepositRate: string;
  completed: number;
};

export type PerformanceLandingOutcome = {
  path: string;
  sessions: number;
  leads: number;
  sessionToLeadRate: string;
  won: number;
  depositPaid: number;
};

export type CountComparison = {
  current: number;
  previous: number;
  delta: number;
  direction: TrendDirection;
};

export type RateComparison = {
  currentNumerator: number;
  currentDenominator: number;
  previousNumerator: number;
  previousDenominator: number;
  currentRate: string;
  previousRate: string;
  deltaPp: number;
  direction: TrendDirection;
};

export type PerformanceSignal = {
  id:
    | "strongest_source"
    | "weakest_stage"
    | "top_landing_page"
    | "biggest_dropoff"
    | "focus_area";
  title: string;
  text: string;
  tone: "positive" | "attention" | "neutral";
};

export type AdminPerformanceSnapshot = {
  windowDays: number;
  query: {
    sessionsFailed: boolean;
    leadsFailed: boolean;
    health: "healthy" | "partial" | "unavailable";
  };
  comparison: {
    sessions30d: CountComparison;
    leads30d: CountComparison;
    sessionToLead30d: RateComparison;
  };
  sessions: {
    today: number;
    last7d: number;
    last30d: number;
    topSources: PerformanceSourceBreakdown[];
    topPaths: PerformancePathBreakdown[];
  };
  leads: {
    captured30d: number;
    sessionToLeadRate: string;
  };
  funnel: {
    leads30d: number;
    won30d: number;
    leadToWonRate: string;
    wonWithDeposit30d: number;
    wonToDepositRate: string;
    depositPaid30d: number;
    completedFromDeposit30d: number;
    depositToCompletedRate: string;
  };
  sourceOutcomes: PerformanceSourceOutcome[];
  landingOutcomes: PerformanceLandingOutcome[];
  signals: PerformanceSignal[];
};

function startOfUtcDay(daysAgo: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString();
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function fmtPct(numerator: number, denominator: number): string {
  return `${(ratio(numerator, denominator) * 100).toFixed(1)}%`;
}

function trendDirection(delta: number, epsilon = 0.0001): TrendDirection {
  if (delta > epsilon) return "up";
  if (delta < -epsilon) return "down";
  return "flat";
}

function buildCountComparison(current: number, previous: number): CountComparison {
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    direction: trendDirection(delta),
  };
}

function buildRateComparison(
  currentNumerator: number,
  currentDenominator: number,
  previousNumerator: number,
  previousDenominator: number
): RateComparison {
  const currentRatio = ratio(currentNumerator, currentDenominator);
  const previousRatio = ratio(previousNumerator, previousDenominator);
  const deltaPp = (currentRatio - previousRatio) * 100;

  return {
    currentNumerator,
    currentDenominator,
    previousNumerator,
    previousDenominator,
    currentRate: `${(currentRatio * 100).toFixed(1)}%`,
    previousRate: `${(previousRatio * 100).toFixed(1)}%`,
    deltaPp,
    direction: trendDirection(deltaPp, 0.05),
  };
}

function isDepositPaid(lead: LeadRow): boolean {
  const paymentState = derivePaymentState(lead);
  return paymentState.kind === "deposit_paid" || paymentState.kind === "fully_paid";
}

export function formatSourceLabel(source: string): string {
  if (!source || source === "unknown") return "Unknown";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function formatPathLabel(path: string): string {
  if (!path || path === "/") return "/";
  return path.length > 36 ? `${path.slice(0, 33)}...` : path;
}

export async function getAdminPerformanceSnapshot(): Promise<AdminPerformanceSnapshot> {
  let sessions: SessionRow[] = [];
  let leads: LeadRow[] = [];
  let sessionsFailed = false;
  let leadsFailed = false;

  const currentWindowStart = startOfUtcDay(WINDOW_DAYS);
  const previousWindowStart = startOfUtcDay(LOOKBACK_DAYS);

  try {
    const supabase = createSupabaseServerClient();

    const [sessionResult, leadResult] = await Promise.all([
      supabase
        .from("traffic_sessions")
        .select("first_seen_at, first_touch_source, landing_path")
        .gte("first_seen_at", previousWindowStart)
        .order("first_seen_at", { ascending: false }),
      supabase
        .from("leads")
        .select(
          "created_at, status, project_status, first_touch_source, landing_path, proposal_price, proposal_deposit, deposit_amount, deposit_paid_at, final_payment_paid_at"
        )
        .gte("created_at", previousWindowStart),
    ]);

    if (sessionResult.error) {
      sessionsFailed = true;
    } else {
      sessions = (sessionResult.data ?? []) as SessionRow[];
    }

    if (leadResult.error) {
      leadsFailed = true;
    } else {
      leads = (leadResult.data ?? []) as LeadRow[];
    }
  } catch {
    sessionsFailed = true;
    leadsFailed = true;
  }

  const sessionsCurrent = sessions.filter((session) => session.first_seen_at >= currentWindowStart);
  const sessionsPrevious = sessions.filter((session) => session.first_seen_at < currentWindowStart);

  const leadsCurrent = leads.filter((lead) => lead.created_at >= currentWindowStart);
  const leadsPrevious = leads.filter((lead) => lead.created_at < currentWindowStart);

  const todayStart = startOfUtcDay(0);
  const sevenDaysAgo = startOfUtcDay(7);

  const sessionsToday = sessionsCurrent.filter((session) => session.first_seen_at >= todayStart).length;
  const sessions7d = sessionsCurrent.filter((session) => session.first_seen_at >= sevenDaysAgo).length;
  const sessions30d = sessionsCurrent.length;

  const sessionsBySource = new Map<string, number>();
  const sessionsByLanding = new Map<string, number>();

  for (const session of sessionsCurrent) {
    const sourceKey = session.first_touch_source ?? "unknown";
    sessionsBySource.set(sourceKey, (sessionsBySource.get(sourceKey) ?? 0) + 1);

    const landingKey = session.landing_path ?? "/";
    sessionsByLanding.set(landingKey, (sessionsByLanding.get(landingKey) ?? 0) + 1);
  }

  const topSources: PerformanceSourceBreakdown[] = Array.from(sessionsBySource.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topPaths: PerformancePathBreakdown[] = Array.from(sessionsByLanding.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const leads30d = leadsCurrent.length;
  const sessionToLeadRate = fmtPct(leads30d, sessions30d);

  const wonLeads = leadsCurrent.filter((lead) => lead.status === "won");
  const won30d = wonLeads.length;

  const depositPaidLeads = leadsCurrent.filter((lead) => isDepositPaid(lead));
  const depositPaid30d = depositPaidLeads.length;

  const wonWithDeposit30d = wonLeads.filter((lead) => isDepositPaid(lead)).length;
  const completedFromDeposit30d = depositPaidLeads.filter(
    (lead) => lead.project_status === "completed"
  ).length;

  const leadToWonRate = fmtPct(won30d, leads30d);
  const wonToDepositRate = fmtPct(wonWithDeposit30d, won30d);
  const depositToCompletedRate = fmtPct(completedFromDeposit30d, depositPaid30d);

  const sourceOutcomesMap = new Map<
    string,
    { source: string; leads: number; won: number; depositPaid: number; completed: number }
  >();

  for (const lead of leadsCurrent) {
    const source = lead.first_touch_source ?? "unknown";
    const current = sourceOutcomesMap.get(source) ?? {
      source,
      leads: 0,
      won: 0,
      depositPaid: 0,
      completed: 0,
    };

    current.leads += 1;
    if (lead.status === "won") current.won += 1;
    if (isDepositPaid(lead)) current.depositPaid += 1;
    if (lead.project_status === "completed") current.completed += 1;

    sourceOutcomesMap.set(source, current);
  }

  const sourceOutcomes: PerformanceSourceOutcome[] = Array.from(sourceOutcomesMap.values())
    .map((row) => {
      const sessionsForSource = sessionsBySource.get(row.source) ?? 0;
      return {
        source: row.source,
        sessions: sessionsForSource,
        leads: row.leads,
        sessionToLeadRate: fmtPct(row.leads, sessionsForSource),
        won: row.won,
        leadToWonRate: fmtPct(row.won, row.leads),
        depositPaid: row.depositPaid,
        wonToDepositRate: fmtPct(row.depositPaid, row.won),
        completed: row.completed,
      };
    })
    .sort((a, b) => b.leads - a.leads || b.won - a.won || b.sessions - a.sessions)
    .slice(0, 6);

  const landingOutcomesMap = new Map<
    string,
    { path: string; sessions: number; leads: number; won: number; depositPaid: number }
  >();

  for (const [path, count] of sessionsByLanding.entries()) {
    landingOutcomesMap.set(path, {
      path,
      sessions: count,
      leads: 0,
      won: 0,
      depositPaid: 0,
    });
  }

  for (const lead of leadsCurrent) {
    const path = lead.landing_path ?? "/";
    const current = landingOutcomesMap.get(path) ?? {
      path,
      sessions: 0,
      leads: 0,
      won: 0,
      depositPaid: 0,
    };

    current.leads += 1;
    if (lead.status === "won") current.won += 1;
    if (isDepositPaid(lead)) current.depositPaid += 1;

    landingOutcomesMap.set(path, current);
  }

  const landingOutcomes: PerformanceLandingOutcome[] = Array.from(landingOutcomesMap.values())
    .map((row) => ({
      path: row.path,
      sessions: row.sessions,
      leads: row.leads,
      sessionToLeadRate: fmtPct(row.leads, row.sessions),
      won: row.won,
      depositPaid: row.depositPaid,
    }))
    .sort((a, b) => b.leads - a.leads || b.won - a.won || b.sessions - a.sessions)
    .slice(0, 8);

  const sessionsComparison = buildCountComparison(sessionsCurrent.length, sessionsPrevious.length);
  const leadsComparison = buildCountComparison(leadsCurrent.length, leadsPrevious.length);
  const sessionToLeadComparison = buildRateComparison(
    leadsCurrent.length,
    sessionsCurrent.length,
    leadsPrevious.length,
    sessionsPrevious.length
  );

  const stageRows = [
    { stage: "Lead -> Won", numerator: won30d, denominator: leads30d },
    {
      stage: "Won -> Deposit Paid",
      numerator: wonWithDeposit30d,
      denominator: won30d,
    },
    {
      stage: "Deposit Paid -> Completed",
      numerator: completedFromDeposit30d,
      denominator: depositPaid30d,
    },
  ].filter((row) => row.denominator > 0);

  const weakestStage =
    stageRows.length > 0
      ? stageRows.reduce((lowest, current) =>
          ratio(current.numerator, current.denominator) < ratio(lowest.numerator, lowest.denominator)
            ? current
            : lowest
        )
      : null;

  const biggestDropoff =
    stageRows.length > 0
      ? stageRows.reduce((largest, current) => {
          const currentDrop = current.denominator - current.numerator;
          const largestDrop = largest.denominator - largest.numerator;
          return currentDrop > largestDrop ? current : largest;
        })
      : null;

  const strongestSource = (() => {
    if (sourceOutcomes.length === 0) return null;

    const qualityCandidates = sourceOutcomes.filter((source) => source.leads >= 2);
    if (qualityCandidates.length > 0) {
      return qualityCandidates
        .slice()
        .sort((a, b) => {
          const aRatio = ratio(a.won, a.leads);
          const bRatio = ratio(b.won, b.leads);
          if (bRatio !== aRatio) return bRatio - aRatio;
          if (b.won !== a.won) return b.won - a.won;
          return b.leads - a.leads;
        })[0];
    }

    return sourceOutcomes[0];
  })();

  const topLandingByLeads = landingOutcomes.find((row) => row.leads > 0) ?? null;

  const signals: PerformanceSignal[] = [];

  if (!leadsFailed && strongestSource) {
    signals.push({
      id: "strongest_source",
      title: "Strongest source",
      text: `${formatSourceLabel(strongestSource.source)} leads this window with ${strongestSource.leads} leads, ${strongestSource.won} won, and ${strongestSource.depositPaid} deposit paid.`,
      tone: "positive",
    });
  }

  if (!leadsFailed && weakestStage) {
    signals.push({
      id: "weakest_stage",
      title: "Weakest stage",
      text: `${weakestStage.stage} is currently the weakest active stage at ${fmtPct(
        weakestStage.numerator,
        weakestStage.denominator
      )} (${weakestStage.numerator}/${weakestStage.denominator}).`,
      tone: "attention",
    });
  }

  if (!sessionsFailed && !leadsFailed && topLandingByLeads) {
    signals.push({
      id: "top_landing_page",
      title: "Top landing page by leads",
      text: `${formatPathLabel(topLandingByLeads.path)} generated ${topLandingByLeads.leads} leads from ${topLandingByLeads.sessions} sessions (${topLandingByLeads.sessionToLeadRate}).`,
      tone: "positive",
    });
  }

  if (!leadsFailed && biggestDropoff) {
    const dropped = biggestDropoff.denominator - biggestDropoff.numerator;
    signals.push({
      id: "biggest_dropoff",
      title: "Biggest drop-off",
      text: `${biggestDropoff.stage} has the largest absolute drop-off at ${dropped} records (${biggestDropoff.numerator}/${biggestDropoff.denominator} progressed).`,
      tone: "attention",
    });
  }

  if (!sessionsFailed && !leadsFailed) {
    if (sessionToLeadComparison.direction === "down" && Math.abs(sessionToLeadComparison.deltaPp) >= 0.5) {
      signals.push({
        id: "focus_area",
        title: "Focus this week",
        text: `Recover Session -> Lead efficiency. It moved from ${sessionToLeadComparison.previousRate} to ${sessionToLeadComparison.currentRate} (${sessionToLeadComparison.deltaPp.toFixed(1)}pp).`,
        tone: "attention",
      });
    } else if (weakestStage) {
      signals.push({
        id: "focus_area",
        title: "Focus this week",
        text: `Prioritize ${weakestStage.stage}. It is the current bottleneck at ${fmtPct(
          weakestStage.numerator,
          weakestStage.denominator
        )}.`,
        tone: "neutral",
      });
    }
  }

  const health = sessionsFailed && leadsFailed
    ? "unavailable"
    : sessionsFailed || leadsFailed
      ? "partial"
      : "healthy";

  return {
    windowDays: WINDOW_DAYS,
    query: {
      sessionsFailed,
      leadsFailed,
      health,
    },
    comparison: {
      sessions30d: sessionsComparison,
      leads30d: leadsComparison,
      sessionToLead30d: sessionToLeadComparison,
    },
    sessions: {
      today: sessionsToday,
      last7d: sessions7d,
      last30d: sessions30d,
      topSources,
      topPaths,
    },
    leads: {
      captured30d: leads30d,
      sessionToLeadRate,
    },
    funnel: {
      leads30d,
      won30d,
      leadToWonRate,
      wonWithDeposit30d,
      wonToDepositRate,
      depositPaid30d,
      completedFromDeposit30d,
      depositToCompletedRate,
    },
    sourceOutcomes,
    landingOutcomes,
    signals,
  };
}
