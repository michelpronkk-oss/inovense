"use client";

import { type PricingPlan } from "@/lib/pricing";
import { useEarlyAccess } from "@/components/early-access/early-access-provider";

export function PricingPlans({ plans }: { plans: PricingPlan[] }) {
  const { openEarlyAccess } = useEarlyAccess();

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => {
        return (
          <div
            key={plan.plan_tier}
            className="relative flex h-full flex-col rounded-xl p-7"
            style={plan.featured
              ? {
                  background: "linear-gradient(180deg, #0D1015, #07090C)",
                  boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.25), 0 0 40px -10px rgba(77,232,225,0.08)",
                }
              : {
                  background: "linear-gradient(180deg, #0D1015, #07090C)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)",
                }}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]" style={{ background: "#4DE8E1", color: "#04130F" }}>
                {plan.badge}
              </span>
            )}
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#4A4F57" }}>{plan.plan_name}</p>
            <div className="mb-2 flex items-end gap-1.5">
              <span className="text-3xl font-semibold" style={{ color: "#ECEFF3", letterSpacing: "-0.02em" }}>{plan.price}</span>
              <span className="mb-0.5 text-sm" style={{ color: "#6B7178" }}>{plan.period}</span>
            </div>
            <p className="mb-2 text-sm leading-relaxed" style={{ color: "#6B7178" }}>{plan.tagline}</p>
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: "#4A4F57" }}>{plan.billingLabel}</p>
            <ul className="mb-8 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#4DE8E1" }} />
                  <span className="text-sm" style={{ color: "#A4ABB4" }}>{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={(event) => openEarlyAccess({ plan: plan.plan_tier, trigger: event.currentTarget })}
              className="block w-full rounded-xl py-2.5 text-center text-sm font-medium transition-all hover:-translate-y-px"
              style={plan.featured
                ? {
                    background: "#4DE8E1",
                    color: "#04130F",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45)",
                  }
                : {
                    background: "rgba(255,255,255,0.03)",
                    color: "#ECEFF3",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                  }}
            >
              {plan.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
}
