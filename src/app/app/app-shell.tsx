"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { OSSidebar } from "@/components/dashboard/sidebar";
import { OSTopbar } from "@/components/dashboard/topbar";
import { trialDaysRemaining } from "@/lib/os/plans";
import { getEntitlements } from "@/lib/os/entitlements";
import { appHref } from "@/lib/urls";

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
            : `${days} days left in your Foundation trial.`}
      </span>
      <Link
        href={appHref("/api/billing/dodo/checkout?plan=starter")}
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
  const { state, workspaceLoadError } = useOS();
  // The browser keeps the canonical URL while middleware rewrites to the
  // internal `/app/*` segment. Accept both during client navigation, but do
  // not redirect here: the server layout + gateway are the sole authority.
  const isOnboardingRoute = pathname === "/onboarding" || pathname === "/app/onboarding";
  const isBareRoute = isOnboardingRoute || Boolean(pathname && (
    pathname === "/login" || pathname === "/register" ||
    pathname === "/forgot-password" || pathname === "/reset-password" ||
    pathname === "/auth/callback" || pathname === "/invite/accept" ||
    pathname === "/app/login" || pathname === "/app/register" ||
    pathname === "/app/forgot-password" || pathname === "/app/reset-password" ||
    pathname === "/app/auth/callback" || pathname === "/app/invite/accept"
  ));
  const entitlements = getEntitlements(state.workspace);
  const showManageBilling = entitlements.billingStatus === "active" || entitlements.billingStatus === "trialing" || entitlements.billingStatus === "past_due";

  if (isBareRoute) {
    return (
      <div className="os-main" style={{ width: "100%", minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  // Never let a failed authenticated workspace lookup fall back to the local
  // demo shell. Showing a seed "Workspace Admin" after a 403 is misleading
  // and makes an authorization repair look like a real user profile.
  if (workspaceLoadError) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#06070A" }}>
        <section style={{ width: "min(460px, 100%)", padding: 28, borderRadius: 18, background: "#0c1014", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)" }}>
          <div style={{ color: "#4DE8E1", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em" }}>WORKSPACE ACCESS</div>
          <h1 style={{ margin: "12px 0 8px", fontSize: 24 }}>Your account needs a workspace assignment.</h1>
          <p style={{ margin: 0, color: "var(--text-dim)", lineHeight: 1.55, fontSize: 13.5 }}>
            {workspaceLoadError} No demo profile or workspace data is being shown.
          </p>
          <Link className="btn btn-primary" href="/login" style={{ marginTop: 20 }}>Return to sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <div className="os">
      <OSSidebar />
      <div className="os-main">
        {entitlements.billingStatus === "preview" && (
          <div className="os-billing-status" style={{
            margin: "8px 18px 0",
            padding: "8px 12px",
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
              <div style={{ color: "#C9FFFB", fontSize: 12.5, fontWeight: 600 }}>Preview workspace</div>
              <div style={{ color: "var(--text-dim)", fontSize: 12.5 }}>
                Configure your operating layer freely. Choose a plan when you are ready to begin its trial and connect live systems.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link className="btn btn-ghost btn-sm" href="/plans">Compare plans</Link>
              <Link className="btn btn-primary btn-sm" href="/plans">Choose a plan</Link>
            </div>
          </div>
        )}
        {showManageBilling && (
          <div className="os-billing-status" style={{
            margin: "8px 18px 0",
            padding: "8px 12px",
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
              <div style={{ color: "#C9FFFB", fontSize: 12.5, fontWeight: 600 }}>Billing active</div>
              <div style={{ color: "var(--text-dim)", fontSize: 12.5 }}>
                Manage subscription, payment method, invoices and cancellation in Dodo Customer Portal.
              </div>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/settings?billing=manage">
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
