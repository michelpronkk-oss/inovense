"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DegradedInfo = {
  unhealthyConnectors: string[];
  lostCapabilities: string[];
  stillAvailableCapabilities: string[];
  impact: "required" | "optional";
  issues: Array<{ label: string; href: string; reason: string; impact: string }>;
} | null;

type ProductStateResult = {
  state: string;
  description: string;
  degraded: DegradedInfo;
  nextAction: { label: string; href: string } | null;
};

/**
 * Real, workspace-scoped "degraded" section for an operator detail page -
 * fetches the shared operator product-state (src/lib/operators/product-state.ts,
 * via GET /api/operators/product-state) and renders nothing unless that
 * operator actually has a degraded connector right now. Distinguishes a
 * required-connector loss ("Needs attention: reconnect…") from an
 * optional-connector loss ("Still available: ... / Unavailable: ...") using
 * the same real data - never invents its own connector-health logic.
 */
export function OperatorDegradedNotice({
  operatorKey,
  workspaceId,
  userId,
  userEmail,
}: {
  operatorKey: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
}) {
  const [state, setState] = useState<ProductStateResult | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const qs = new URLSearchParams({ workspaceId, userId, userEmail, operatorKey });
    let cancelled = false;
    fetch(`/api/operators/product-state?${qs.toString()}`, { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((json: { state?: ProductStateResult }) => {
        if (!cancelled) setState(json.state ?? null);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [operatorKey, userEmail, userId, workspaceId]);

  if (!state?.degraded) return null;

  const isHardRequirement = state.degraded.impact === "required";
  const issue = state.degraded.issues[0];

  return (
    <div className="p operator-degraded" data-severity={isHardRequirement ? "required" : "optional"}>
      <div className="p-head"><h3>{isHardRequirement ? "Needs attention" : "Limited context"}</h3></div>
      <div style={{ padding: "14px 18px", display: "grid", gap: 10 }}>
        <div style={{ fontSize: 12.5, color: isHardRequirement ? "var(--amber)" : "var(--text-dim)" }}>{issue?.reason ?? state.description}</div>
        {issue?.impact && <div style={{ fontSize: 12, color: "var(--text-mute)" }}>{issue.impact}</div>}
        {state.nextAction && (
          <Link href={state.nextAction.href} className="btn btn-ghost btn-sm" style={{ width: "fit-content", textDecoration: "none" }}>{state.nextAction.label}</Link>
        )}
      </div>
    </div>
  );
}
