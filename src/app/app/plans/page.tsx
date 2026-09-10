"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { getEntitlements } from "@/lib/os/entitlements";
import { getPlanLabel } from "@/lib/os/truth";
import { appHref } from "@/lib/urls";
import { pricingPlans, type CheckoutPlanTier } from "@/lib/pricing";
import { getPlanLimits } from "@/lib/os/plans";
import { PageHeader, MetricStrip } from "@/components/product-ui/page-primitives";

type PlanCard = { tier: CheckoutPlanTier; name: string; price: string; summary: string; limits: string[]; teamSeats: number; featured?: boolean };

const PLANS: PlanCard[] = pricingPlans.map((plan) => ({
  tier: plan.plan_tier,
  name: plan.plan_name,
  price: plan.price,
  summary: plan.tagline,
  limits: plan.features.filter((feature) => feature !== "3 days free for first-time workspaces"),
  teamSeats: getPlanLimits(plan.plan_tier).maxTeamMembers,
  featured: plan.featured,
}));

function displayDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlansPage() {
  const { state, refreshWorkspace } = useOS();
  const searchParams = useSearchParams();
  const entitlements = getEntitlements(state.workspace);
  const currentPlanLimits = getPlanLimits(state.workspace.planTier ?? state.workspace.plan);
  const [submitting, setSubmitting] = useState<CheckoutPlanTier | null>(null);
  const [trialState, setTrialState] = useState<{ eligible: boolean; status: string } | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialStartError, setTrialStartError] = useState("");
  const [trialStarted, setTrialStarted] = useState(false);
  const canManageBilling = state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin";
  const trialEnd = displayDate(entitlements.trialEndsAt);
  const showManageBilling = entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing" || entitlements.billingStatus === "past_due";
  // Real, already-loaded workspace state -- no new fetch. Team seats in use
  // mirrors the same active/non-pending definition the Team page uses.
  const teamSeatsInUse = state.teamMembers.filter((member) => member.active && member.status !== "pending").length;

  useEffect(() => {
    let active = true;
    fetch(appHref("/api/billing/trial-status"), { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => null) as { eligible?: boolean; status?: string } | null;
        if (!response.ok || !result || typeof result.eligible !== "boolean" || typeof result.status !== "string") throw new Error("Trial status unavailable");
        if (active) setTrialState({ eligible: result.eligible, status: result.status });
      })
      .catch(() => { if (active) setTrialState({ eligible: false, status: "unavailable" }); });
    return () => { active = false; };
  }, []);

  function beginCheckout(tier: CheckoutPlanTier) {
    if (!canManageBilling) return;
    setSubmitting(tier);
    window.location.assign(appHref(`/api/billing/dodo/checkout?plan=${tier}`));
  }

  // The one authoritative, cardless "Start 3-day trial" action - the same
  // route onboarding and /connectors call. No checkout, no card details.
  async function startTrial() {
    if (!canManageBilling) return;
    setStartingTrial(true);
    setTrialStartError("");
    try {
      const response = await fetch(appHref("/api/billing/trial/start"), { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) throw new Error(json.error || "The trial could not be started. Please try again.");
      await refreshWorkspace();
      setTrialStarted(true);
    } catch (error) {
      setTrialStartError(error instanceof Error ? error.message : "The trial could not be started. Please try again.");
    } finally {
      setStartingTrial(false);
    }
  }

  async function openBillingPortal() {
    if (!canManageBilling) return;
    setBillingBusy(true);
    setPortalError("");
    try {
      const res = await fetch(appHref("/api/billing/dodo/portal"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email }),
      });
      const json = (await res.json().catch(() => ({}))) as { portalUrl?: string; error?: string };
      if (!res.ok || !json.portalUrl) {
        setPortalError(json.error || "No active billing profile found. Activate a plan first.");
        setBillingBusy(false);
        return;
      }
      window.location.href = json.portalUrl;
    } catch {
      setPortalError("Could not open billing portal.");
      setBillingBusy(false);
    }
  }

  return <div className="os-page plans-page" style={{ maxWidth: 1280 }}>
    <PageHeader
      eyebrow="Workspace access"
      title="Plans and billing"
      description="Choose a plan for your workforce. Your approval policies stay in place."
      actions={canManageBilling && showManageBilling ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void openBillingPortal()} disabled={billingBusy}>
          {billingBusy ? "Opening…" : "Billing portal"}
        </button>
      ) : undefined}
    />

    {portalError && <Notice tone="error">{portalError}</Notice>}
    {searchParams.get("billing") === "error" && <Notice tone="error">We could not open checkout. Try again, or contact support if this continues.</Notice>}
    {searchParams.get("billing") === "setup_required" && <Notice tone="error">This plan is temporarily unavailable. Please contact support for help.</Notice>}
    {searchParams.get("billing") === "active_trial" && <Notice>Your trial is already active. Its end date stays fixed while billing is in progress.</Notice>}
    {searchParams.get("billing") === "trial_state_unavailable" && <Notice>We could not verify trial history. Please try again shortly.</Notice>}

    <section className="card sec" style={{ boxShadow: "inset 0 0 0 1px rgba(77,232,225,.24)" }}>
      <div className="card-pad">
        <span className="badge cyan"><i />Current plan</span>
        <div className="t-object" style={{ fontSize: 17, marginTop: 10 }}>{entitlements.billingStatus === "preview" ? "Preview: live systems are locked" : `${getPlanLabel(entitlements.planTier)} is ${entitlements.billingStatus}`}</div>
        <p className="t-meta" style={{ marginTop: 6 }}>{trialEnd ? `Trial access ends ${trialEnd}.` : entitlements.billingStatus === "preview" ? trialState?.eligible ? "Your 3-day Foundation trial is available now - no card required." : "This account's trial has already been used. Choose a plan to connect real systems." : "Billing and cancellation are managed in the customer portal."}</p>
        {entitlements.billingStatus === "preview" && trialState?.eligible && (
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void startTrial()} disabled={!canManageBilling || startingTrial || trialStarted}>
              {startingTrial ? "Starting…" : trialStarted ? "Trial active" : "Start 3-day trial"}
            </button>
            {trialStartError && <div className="t-meta" style={{ marginTop: 8, color: "var(--red, #F2767C)" }}>{trialStartError}</div>}
          </div>
        )}
      </div>
      <div className="card-pad" style={{ paddingTop: 0 }}>
        <MetricStrip items={[
          { label: "Operator capacity", value: entitlements.operatorsLimit, detail: "Included in this plan" },
          { label: "Connector capacity", value: entitlements.connectorsLimit === "custom" || entitlements.connectorsLimit === "standard_all" ? "Custom" : entitlements.connectorsLimit, detail: "Connected systems allowed" },
          { label: "Team seats", value: currentPlanLimits.maxTeamMembers === -1 ? teamSeatsInUse : `${teamSeatsInUse} / ${currentPlanLimits.maxTeamMembers}`, detail: currentPlanLimits.maxTeamMembers === -1 ? "Active workspace members" : "Active / included seats" },
        ]} />
      </div>
    </section>

    {!canManageBilling && <Notice>Only the workspace owner or an admin can change billing. Ask an owner to choose a plan.</Notice>}

    <div className="grid3 sec">
      {PLANS.map((plan) => {
        const current = entitlements.planTier === plan.tier && entitlements.billingStatus !== "preview";
        const trialActive = trialState?.status === "active";
        const trialReady = trialState !== null;
        const checkoutLabel = !trialReady ? "Checking eligibility…" : trialActive ? "Trial in progress" : trialState.eligible ? `Start ${plan.name} trial` : `Choose ${plan.name}`;
        return (
          <article key={plan.tier} className="card" style={current ? { boxShadow: "inset 0 0 0 1px rgba(77,232,225,.32)" } : undefined}>
            <div className="card-pad stack">
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <span className="t-eyebrow">Auterim {plan.name}</span>
                {current ? <span className="badge cyan">CURRENT PLAN</span> : plan.featured ? <span className="badge plan">RECOMMENDED</span> : null}
              </div>
              <div><span className="t-num">{plan.price}</span><span className="t-meta"> / month</span></div>
              <p className="t-compact">{plan.summary}</p>
              <div className="stack" style={{ gap: 8 }}>
                {plan.limits.map((limit) => (
                  <div className="inline" key={limit} style={{ flexWrap: "nowrap" }}>
                    <span className="dot dot-cyan" />
                    <span className="t-compact">{limit}</span>
                  </div>
                ))}
                <div className="inline" style={{ flexWrap: "nowrap" }}>
                  <span className="dot dot-cyan" />
                  <span className="t-compact">Up to {plan.teamSeats === -1 ? "unlimited" : plan.teamSeats} team seats</span>
                </div>
              </div>
              <div>
                {current
                  ? <div className="t-meta">Current workspace plan</div>
                  : <button type="button" className={`btn ${plan.featured ? "btn-primary" : "btn-ghost"} btn-sm`} style={{ width: "100%" }} disabled={!canManageBilling || submitting !== null || !trialReady || trialActive} onClick={() => beginCheckout(plan.tier)}>{submitting === plan.tier ? "Opening checkout…" : canManageBilling ? checkoutLabel : "Owner access required"}</button>}
                <div className="t-meta" style={{ marginTop: 8 }}>{trialState?.eligible ? "3 days free · Payment begins only if you continue" : trialActive ? "Your current trial period remains unchanged" : "Billing begins when checkout is completed"}</div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
    <p className="t-meta sec">After checkout, Auterim opens Connectors so you can activate the systems required by your first operator.</p>
  </div>;
}

function Notice({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "error" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`attn sec${tone === "error" ? " crit" : ""}`} style={{ padding: "11px 14px" }}>{children}</div>;
}
