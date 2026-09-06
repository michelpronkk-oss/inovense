"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";

export type ActivationEligibility = {
  eligible: boolean;
  status: "eligible" | "trial" | "plan_required" | "billing_attention" | "suspended";
  reason: string;
};

type ActivationState = {
  activated: boolean;
  activatedAt: string | null;
  deactivatedAt?: string | null;
  updatedAt: string | null;
} | null;

/**
 * The real, explicit activation control for an operator's unattended
 * scheduled cron - distinct from "configured" (capabilities/policies are in
 * place). Always calls the real workspace-scoped activate/deactivate routes
 * (POST /api/operators/[operatorKey]/activate|deactivate), which resolve
 * workspace identity from the verified session themselves - this component
 * never authorizes anything client-side, it only reflects and requests
 * state changes.
 *
 * When executionEligibility.eligible is false, the toggle is disabled and
 * shows why (trial/plan_required/billing_attention/suspended), linking to
 * the plan flow, rather than silently failing. Viewing/configuring the
 * operator is never gated - only the toggle's actual effect is.
 */
export function OperatorActivationToggle({
  operatorKey,
  workspaceId,
  userId,
  userEmail,
  executionEligibility,
  configured,
}: {
  operatorKey: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  executionEligibility: ActivationEligibility;
  /** Capabilities/policies are in place - distinct from the activation flag itself. */
  configured: boolean;
}) {
  const descriptionId = useId();
  const [state, setState] = useState<ActivationState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ workspaceId, userId, userEmail });
      const res = await fetch(`/api/operators/${operatorKey}/activate?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as { state?: ActivationState; error?: string };
      if (!res.ok) throw new Error(json.error || "Could not load activation state.");
      setState(json.state ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load activation state.");
    } finally {
      setLoading(false);
    }
  }, [operatorKey, userEmail, userId, workspaceId]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async () => {
    if (saving || loading) return;
    const nextActivated = !(state?.activated ?? false);
    if (nextActivated && !executionEligibility.eligible) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/operators/${operatorKey}/${nextActivated ? "activate" : "deactivate"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, userId, userEmail }),
      });
      const json = await res.json().catch(() => ({})) as { state?: ActivationState; error?: string };
      if (!res.ok) throw new Error(json.error || "Could not update activation.");
      setState(json.state ?? { activated: nextActivated, activatedAt: null, updatedAt: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update activation.");
    } finally {
      setSaving(false);
    }
  };

  const activated = Boolean(state?.activated);
  // Distinguishes "never turned on" (ready_to_activate) from "explicitly
  // turned off after being set up" (paused) - same distinction as
  // OperatorProductState's "paused" vs "ready_to_activate" (product-state.ts).
  const wasEverActivated = Boolean(state?.activatedAt || state?.deactivatedAt);
  const blockedReason = !executionEligibility.eligible
    ? executionEligibility.status === "plan_required"
      ? "Choose a plan to let this operator run unattended."
      : executionEligibility.status === "billing_attention"
        ? "Update billing to resume scheduled monitoring."
        : executionEligibility.status === "suspended"
          ? "Scheduled monitoring is suspended. Review billing to restore access."
          : executionEligibility.reason
    : "";

  return (
    <div className="operator-activation" aria-busy={loading || saving}>
      <button
        type="button"
        role="switch"
        className="operator-activation-switch"
        aria-label="Scheduled operator monitoring"
        aria-describedby={descriptionId}
        aria-checked={activated}
        onClick={() => void toggle()}
        disabled={loading || saving || !configured || (!activated && !executionEligibility.eligible)}
      >
        <span aria-hidden="true" />
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {loading ? "Loading activation..." : error && !state ? "Activation unavailable" : activated ? "Active" : wasEverActivated ? "Paused" : "Not active"}
        </div>
        <div id={descriptionId} style={{ marginTop: 2, fontSize: 12, color: "var(--text-mute)" }}>
          {!configured
            ? "Finish setup to start scheduled monitoring."
            : blockedReason
              ? blockedReason
              : activated
                ? "Scheduled checks are on. Risky actions still need approval."
                : wasEverActivated
                  ? "Scheduled checks are paused. Your setup is saved."
                  : "Turn on scheduled checks. Manual checks remain available."}
        </div>
        {error && <div role="alert" style={{ marginTop: 4, fontSize: 12, color: "var(--rose)" }}>{error} <button type="button" className="btn btn-ghost btn-sm" disabled={loading || saving} onClick={() => void load()}>Retry</button></div>}
      </div>
      {!executionEligibility.eligible && (
        <Link href="/plans" className="btn btn-primary btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>
          {executionEligibility.status === "billing_attention" ? "Update billing" : "Choose a plan"}
        </Link>
      )}
    </div>
  );
}
