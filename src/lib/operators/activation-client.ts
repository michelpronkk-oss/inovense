// Client-side boundary for the one real operator activation mutation.
// POST /api/operators/[operatorKey]/activate|deactivate already resolves
// workspace identity, role, and readiness server-side (see
// src/app/api/operators/[operatorKey]/activate/route.ts) - this module never
// decides anything itself, it only calls that route and reports the result.
// Both the /app/agents overview cards and OperatorActivationToggle (runtime
// pages) should call this so there is exactly one client-side request shape
// for the mutation.

export type OperatorActivationIdentity = {
  workspaceId: string;
  userId: string;
  userEmail: string;
};

export type OperatorActivationState = {
  activated: boolean;
  attentionRequired?: boolean;
  activatedAt: string | null;
  deactivatedAt?: string | null;
  activatedBy?: string | null;
  updatedAt: string | null;
} | null;

export type OperatorActivationRequestResult =
  | { ok: true; state: OperatorActivationState }
  | { ok: false; error: string };

export async function requestOperatorActivation(
  operatorKey: string,
  activated: boolean,
  identity: OperatorActivationIdentity,
  fetchImpl: typeof fetch = fetch,
): Promise<OperatorActivationRequestResult> {
  try {
    const response = await fetchImpl(`/api/operators/${encodeURIComponent(operatorKey)}/${activated ? "activate" : "deactivate"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(identity),
    });
    const json = await response.json().catch(() => ({} as { error?: string; state?: OperatorActivationState }));
    if (!response.ok) return { ok: false, error: json.error || "Could not update activation." };
    return { ok: true, state: json.state ?? null };
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }
}

/**
 * The exact sequencing the /app/agents card and any runtime activation
 * control must follow: send the one authenticated mutation, wait for a
 * confirmed success, and only then navigate. A rejected/errored mutation
 * must never navigate - the caller is left on the same surface with the
 * returned error to display inline.
 */
export async function activateOperatorAndNavigate(input: {
  operatorKey: string;
  identity: OperatorActivationIdentity;
  href: string;
  navigate: (href: string) => void;
  fetchImpl?: typeof fetch;
}): Promise<OperatorActivationRequestResult> {
  const result = await requestOperatorActivation(input.operatorKey, true, input.identity, input.fetchImpl);
  if (result.ok) input.navigate(input.href);
  return result;
}
