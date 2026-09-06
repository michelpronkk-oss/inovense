"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { OSMobileNav, OSSidebar } from "@/components/dashboard/sidebar";
import { OSTopbar } from "@/components/dashboard/topbar";
import { trialDaysRemaining } from "@/lib/os/plans";
import { getEntitlements } from "@/lib/os/entitlements";
import { appHref } from "@/lib/urls";
import { AppLoadingShell } from "@/components/dashboard/loading-state";

function TrialBanner({ trialEndsAt }: { trialEndsAt?: string }) {
  const days = trialDaysRemaining(trialEndsAt);
  if (days === null || days > 1) return null;

  const isExpired = days === 0;
  const color = isExpired ? "#F2767C" : days === 1 ? "#F5C26B" : "#4DE8E1";
  const bg = isExpired ? "rgba(242,118,124,0.07)" : "rgba(77,232,225,0.05)";
  const border = isExpired ? "rgba(242,118,124,0.18)" : "rgba(77,232,225,0.14)";

  return (
    <div className="os-trial-banner" style={{
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
        className="os-trial-cta"
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
          boxShadow: "none",
        }}
      >
        Choose a plan
      </Link>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, bootstrapStatus, workspaceLoadError } = useOS();
  // The browser keeps the canonical URL while middleware rewrites to the
  // internal `/app/*` segment. Accept both during client navigation, but do
  // not redirect here: the server layout + gateway are the sole authority.
  const isOnboardingRoute = pathname === "/onboarding" || pathname === "/app/onboarding";
  const isPublicBareRoute = Boolean(pathname && (
    pathname === "/login" || pathname === "/register" ||
    pathname === "/forgot-password" || pathname === "/reset-password" ||
    pathname === "/auth/callback" || pathname === "/invite/accept" ||
    pathname === "/app/login" || pathname === "/app/register" ||
    pathname === "/app/forgot-password" || pathname === "/app/reset-password" ||
    pathname === "/app/auth/callback" || pathname === "/app/invite/accept"
  ));
  const entitlements = getEntitlements(state.workspace);
  const showBillingAttention = entitlements.billingStatus === "past_due";

  if (isPublicBareRoute) {
    return (
      <div className="os-main" style={{ width: "100%", minHeight: "100dvh" }}>
        {children}
      </div>
    );
  }

  if (bootstrapStatus === "loading") return <AppLoadingShell />;

  // Only a completed server-authorized bootstrap may produce an access or
  // load error. Seed state is never rendered while this decision is pending.
  if (bootstrapStatus === "forbidden" || bootstrapStatus === "error") {
    const forbidden = bootstrapStatus === "forbidden";
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#06070A" }}>
        <section style={{ width: "min(460px, 100%)", padding: 28, borderRadius: 18, background: "#0c1014", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)" }}>
          <div style={{ color: "#4DE8E1", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em" }}>{forbidden ? "WORKSPACE ACCESS" : "WORKSPACE"}</div>
          <h1 style={{ margin: "12px 0 8px", fontSize: 24 }}>{forbidden ? "You don’t have access to this workspace." : "We couldn’t open your workspace."}</h1>
          <p style={{ margin: 0, color: "var(--text-dim)", lineHeight: 1.55, fontSize: 13.5 }}>
            {workspaceLoadError || "Refresh to try again."}
          </p>
          <button className="btn btn-primary" type="button" onClick={() => window.location.reload()} style={{ marginTop: 20 }}>Try again</button>
        </section>
      </main>
    );
  }

  if (isOnboardingRoute) {
    return (
      <div className="os-main" style={{ width: "100%", minHeight: "100dvh" }}>
        {children}
      </div>
    );
  }

  return (
      <div className="os">
        <a className="os-skip-link" href="#workspace-content">Skip to content</a>
        <OSSidebar />
        <main id="workspace-content" className="os-main" tabIndex={-1}>
        {showBillingAttention && (
          <div className="os-billing-notice" role="status">
            <span>Billing needs attention. Review your payment details to keep operators running.</span>
            <Link className="btn btn-ghost btn-sm" href="/settings?billing=manage">Manage billing</Link>
          </div>
        )}
        {entitlements.billingStatus === "trialing" && <TrialBanner trialEndsAt={state.workspace.trialEndsAt} />}
        <OSTopbar />
          {children}
        </main>
        <OSMobileNav />
      </div>
  );
}
