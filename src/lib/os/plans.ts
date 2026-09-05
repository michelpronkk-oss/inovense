// Inovense OS — Plan definitions and limit enforcement

export type PlanId = "preview" | "starter" | "growth" | "operator" | "enterprise";

export interface PlanLimits {
  name: string;
  price: string;
  maxOperators: number;       // -1 = unlimited
  maxConnectors: number;
  maxMonthlyRuns: number;
  maxTeamMembers: number;
  logRetentionDays: number;   // -1 = custom
  policies: boolean;
  approvals: boolean;
  executionLogs: boolean;
  companyMemory: boolean;
  insights: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  preview: {
    name: "Preview",
    price: "Preview",
    maxOperators: 1,
    maxConnectors: 0,
    maxMonthlyRuns: 0,
    maxTeamMembers: 3,
    logRetentionDays: 7,
    policies: true,
    approvals: true,
    executionLogs: true,
    companyMemory: true,
    insights: false,
  },
  starter: {
    name: "Foundation",
    price: "$299/mo",
    maxOperators: 3,
    maxConnectors: 3,
    maxMonthlyRuns: 1000,
    maxTeamMembers: 3,
    logRetentionDays: 30,
    policies: true,
    approvals: true,
    executionLogs: true,
    companyMemory: true,
    insights: false,
  },
  growth: {
    name: "Workforce",
    price: "$799/mo",
    maxOperators: 8,
    maxConnectors: 8,
    maxMonthlyRuns: 5000,
    maxTeamMembers: 8,
    logRetentionDays: 90,
    policies: true,
    approvals: true,
    executionLogs: true,
    companyMemory: true,
    insights: false,
  },
  operator: {
    name: "Operator",
    price: "$2,500/mo",
    maxOperators: 12,
    maxConnectors: -1,
    maxMonthlyRuns: 100000,
    maxTeamMembers: 20,
    logRetentionDays: 180,
    policies: true,
    approvals: true,
    executionLogs: true,
    companyMemory: true,
    insights: true,
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    maxOperators: -1,
    maxConnectors: -1,
    maxMonthlyRuns: -1,
    maxTeamMembers: -1,
    logRetentionDays: -1,
    policies: true,
    approvals: true,
    executionLogs: true,
    companyMemory: true,
    insights: true,
  },
};

/** Normalize raw plan string from DB/seed to a PlanId */
export function resolvePlanId(raw: string): PlanId {
  const s = raw.toLowerCase();
  if (s.includes("preview")) return "preview";
  if (s.includes("enterprise")) return "enterprise";
  if (s.includes("operator")) return "operator";
  if (s.includes("growth") || s.includes("workforce")) return "growth";
  return "starter";
}

export function getPlanLimits(raw: string): PlanLimits {
  return PLAN_LIMITS[resolvePlanId(raw)];
}

export function isAtOperatorLimit(raw: string, activeCount: number): boolean {
  const { maxOperators } = getPlanLimits(raw);
  return maxOperators !== -1 && activeCount >= maxOperators;
}

export function isAtConnectorLimit(raw: string, connectedCount: number): boolean {
  const { maxConnectors } = getPlanLimits(raw);
  return maxConnectors !== -1 && connectedCount >= maxConnectors;
}

export function isAtMemberLimit(raw: string, memberCount: number): boolean {
  const { maxTeamMembers } = getPlanLimits(raw);
  return maxTeamMembers !== -1 && memberCount >= maxTeamMembers;
}

/** Days remaining in trial. Returns null if no trial or already expired. */
export function trialDaysRemaining(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

export function isTrialExpired(trialEndsAt?: string): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() < Date.now();
}
