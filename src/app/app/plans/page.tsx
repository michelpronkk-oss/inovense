"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { getEntitlements } from "@/lib/os/entitlements";
import { getPlanLabel } from "@/lib/os/truth";
import { appHref } from "@/lib/urls";
import { pricingPlans, type CheckoutPlanTier } from "@/lib/pricing";

type PlanCard = { tier: CheckoutPlanTier; name: string; price: string; summary: string; limits: string[]; featured?: boolean };

const PLANS: PlanCard[] = pricingPlans.map((plan) => ({
  tier: plan.plan_tier,
  name: plan.plan_name,
  price: `${plan.price} / month`,
  summary: plan.tagline,
  limits: plan.features.filter((feature) => feature !== "3 days free for first-time workspaces"),
  featured: plan.featured,
}));

function displayDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlansPage() {
  const { state } = useOS();
  const searchParams = useSearchParams();
  const entitlements = getEntitlements(state.workspace);
  const [submitting, setSubmitting] = useState<CheckoutPlanTier | null>(null);
  const [trialState, setTrialState] = useState<{ eligible: boolean; status: string } | null>(null);
  const canManageBilling = state.currentUser.roleLabel === "Owner" || state.currentUser.roleLabel === "Admin";
  const trialEnd = displayDate(entitlements.trialEndsAt);

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

  return <div className="os-page plans-page" style={{ maxWidth: 1280 }}>
    <div className="os-page-head" style={{ marginBottom: 20 }}><div><span className="os-greet">Workspace access</span><h1>Plans &amp; billing</h1><div className="os-page-sub">Choose a plan for your workforce. Your approval policies stay in place.</div></div></div>
    {searchParams.get("billing") === "error" && <Notice tone="error">We could not open checkout. Try again, or contact support if this continues.</Notice>}
    {searchParams.get("billing") === "setup_required" && <Notice tone="error">This plan is temporarily unavailable. Please contact support for help.</Notice>}
    {searchParams.get("billing") === "active_trial" && <Notice>Your trial is already active. Its end date stays fixed while billing is in progress.</Notice>}
    {searchParams.get("billing") === "trial_state_unavailable" && <Notice>We could not verify trial history. Please try again shortly.</Notice>}
    <section className="plans-current-summary" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 20, alignItems: "center", padding: "18px 20px", borderRadius: 14, background: "linear-gradient(110deg, rgba(77,232,225,.085), rgba(77,232,225,.018) 48%, rgba(255,255,255,.012))", boxShadow: "inset 0 0 0 1px rgba(77,232,225,.18)", marginBottom: 18 }}>
      <div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#76EEE6", marginBottom: 7 }}>Current workspace</div><div style={{ fontSize: 18, fontWeight: 560, letterSpacing: "-.02em", color: "var(--text)" }}>{entitlements.billingStatus === "preview" ? "Preview — live systems are locked" : `${getPlanLabel(entitlements.planTier)} is ${entitlements.billingStatus}`}</div><div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 5 }}>{trialEnd ? `Trial access ends ${trialEnd}.` : entitlements.billingStatus === "preview" ? trialState?.eligible ? "Your first three-day trial is available when you choose a plan." : "Choose a plan to connect real systems." : "Billing and cancellation are managed in the customer portal."}</div></div>
      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)", lineHeight: 1.7 }}><div>{entitlements.operatorsLimit} operator capacity</div><div>{entitlements.connectorsLimit === "custom" || entitlements.connectorsLimit === "standard_all" ? "Custom connector capacity" : `${entitlements.connectorsLimit} systems`}</div></div>
    </section>
    {!canManageBilling && <Notice>Only the workspace owner or an admin can change billing. Ask an owner to choose a plan.</Notice>}
    <div className="plans-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
      {PLANS.map((plan) => {
        const current = entitlements.planTier === plan.tier && entitlements.billingStatus !== "preview";
        const trialActive = trialState?.status === "active";
        const trialReady = trialState !== null;
        const checkoutLabel = !trialReady ? "Checking eligibility..." : trialActive ? "Trial in progress" : trialState.eligible ? `Start ${plan.name} trial` : `Choose ${plan.name}`;
        return <article className="plans-card" key={plan.tier} style={{ position: "relative", padding: "22px", minHeight: 395, borderRadius: 14, background: plan.featured ? "linear-gradient(155deg, rgba(77,232,225,.08), rgba(11,16,23,.93) 48%)" : "linear-gradient(155deg, rgba(255,255,255,.035), rgba(11,16,23,.93) 48%)", boxShadow: `inset 0 0 0 1px ${plan.featured ? "rgba(77,232,225,.28)" : "var(--line)"}`, display: "flex", flexDirection: "column" }}>
          {plan.featured && <span style={{ position: "absolute", top: 15, right: 16, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "#A9FFF8" }}>Recommended</span>}
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-mute)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em" }}>Auterim {plan.name}</div><div style={{ fontSize: 28, color: "var(--text)", letterSpacing: "-.035em", fontWeight: 560, marginTop: 9 }}>{plan.price}</div><p style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.55, margin: "13px 0 20px", maxWidth: "38ch" }}>{plan.summary}</p>
          <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>{plan.limits.map((limit) => <div key={limit} style={{ color: "var(--text-dim)", fontSize: 12.5, display: "flex", gap: 8 }}><span style={{ color: "#4DE8E1" }}>✓</span>{limit}</div>)}</div>
          <div style={{ marginTop: "auto" }}>{current ? <div style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(77,232,225,.1)", color: "#9DEFEA", fontSize: 12.5, textAlign: "center" }}>Current workspace plan</div> : <button type="button" className={plan.featured ? "btn btn-primary" : "btn btn-ghost"} style={{ width: "100%", justifyContent: "center" }} disabled={!canManageBilling || submitting !== null || !trialReady || trialActive} onClick={() => beginCheckout(plan.tier)}>{submitting === plan.tier ? "Opening checkout…" : canManageBilling ? checkoutLabel : "Owner access required"}</button>}<div style={{ color: "var(--text-faint)", textAlign: "center", fontSize: 10.5, marginTop: 10 }}>{trialState?.eligible ? "3 days free · Payment begins only if you continue" : trialActive ? "Your current trial period remains unchanged" : "Billing begins when checkout is completed"}</div></div>
        </article>;
      })}
    </div>
    <p style={{ marginTop: 16, color: "var(--text-faint)", fontSize: 11.5 }}>After checkout, Auterim opens Connectors so you can activate the systems required by your first operator.</p>
  </div>;
}

function Notice({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "error" }) {
  const error = tone === "error";
  return <div style={{ padding: "11px 14px", borderRadius: 10, marginBottom: 18, background: error ? "rgba(242,118,124,.07)" : "rgba(245,194,107,.07)", boxShadow: `inset 0 0 0 1px ${error ? "rgba(242,118,124,.18)" : "rgba(245,194,107,.18)"}`, color: error ? "#F2B3B7" : "#E8C67E", fontSize: 12.5 }}>{children}</div>;
}
