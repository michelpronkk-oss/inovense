import { NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { ensureOrganicTrial } from "@/lib/billing/trials";
import { sendTrialLifecycleEmail } from "@/lib/billing/trial-notifications";

/**
 * The single, authoritative "Start 3-day trial" action. This is the ONLY
 * place a trial is ever granted without a Dodo checkout - every caller
 * (onboarding, /connectors, dashboard, /plans) hits this same route so
 * there is exactly one trial-start code path, not one per surface.
 *
 * Requires a verified session and workspace owner/admin membership.
 * Idempotent: a workspace already off `preview` (trialing, active, or
 * otherwise) is reported back as its current real state rather than
 * erroring or granting a second trial - safe for a double click, a retry
 * after a dropped response, or two open tabs.
 */
export async function POST() {
  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sign in to continue." }, { status: 401 });

  const admin = createSupabaseAdmin();
  const workspaceId = await resolveActiveWorkspaceId(user.id, admin);
  if (!workspaceId) return NextResponse.json({ ok: false, error: "No workspace found for your account yet." }, { status: 404 });

  try {
    await requireWorkspaceAdmin(user.id, workspaceId, admin);
  } catch {
    return NextResponse.json({ ok: false, error: "Only a workspace owner or admin can start a trial." }, { status: 403 });
  }

  const before = await admin
    .from("os_workspaces")
    .select("plan_tier, billing_status, trial_ends_at")
    .eq("id", workspaceId)
    .maybeSingle();
  if (before.error || !before.data) {
    return NextResponse.json({ ok: false, error: "Could not read workspace billing state." }, { status: 500 });
  }

  if (before.data.plan_tier !== "preview" || before.data.billing_status !== "preview") {
    // Already trialing/paid/past_due/canceled - never overwritten here.
    return NextResponse.json({
      ok: true,
      status: before.data.billing_status === "trialing" ? "already_active" : "not_applicable",
      planTier: before.data.plan_tier,
      billingStatus: before.data.billing_status,
      trialEndsAt: before.data.trial_ends_at,
    });
  }

  const result = await ensureOrganicTrial({ supabase: admin, workspaceId, ownerUserId: user.id });
  if (!result.granted) {
    const error = result.outcome === "not_eligible"
      ? "This account has already used its Auterim trial. Choose a plan to continue."
      : "The trial could not be started. Please try again or choose a plan.";
    return NextResponse.json({ ok: false, error, outcome: result.outcome }, { status: 409 });
  }

  const after = await admin
    .from("os_workspaces")
    .select("plan_tier, billing_status, trial_ends_at")
    .eq("id", workspaceId)
    .maybeSingle();

  try {
    await sendTrialLifecycleEmail({
      supabase: admin,
      workspaceId,
      eventKey: `trial-started:organic:${workspaceId}`,
      type: "trial_started",
      plan: "starter",
      trialEndsAt: after.data?.trial_ends_at ?? undefined,
    });
  } catch {
    // Non-fatal: the trial itself is already granted and persisted.
  }

  await admin.from("os_execution_logs").insert({
    id: `log-billing-trial-${Date.now()}-${workspaceId}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "billing",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "billing.trial_started",
    message: "Started 3-day Foundation trial",
    duration: "-",
    status: "ok",
  });

  return NextResponse.json({
    ok: true,
    status: "started",
    planTier: after.data?.plan_tier ?? "starter",
    billingStatus: after.data?.billing_status ?? "trialing",
    trialEndsAt: after.data?.trial_ends_at ?? null,
  });
}
