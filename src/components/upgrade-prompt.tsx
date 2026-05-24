"use client";

import Link from "next/link";

interface UpgradePromptProps {
  feature: string;
  description: string;
  requiredPlan: "growth" | "operator";
}

const PLAN_LABELS = {
  growth: "Growth",
  operator: "Operator",
};

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function UpgradePrompt({ feature, description, requiredPlan }: UpgradePromptProps) {
  const planLabel = PLAN_LABELS[requiredPlan];

  return (
    <div
      className="os-upgrade-prompt"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: "80px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "rgba(77,232,225,0.08)",
          boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.18), 0 0 24px -8px rgba(77,232,225,0.35)",
          color: "#4DE8E1",
          marginBottom: 20,
        }}
      >
        <LockIcon />
      </div>

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#4DE8E1",
          marginBottom: 10,
        }}
      >
        {planLabel} plan
      </p>

      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text)",
          letterSpacing: "-0.02em",
          marginBottom: 8,
          maxWidth: "28ch",
        }}
      >
        {feature}
      </h2>

      <p
        style={{
          fontSize: 13.5,
          color: "var(--text-mute)",
          lineHeight: 1.55,
          maxWidth: "38ch",
          marginBottom: 28,
        }}
      >
        {description}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/pricing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 22px",
            borderRadius: 10,
            background: "#4DE8E1",
            color: "#04130F",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "-0.005em",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 24px -8px rgba(77,232,225,0.55)",
            textDecoration: "none",
            transition: "opacity .15s",
          }}
        >
          Upgrade to {planLabel}
        </Link>
        <Link
          href="/pricing"
          style={{
            fontSize: 13,
            color: "var(--text-mute)",
            textDecoration: "none",
            transition: "color .15s",
          }}
        >
          See all plans
        </Link>
      </div>
    </div>
  );
}

interface UpgradeBannerProps {
  used: number;
  max: number;
  label: string;
  planLabel: string;
}

export function UsageBanner({ used, max, label, planLabel }: UpgradeBannerProps) {
  const pct = Math.min((used / max) * 100, 100);
  const isNearLimit = pct >= 80;
  const isAtLimit = used >= max;

  if (!isNearLimit) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 10,
        background: isAtLimit ? "rgba(242,118,124,0.07)" : "rgba(245,194,107,0.07)",
        boxShadow: `inset 0 0 0 1px ${isAtLimit ? "rgba(242,118,124,0.2)" : "rgba(245,194,107,0.18)"}`,
        marginBottom: 20,
      }}
    >
      <span style={{ fontSize: 13, color: isAtLimit ? "#F2767C" : "#F5C26B", fontWeight: 500, flex: 1 }}>
        {isAtLimit
          ? `${label.charAt(0).toUpperCase() + label.slice(1)} limit reached on ${planLabel} plan.`
          : `${used} of ${max} ${label} used.`}
      </span>
      <Link
        href="/pricing"
        style={{
          fontSize: 12,
          color: "#4DE8E1",
          textDecoration: "none",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        Upgrade to unlock more
      </Link>
    </div>
  );
}
