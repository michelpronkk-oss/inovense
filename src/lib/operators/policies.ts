import type { OperatorReadiness } from "@/lib/operators/readiness";

export type OperatorPolicyDecision =
  | { ok: true; riskLevel: "low" | "medium" | "high"; requiresApproval: boolean; reason: string }
  | { ok: false; riskLevel: "low" | "medium" | "high"; reason: string };

const BLOCKED_READINESS = new Set(["missing_connector", "upgrade_required", "coming_next", "preview"]);

export function evaluateManualRunPolicy(input: {
  operatorKey: string;
  readiness: OperatorReadiness;
  action: "gmail.follow_up_send" | "microsoft.follow_up_send";
}): OperatorPolicyDecision {
  if (BLOCKED_READINESS.has(input.readiness.status)) {
    return {
      ok: false,
      riskLevel: "medium",
      reason: `Operator cannot run while readiness is ${input.readiness.status}.`,
    };
  }

  if (input.operatorKey !== "revenue") {
    return { ok: false, riskLevel: "medium", reason: "Only the Revenue Operator can run in Pass 3." };
  }

  if (!input.readiness.canRunManual) {
    return { ok: false, riskLevel: "medium", reason: "Manual runs are not available for this operator." };
  }

  if (input.action === "gmail.follow_up_send") {
    return {
      ok: true,
      riskLevel: "medium",
      requiresApproval: true,
      reason: "External email send requires human approval before Gmail execution.",
    };
  }

  if (input.action === "microsoft.follow_up_send") {
    return {
      ok: true,
      riskLevel: "medium",
      requiresApproval: true,
      reason: "External email send requires human approval before Microsoft 365 execution.",
    };
  }

  return { ok: false, riskLevel: "medium", reason: "Unsupported operator action." };
}
