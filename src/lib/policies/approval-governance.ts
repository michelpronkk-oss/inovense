import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { hubSpotBusinessContext } from "@/lib/policies/context";
import { buildApprovalScope, emailPayloadIdentity, type ApprovalScope } from "@/lib/policies/approval-scope";
import { evaluatePolicy } from "@/lib/policies/evaluate";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import type { PolicyDecision, PolicyEvidence } from "@/lib/policies/types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type BundledApprovalGovernance = {
  approvalScopes: {
    email: ApprovalScope;
    hubspot?: ApprovalScope;
  };
  policyEvidence: {
    email: PolicyEvidence;
    hubspot?: PolicyEvidence;
  };
  decisions: {
    email: PolicyDecision;
    hubspot?: PolicyDecision;
  };
};

/**
 * Evaluate every independently executable child action in a Revenue approval.
 * This keeps the approval record precise while retaining the existing grouped
 * approval UX for the operator run.
 */
export async function buildBundledApprovalGovernance(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  operatorKey: string;
  emailConnector: "gmail" | "microsoft";
  to: string;
  subject: string;
  body: string;
  dedupeKey?: string;
  preparedHubSpotActions?: Record<string, unknown> | null;
}): Promise<BundledApprovalGovernance> {
  const policy = await loadPolicyWorkspaceSettings({ supabase: input.supabase, workspaceId: input.workspaceId });
  const emailInput = {
    workspaceId: input.workspaceId,
    operatorKey: input.operatorKey,
    actionType: "send_email",
    connectorKey: input.emailConnector,
    capability: "email.send_after_approval",
    destinationType: "customer" as const,
    riskLevel: "high" as const,
    recipient: input.to,
    domain: input.to.split("@")[1],
    source: `${input.emailConnector}_scan`,
    metadata: {
      dedupeKey: input.dedupeKey ?? null,
      payloadIdentity: emailPayloadIdentity(input.subject, input.body),
    },
  };
  const emailDecision = evaluatePolicy(emailInput, policy);
  const approvalScopes: BundledApprovalGovernance["approvalScopes"] = {
    email: buildApprovalScope(emailInput, emailDecision),
  };
  const policyEvidence: BundledApprovalGovernance["policyEvidence"] = { email: emailDecision.evidence };
  const decisions: BundledApprovalGovernance["decisions"] = { email: emailDecision };

  if (input.preparedHubSpotActions && Object.keys(input.preparedHubSpotActions).length > 0) {
    const hubspotInput = {
      workspaceId: input.workspaceId,
      operatorKey: input.operatorKey,
      actionType: "update_crm_record",
      connectorKey: "hubspot",
      capability: "crm.contacts.write",
      destinationType: "crm" as const,
      riskLevel: "medium" as const,
      subjectType: "deal",
      businessContext: hubSpotBusinessContext(input.preparedHubSpotActions),
      source: `${input.emailConnector}_scan`,
      metadata: { dedupeKey: input.dedupeKey ?? null },
    };
    const hubspotDecision = evaluatePolicy(hubspotInput, policy);
    approvalScopes.hubspot = buildApprovalScope(hubspotInput, hubspotDecision);
    policyEvidence.hubspot = hubspotDecision.evidence;
    decisions.hubspot = hubspotDecision;
  }

  return { approvalScopes, policyEvidence, decisions };
}
