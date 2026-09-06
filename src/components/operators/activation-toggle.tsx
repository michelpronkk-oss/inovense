"use client";

import { useCallback, useEffect, useState } from "react";
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
        ? "Billing needs attention before this operator can run unattended."
        : executionEligibility.status === "suspended"
          ? "Billing is suspended. This operator cannot run unattended."
          : executionEligibility.reason
    : "";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.025)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <button
        type="button"
        role="switch"
        aria-checked={activated}
        onClick={() => void toggle()}
        disabled={loading || saving || !configured || (!activated && !executionEligibility.eligible)}
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          border: "none",
          cursor: loading || saving || !configured || (!activated && !executionEligibility.eligible) ? "not-allowed" : "pointer",
          background: activated ? "var(--green)" : "rgba(255,255,255,0.14)",
          position: "relative",
          flexShrink: 0,
          opacity: loading ? 0.6 : 1,
          transition: "background 0.15s ease",
        }}
      >
        <span style={{ position: "absolute", top: 3, left: activated ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s ease" }} />
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {activated ? "Active — running on schedule" : wasEverActivated ? "Paused" : "Not active"}
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: "var(--text-mute)" }}>
          {!configured
            ? "Finish setup above before activating unattended runs."
            : blockedReason
              ? blockedReason
              : activated
                ? "This operator runs its scheduled check automatically. Every risky action still waits for approval."
                : wasEverActivated
                  ? "Auterim will keep your configuration but stop continuous monitoring. Turn back on to resume."
                  : "Turn on to let this operator run its scheduled check automatically. Manual checks stay available either way."}
        </div>
        {error && <div style={{ marginTop: 4, fontSize: 11.5, color: "#ffaaaa" }}>{error}</div>}
      </div>
      {!executionEligibility.eligible && (
        <Link href="/plans" className="btn btn-primary btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>
          {executionEligibility.status === "billing_attention" ? "Update billing" : "Choose a plan"}
        </Link>
      )}
    </div>
  );
}
