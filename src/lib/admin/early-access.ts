import "server-only";

import { requireInternalAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { PLAN_LABELS, type PlanSlug } from "@/lib/plan-identity";

export const EARLY_ACCESS_STATUSES = ["requested", "reviewing", "invited", "accepted", "declined"] as const;
export type EarlyAccessStatus = (typeof EARLY_ACCESS_STATUSES)[number];
export const EARLY_ACCESS_TEAM_SIZES = ["1–5", "6–20", "21–50", "51–100", "101–250", "251+"] as const;
export type EarlyAccessTeamSize = (typeof EARLY_ACCESS_TEAM_SIZES)[number];
export type EarlyAccessRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  company: string;
  role: string | null;
  team_size: EarlyAccessTeamSize;
  use_case: string;
  status: EarlyAccessStatus;
  source: string;
  source_path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  interested_plan: PlanSlug | null;
  confirmation_sent_at: string | null;
  confirmation_attempted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewerEmail?: string | null;
  notes: string | null;
};

export type EarlyAccessFilters = {
  status?: string;
  plan?: string;
  teamSize?: string;
  source?: string;
  utmSource?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
  page?: number;
};

export type EarlyAccessList = {
  rows: EarlyAccessRow[];
  total: number;
  page: number;
  pageSize: number;
  available: boolean;
};

function safeString(value: unknown) { return typeof value === "string" ? value : ""; }
function validIsoDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

export function earlyAccessPriority(row: Pick<EarlyAccessRow, "email" | "team_size" | "use_case" | "interested_plan">): "High" | "Normal" {
  const domain = row.email.split("@")[1]?.toLowerCase() ?? "";
  const personalDomains = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "proton.me", "protonmail.com"]);
  const businessEmail = Boolean(domain && !personalDomains.has(domain));
  const teamCanSupportWorkforce = !["", "1–5"].includes(row.team_size);
  const clearUseCase = row.use_case.trim().length >= 80;
  const higherPlanInterest = row.interested_plan === "workforce" || row.interested_plan === "scale";
  return [businessEmail, teamCanSupportWorkforce, clearUseCase, higherPlanInterest].filter(Boolean).length >= 3 ? "High" : "Normal";
}

export function getAllowedEarlyAccessTransition(current: string, next: string): EarlyAccessStatus | null {
  const allowed: Record<EarlyAccessStatus, readonly EarlyAccessStatus[]> = {
    requested: ["reviewing"],
    reviewing: ["invited", "declined"],
    invited: ["accepted"],
    accepted: [],
    declined: [],
  };
  if (!EARLY_ACCESS_STATUSES.includes(current as EarlyAccessStatus)) return null;
  if (!allowed[current as EarlyAccessStatus].includes(next as EarlyAccessStatus)) return null;
  return next as EarlyAccessStatus;
}

export async function getEarlyAccessList(filters: EarlyAccessFilters = {}): Promise<EarlyAccessList> {
  await requireInternalAdmin();
  const pageSize = 25;
  const page = Math.max(1, Math.min(999, Number.isInteger(filters.page) ? Number(filters.page) : 1));
  if (!hasSupabaseAdminConfig()) return { rows: [], total: 0, page, pageSize, available: false };
  const db = createSupabaseAdmin();
  let query = db.from("os_early_access_requests").select("*", { count: "exact" });

  if (EARLY_ACCESS_STATUSES.includes(filters.status as EarlyAccessStatus)) query = query.eq("status", filters.status);
  if (["foundation", "workforce", "scale"].includes(filters.plan ?? "")) query = query.eq("interested_plan", filters.plan);
  if (filters.plan === "none") query = query.is("interested_plan", null);
  if (EARLY_ACCESS_TEAM_SIZES.includes(filters.teamSize as EarlyAccessTeamSize)) query = query.eq("team_size", filters.teamSize);
  if (filters.source) query = query.eq("source", filters.source.slice(0, 80));
  if (filters.utmSource) query = query.eq("utm_source", filters.utmSource.slice(0, 200));
  const from = validIsoDate(filters.from);
  const to = validIsoDate(filters.to);
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) {
    const nextDay = new Date(`${to}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    query = query.lt("created_at", nextDay.toISOString());
  }
  const term = safeString(filters.search).trim().replace(/[^\p{L}\p{N}\s@._+\-]/gu, "").slice(0, 100);
  if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`);

  const sort = ["oldest", "company", "status", "team", "plan"].includes(filters.sort ?? "") ? filters.sort : "newest";
  if (sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (sort === "company") query = query.order("company", { ascending: true }).order("created_at", { ascending: false });
  else if (sort === "status") query = query.order("status", { ascending: true }).order("created_at", { ascending: false });
  else if (sort === "team") query = query.order("team_size", { ascending: true }).order("created_at", { ascending: false });
  else if (sort === "plan") query = query.order("interested_plan", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return { rows: [], total: 0, page, pageSize, available: false };
  return { rows: (data ?? []) as EarlyAccessRow[], total: count ?? 0, page, pageSize, available: true };
}

export async function getEarlyAccessRequest(id: string): Promise<EarlyAccessRow | null> {
  await requireInternalAdmin();
  if (!hasSupabaseAdminConfig() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = createSupabaseAdmin();
  const { data, error } = await db.from("os_early_access_requests").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const row = data as EarlyAccessRow;
  if (row.reviewed_by) {
    const reviewer = await db.from("os_internal_admins").select("email").eq("user_id", row.reviewed_by).maybeSingle();
    if (!reviewer.error && reviewer.data?.email) return { ...row, reviewerEmail: String(reviewer.data.email) };
  }
  return row;
}

export type EarlyAccessOverview = {
  available: boolean;
  total: number | null;
  today: number | null;
  last7Days: number | null;
  statuses: Record<EarlyAccessStatus, number | null>;
  attribution: Array<{ label: string; value: number }>;
  utmSources: Array<{ label: string; value: number }>;
  utmMediums: Array<{ label: string; value: number }>;
  campaigns: Array<{ label: string; value: number; accepted: number }>;
  teamSizes: Array<{ label: string; value: number }>;
  plans: Array<{ label: string; value: number }>;
  fromX: number | null;
  emailFailures: number | null;
  attributionSampleSize: number;
  reviewQueue: EarlyAccessRow[];
};

export async function getEarlyAccessOverview(): Promise<EarlyAccessOverview> {
  await requireInternalAdmin();
  const emptyStatuses = Object.fromEntries(EARLY_ACCESS_STATUSES.map((status) => [status, null])) as Record<EarlyAccessStatus, number | null>;
  if (!hasSupabaseAdminConfig()) return { available: false, total: null, today: null, last7Days: null, statuses: emptyStatuses, attribution: [], utmSources: [], utmMediums: [], campaigns: [], teamSizes: [], plans: [], fromX: null, emailFailures: null, attributionSampleSize: 0, reviewQueue: [] };

  const db = createSupabaseAdmin();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const statusCounts = await Promise.all(EARLY_ACCESS_STATUSES.map(async (status) => {
    const result = await db.from("os_early_access_requests").select("id", { count: "exact", head: true }).eq("status", status);
    return [status, result.error ? null : result.count ?? 0] as const;
  }));
  const [totalResult, todayResult, weekResult, reviewResult, attributionResult, emailFailuresResult] = await Promise.all([
    db.from("os_early_access_requests").select("id", { count: "exact", head: true }),
    db.from("os_early_access_requests").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    db.from("os_early_access_requests").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
    db.from("os_early_access_requests").select("*").in("status", ["requested", "reviewing"]).order("created_at", { ascending: false }).limit(30),
    db.from("os_early_access_requests").select("source,utm_source,utm_medium,utm_campaign,interested_plan,team_size,referrer,status").order("created_at", { ascending: false }).limit(500),
    db.from("os_early_access_requests").select("id", { count: "exact", head: true }).not("confirmation_attempted_at", "is", null).is("confirmation_sent_at", null),
  ]);
  const statuses = Object.fromEntries(statusCounts) as Record<EarlyAccessStatus, number | null>;
  const available = !totalResult.error && !todayResult.error && !weekResult.error && !reviewResult.error && !attributionResult.error && !emailFailuresResult.error && Object.values(statuses).every((value) => value !== null);
  if (!available) return { available: false, total: null, today: null, last7Days: null, statuses: emptyStatuses, attribution: [], utmSources: [], utmMediums: [], campaigns: [], teamSizes: [], plans: [], fromX: null, emailFailures: null, attributionSampleSize: 0, reviewQueue: [] };

  const attributionRows = (attributionResult.data ?? []) as Array<Record<string, unknown>>;
  const tally = (key: string, fallback: string) => {
    const counts = new Map<string, number>();
    for (const row of attributionRows) {
      const label = safeString(row[key]).trim() || fallback;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
  };
  const fromX = attributionRows.filter((row) => {
    const source = safeString(row.utm_source).toLowerCase();
    const referrer = safeString(row.referrer).toLowerCase();
    return ["x", "twitter", "twitter.com", "x.com"].includes(source) || referrer.includes("x.com/") || referrer.includes("twitter.com/");
  }).length;
  const campaigns = new Map<string, { value: number; accepted: number }>();
  for (const row of attributionRows) {
    const label = safeString(row.utm_campaign).trim() || "Unattributed";
    const current = campaigns.get(label) ?? { value: 0, accepted: 0 };
    current.value += 1;
    if (row.status === "accepted") current.accepted += 1;
    campaigns.set(label, current);
  }

  return {
    available: true,
    total: totalResult.count ?? 0,
    today: todayResult.count ?? 0,
    last7Days: weekResult.count ?? 0,
    statuses,
    attribution: tally("source", "Direct / untagged"),
    utmSources: tally("utm_source", "Unattributed"),
    utmMediums: tally("utm_medium", "Unattributed"),
    campaigns: [...campaigns.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 5).map(([label, value]) => ({ label, ...value })),
    teamSizes: tally("team_size", "Unknown"),
    plans: ["foundation", "workforce", "scale", "none"].map((plan) => ({
      label: plan === "none" ? "No plan" : PLAN_LABELS[plan as PlanSlug],
      value: attributionRows.filter((row) => plan === "none" ? !row.interested_plan : row.interested_plan === plan).length,
    })),
    fromX,
    emailFailures: emailFailuresResult.count ?? 0,
    attributionSampleSize: attributionRows.length,
    reviewQueue: ((reviewResult.data ?? []) as EarlyAccessRow[]).sort((a, b) => {
      const priorityOrder = Number(earlyAccessPriority(a) !== "High") - Number(earlyAccessPriority(b) !== "High");
      return priorityOrder || b.created_at.localeCompare(a.created_at);
    }).slice(0, 6),
  };
}
