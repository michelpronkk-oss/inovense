"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { OSSidebar } from "@/components/dashboard/sidebar";
import { OSTopbar } from "@/components/dashboard/topbar";
import { trialDaysRemaining } from "@/lib/os/plans";
import { getEntitlements } from "@/lib/os/entitlements";

function TrialBanner({ trialEndsAt }: { trialEndsAt?: string }) {
  const days = trialDaysRemaining(trialEndsAt);
  if (days === null || days > 3) return null;

  const isExpired = days === 0;
  const color = isExpired ? "#F2767C" : days === 1 ? "#F5C26B" : "#4DE8E1";
  const bg = isExpired ? "rgba(242,118,124,0.07)" : "rgba(77,232,225,0.05)";
  const border = isExpired ? "rgba(242,118,124,0.18)" : "rgba(77,232,225,0.14)";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: "9px 20px",
      background: bg,
      borderBottom: `1px solid ${border}`,
      flexWrap: "wrap",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color, letterSpacing: "0.01em" }}>
        {isExpired
          ? "Your 3-day trial has ended."
          : days === 1
            ? "Last day of your trial."
            : `${days} days left in your Starter trial.`}
      </span>
      <Link
        href="/api/billing/dodo/checkout?plan=starter"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 14px",
          borderRadius: 7,
          background: "#4DE8E1",
          color: "#04130F",
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "-0.005em",
          textDecoration: "none",
          boxShadow: "0 0 0 1px rgba(77,232,225,0.4), 0 4px 14px -4px rgba(77,232,225,0.5)",
        }}
      >
        Upgrade now
      </Link>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useOS();
  const isOnboardingRoute = pathname === "/app/onboarding";
  const isOnboarded = state.onboarding.isComplete;
  const entitlements = getEntitlements(state.workspace);
  const showManageBilling = entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing" || entitlements.billingStatus === "past_due";

  useEffect(() => {
    if (!isOnboarded && !isOnboardingRoute) {
      router.replace("/app/onboarding");
      return;
    }
    if (isOnboarded && isOnboardingRoute) {
      router.replace("/app");
    }
  }, [isOnboarded, isOnboardingRoute, router]);

  if (isOnboardingRoute) {
    return (
      <div className="os-main" style={{ width: "100%", minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  return (
    <div className="os">
      <OSSidebar />
      <div className="os-main">
        {entitlements.billingStatus === "preview" && (
          <div style={{
            margin: "14px 18px 0",
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(77,232,225,0.06)",
            boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ color: "#C9FFFB", fontSize: 13, fontWeight: 600 }}>Preview workspace</div>
              <div style={{ color: "var(--text-dim)", fontSize: 12.5 }}>
                Configure your operating layer for free. Activate Starter to connect real tools and run operators live.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link className="btn btn-ghost btn-sm" href="/pricing">Compare plans</Link>
              <Link className="btn btn-primary btn-sm" href="/api/billing/dodo/checkout?plan=starter">Activate Starter</Link>
            </div>
          </div>
        )}
        {showManageBilling && (
          <div style={{
            margin: "14px 18px 0",
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(77,232,225,0.05)",
            boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ color: "#C9FFFB", fontSize: 13, fontWeight: 600 }}>Billing active</div>
              <div style={{ color: "var(--text-dim)", fontSize: 12.5 }}>
                Manage subscription, payment method, invoices and cancellation in Dodo Customer Portal.
              </div>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/app/settings?billing=manage">
              Manage billing
            </Link>
          </div>
        )}
        <TrialBanner trialEndsAt={state.workspace.trialEndsAt} />
        <OSTopbar />
        {children}
      </div>
    </div>
  );
}
