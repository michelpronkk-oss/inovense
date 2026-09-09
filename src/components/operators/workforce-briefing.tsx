"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOS } from "@/lib/os/app-provider";
import { getOperatorCapabilityCopy } from "@/lib/operators/capability-presentation";

export type OperatorBriefingState = {
  state: "needs_setup" | "needs_attention" | "ready_to_activate" | "plan_required" | "billing_attention" | "suspended" | "paused" | "active" | "active_limited" | "enhanced";
  label: string;
  description: string;
  lifecycle: "available_to_unlock" | "ready_to_activate" | "active" | "paused";
  health: "healthy" | "limited_context" | "needs_attention" | "billing_attention";
  connectedSystems: string[];
  connectedCoreSystems: string[];
  availableNow: string[];
  missingOptionalCapabilities: string[];
  requiredActions: Array<{ label: string; href: string; reason: string; impact: string }>;
  degraded: { lostCapabilities: string[]; impact: "required" | "optional" } | null;
};

const responsibility: Record<string, string[]> = {
  revenue: ["Spot meaningful commercial conversations", "Prepare thoughtful follow-up work", "Keep proposed external actions under approval"],
  client_flow: ["Notice customer requests and stalled handoffs", "Prepare a clear next response", "Coordinate safe follow-through across connected context"],
  operations: ["Surface blocked or stale delivery work", "Prepare recovery steps for review", "Keep internal follow-through visible"],
  support: ["Notice support requests and repeated issues", "Prepare safe customer responses", "Observe whether support work is resolved"],
};

export function OperatorWorkforceBriefing({
  operatorKey,
  onStateChange,
  runtime,
}: {
  operatorKey: "revenue" | "client_flow" | "operations" | "support";
  onStateChange?: (state: OperatorBriefingState | null) => void;
  runtime?: {
    pendingApprovals: number;
    monitoringLabel: string;
    nextCheckLabel: string;
  };
}) {
  const { state } = useOS();
  const [product, setProduct] = useState<OperatorBriefingState | null>(null);
  const [error, setError] = useState("");
  const params = useMemo(() => new URLSearchParams({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, operatorKey }), [operatorKey, state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const load = useCallback(async () => {
    if (!state.workspace.id) return;
    setError("");
    try {
      const productRes = await fetch(`/api/operators/product-state?${params}`, { cache: "no-store" });
      const productJson = await productRes.json();
      if (!productRes.ok) throw new Error(productJson.error || "Could not load the operator briefing.");
      const nextProduct = productJson.state ?? null;
      setProduct(nextProduct);
      onStateChange?.(nextProduct);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the operator briefing.");
    }
  }, [onStateChange, params, state.workspace.id]);

  useEffect(() => { void load(); }, [load]);

  const pending = runtime?.pendingApprovals ?? 0;
  const active = product?.lifecycle === "active";
  const locked = product?.lifecycle === "available_to_unlock";
  const capabilityCopy = getOperatorCapabilityCopy(operatorKey);
  const action = product?.requiredActions[0] ?? null;

  const calmSummary = active
    ? product?.state === "active_limited"
      ? "Core work continues while optional context is restored."
      : `Everything needed for ${operatorKey === "client_flow" ? "Client Flow" : operatorKey === "revenue" ? "Revenue" : operatorKey === "support" ? "Support" : "Operations"} is available.`
    : product?.description ?? "Auterim is checking this operator’s real state.";
  const primaryProvider = product?.connectedCoreSystems[0] ?? null;

  return (
    <section className="operator-runtime-surface" data-operator-state={product?.state ?? "loading"}>
      <div className="operator-runtime-summary">
        <div className="p-meta">{active ? "Runtime summary" : locked ? "Role available" : "Ready when you are"}</div>
        <p>{calmSummary}</p>
        {!active && <div className="operator-runtime-role">{responsibility[operatorKey][0]}. {product?.availableNow?.[0] ?? "Auterim will keep consequential actions under your control."}</div>}
        {error && <div className="operator-runtime-error">{error}</div>}
        {action && (
          <div className="operator-runtime-attention" data-severity={product?.health === "needs_attention" ? "blocking" : "attention"}>
            <div><span>{product?.health === "needs_attention" ? "Needs attention" : "Limited context"}</span><strong>{action.reason}</strong><p>{action.impact}</p></div>
            <Link href={action.href} className="btn btn-ghost btn-sm">{action.label}</Link>
          </div>
        )}
        {locked && product?.requiredActions.length === 0 && product?.state === "needs_setup" && (
          <Link href={operatorKey === "operations" ? "/app/connectors?discover=1&category=project_management" : "/app/connectors?discover=1&category=email_calendar"} className="btn btn-primary btn-sm operator-runtime-unlock">Connect a system</Link>
        )}
      </div>

      {active && (
        <div className="operator-current-state">
          <div className="operator-surface-heading"><span>Current state</span><small>Live workspace truth</small></div>
          <div className="operator-state-grid">
            <StateItem label={capabilityCopy.required[0] ?? "Core context"} value={primaryProvider ? `Connected via ${primaryProvider}` : "Unavailable"} />
            {product?.degraded?.impact === "optional" && <StateItem label={product.degraded.lostCapabilities[0] ?? "Optional context"} value="Temporarily unavailable" tone="attention" />}
            <StateItem label="Approvals" value={pending > 0 ? `${pending} waiting` : "No items waiting"} tone={pending > 0 ? "attention" : "normal"} />
            <StateItem label="Monitoring" value={runtime?.monitoringLabel ?? "Active"} />
            <StateItem label="Next check" value={runtime?.nextCheckLabel ?? "Scheduled"} />
          </div>
        </div>
      )}

      {!active && !locked && product && (
        <div className="operator-current-state">
          <div className="operator-surface-heading"><span>Ready state</span><small>Before activation</small></div>
          <div className="operator-state-grid">
            <StateItem label={capabilityCopy.required[0] ?? "Core context"} value={primaryProvider ? `Connected via ${primaryProvider}` : "Ready"} />
            <StateItem label="Monitoring" value={product.lifecycle === "paused" ? "Paused" : "Starts after activation"} />
            <StateItem label="Control" value="Human approval required" />
          </div>
        </div>
      )}
    </section>
  );
}

function StateItem({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "attention" }) {
  return <div className="operator-state-item" data-tone={tone}><span>{label}</span><strong>{value}</strong></div>;
}
