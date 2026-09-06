import type { OperatorReadinessStatus } from "@/lib/operators/readiness";

type ActivationReadinessInput = {
  status: OperatorReadinessStatus;
  canRunManual: boolean;
  nextSetupStep: string;
  executionEligibility: {
    eligible: boolean;
    reason: string;
  };
};

export type ActivationReadinessDecision =
  | { allowed: true }
  | { allowed: false; code: "execution_ineligible" | "operator_not_ready"; message: string };

/** Fail-closed decision used immediately before scheduled activation. */
export function decideOperatorActivation(readiness: ActivationReadinessInput | null): ActivationReadinessDecision {
  if (!readiness) {
    return { allowed: false, code: "operator_not_ready", message: "Operator readiness could not be verified." };
  }
  if (!readiness.executionEligibility.eligible) {
    return { allowed: false, code: "execution_ineligible", message: readiness.executionEligibility.reason };
  }
  if (!readiness.canRunManual || (readiness.status !== "ready" && readiness.status !== "draft_only")) {
    return { allowed: false, code: "operator_not_ready", message: readiness.nextSetupStep || "Complete operator setup before activation." };
  }
  return { allowed: true };
}
