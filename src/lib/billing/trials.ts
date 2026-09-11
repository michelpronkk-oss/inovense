import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBillingEntitlementsForPlan, type CheckoutPlanTier } from "@/lib/pricing";

export type TrialStatus = "active" | "consumed" | "converted" | "expired";

export type TrialEntitlement = {
  id: string;
  workspaceId: string;
  ownerUserId: string | null;
  billingCustomerId: string | null;
  trialPlan: CheckoutPlanTier;
  trialStartedAt: string;
  trialEndsAt: string | null;
  trialConsumedAt: string;
  trialStatus: TrialStatus;
  convertedPlan: string | null;
  convertedAt: string | null;
};

export type TrialEligibility = {
  eligible: boolean;
  reason: "eligible" | "already_consumed" | "history_unavailable";
  entitlement: TrialEntitlement | null;
  matchedBy: "workspace" | "owner" | "billing_customer" | null;
};

type Row = Record<string, unknown>;
type Supabase = SupabaseClient;

function asEntitlement(row: Row | null | undefined): TrialEntitlement | null {
  if (!row) return null;
  const status = String(row.trial_status ?? "");
  if (!["active", "consumed", "converted", "expired"].includes(status)) return null;
  const plan = String(row.trial_plan ?? "");
  if (plan !== "starter" && plan !== "growth" && plan !== "scale") return null;
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), ownerUserId: typeof row.owner_user_id === "string" ? row.owner_user_id : null,
    billingCustomerId: typeof row.billing_customer_id === "string" ? row.billing_customer_id : null,
    trialPlan: plan, trialStartedAt: String(row.trial_started_at), trialEndsAt: typeof row.trial_ends_at === "string" ? row.trial_ends_at : null,
    trialConsumedAt: String(row.trial_consumed_at), trialStatus: status as TrialStatus,
    convertedPlan: typeof row.converted_plan === "string" ? row.converted_plan : null,
    convertedAt: typeof row.converted_at === "string" ? row.converted_at : null,
  };
}

async function lookupTrial(supabase: Supabase, field: "workspace_id" | "owner_user_id" | "billing_customer_id", value: string | undefined) {
  if (!value) return { data: null as TrialEntitlement | null, error: null as unknown };
  try {
    const result = await supabase.from("os_trial_entitlements").select("*").eq(field, value).maybeSingle();
    return { data: asEntitlement(result.data as Row | null), error: result.error };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Server-side, fail-closed trial decision. It checks the workspace plus the
 * strongest currently available cross-workspace identities: verified owner
 * and Dodo customer. It never reads browser state or a plan query parameter.
 */
export async function getTrialEligibility(input: { supabase: Supabase; workspaceId: string; ownerUserId: string }) : Promise<TrialEligibility> {
  let customerId: string | undefined;
  try {
    const workspace = await input.supabase.from("os_workspaces").select("dodo_customer_id").eq("id", input.workspaceId).maybeSingle();
    if (workspace.error) return { eligible: false, reason: "history_unavailable", entitlement: null, matchedBy: null };
    const workspaceRow = workspace.data as Row | null;
    customerId = typeof workspaceRow?.dodo_customer_id === "string" ? workspaceRow.dodo_customer_id : undefined;
  } catch {
    return { eligible: false, reason: "history_unavailable", entitlement: null, matchedBy: null };
  }

  const matches = await Promise.all([
    lookupTrial(input.supabase, "workspace_id", input.workspaceId),
    lookupTrial(input.supabase, "owner_user_id", input.ownerUserId),
    lookupTrial(input.supabase, "billing_customer_id", customerId),
  ]);
  if (matches.some((match) => match.error)) return { eligible: false, reason: "history_unavailable", entitlement: null, matchedBy: null };
  const matchIndex = matches.findIndex((match) => Boolean(match.data));
  const entitlement = matchIndex >= 0 ? matches[matchIndex].data : null;
  const matchedBy = matchIndex === 0 ? "workspace" : matchIndex === 1 ? "owner" : matchIndex === 2 ? "billing_customer" : null;
  return entitlement
    ? { eligible: false, reason: "already_consumed", entitlement, matchedBy }
    : { eligible: true, reason: "eligible", entitlement: null, matchedBy: null };
}

export async function getWorkspaceTrialEntitlement(supabase: Supabase, workspaceId: string) {
  return lookupTrial(supabase, "workspace_id", workspaceId);
}

export async function recordTrialStarted(input: {
  supabase: Supabase; workspaceId: string; ownerUserId?: string; billingCustomerId?: string; plan: CheckoutPlanTier; trialEndsAt?: string;
}) {
  const existing = await getWorkspaceTrialEntitlement(input.supabase, input.workspaceId);
  if (existing.error) return { entitlement: null, created: false, error: existing.error };
  if (existing.data) return { entitlement: existing.data, created: false, error: null };

  const now = new Date().toISOString();
  const result = await input.supabase.from("os_trial_entitlements").insert({
    workspace_id: input.workspaceId,
    owner_user_id: input.ownerUserId ?? null,
    billing_customer_id: input.billingCustomerId ?? null,
    trial_plan: input.plan,
    trial_started_at: now,
    trial_ends_at: input.trialEndsAt ?? null,
    trial_consumed_at: now,
    trial_status: "active",
  }).select("*").maybeSingle();
  return { entitlement: asEntitlement(result.data as Row | null), created: !result.error, error: result.error };
}

const ORGANIC_TRIAL_PLAN: CheckoutPlanTier = "starter";
const ORGANIC_TRIAL_DAYS = 3;

export type OrganicTrialOutcome = "granted" | "not_preview" | "not_eligible" | "history_unavailable" | "workspace_unavailable";

/**
 * Grants the existing 3-day Foundation trial, without a Dodo checkout or
 * card details, so a workspace can move from Preview to real entitlement
 * instead of hitting a plan gate. Must ONLY be called from an explicit,
 * user-triggered action (POST /api/billing/trial/start) - never from the
 * app gateway, onboarding load, or any other passive navigation, per the
 * product rule that opening Auterim must never itself start a trial.
 *
 * Idempotent and safe to call more than once for the same workspace: it is
 * a no-op the moment billing_status moves off `preview` (trial granted,
 * on a real plan, or genuinely ineligible), and getTrialEligibility's
 * owner/customer/workspace checks plus the unique constraints on
 * os_trial_entitlements prevent a second trial for the same owner or
 * workspace.
 */
export async function ensureOrganicTrial(input: {
  supabase: Supabase; workspaceId: string; ownerUserId: string;
}): Promise<{ granted: boolean; outcome: OrganicTrialOutcome }> {
  const workspace = await input.supabase
    .from("os_workspaces")
    .select("plan_tier, billing_status")
    .eq("id", input.workspaceId)
    .maybeSingle();
  if (workspace.error || !workspace.data) return { granted: false, outcome: "workspace_unavailable" };
  const row = workspace.data as Row;
  if (row.plan_tier !== "preview" || row.billing_status !== "preview") {
    return { granted: false, outcome: "not_preview" };
  }

  const eligibility = await getTrialEligibility({ supabase: input.supabase, workspaceId: input.workspaceId, ownerUserId: input.ownerUserId });
  if (!eligibility.eligible) return { granted: false, outcome: eligibility.reason === "history_unavailable" ? "history_unavailable" : "not_eligible" };

  const trialEndsAt = new Date(Date.now() + ORGANIC_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const entitlements = getBillingEntitlementsForPlan(ORGANIC_TRIAL_PLAN);

  const trial = await recordTrialStarted({
    supabase: input.supabase,
    workspaceId: input.workspaceId,
    ownerUserId: input.ownerUserId,
    plan: ORGANIC_TRIAL_PLAN,
    trialEndsAt,
  });
  // A concurrent request may have won the insert first (unique workspace_id /
  // owner_user_id constraints) - treat that as "already handled", not an error.
  if (trial.error || !trial.created) return { granted: false, outcome: "not_eligible" };

  const updated = await input.supabase.from("os_workspaces").update({
    plan: "Foundation",
    plan_tier: entitlements.planTier,
    billing_status: "trialing",
    trial_ends_at: trialEndsAt,
    operators_limit: entitlements.operatorsLimit,
    connectors_limit: String(entitlements.connectorsLimit),
    actions_limit: entitlements.actionsLimit,
    log_retention_days: entitlements.logRetentionDays,
    can_use_real_connectors: entitlements.canUseRealConnectors,
    can_run_real_actions: entitlements.canRunRealActions,
    support_level: entitlements.supportLevel,
    billing_updated_at: new Date().toISOString(),
  }).eq("id", input.workspaceId);
  if (updated.error) return { granted: false, outcome: "workspace_unavailable" };

  return { granted: true, outcome: "granted" };
}

export async function updateTrialStatus(input: {
  supabase: Supabase; workspaceId: string; status: TrialStatus; convertedPlan?: string; convertedAt?: string;
}) {
  const patch: Row = { trial_status: input.status };
  if (input.convertedPlan) patch.converted_plan = input.convertedPlan;
  if (input.convertedAt) patch.converted_at = input.convertedAt;
  return input.supabase.from("os_trial_entitlements").update(patch).eq("workspace_id", input.workspaceId);
}
