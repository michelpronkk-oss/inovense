import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { operatorRuntimeId } from "@/lib/operators/logging";
import type { CustomerEmailMode, SlackNotificationSettings } from "@/lib/settings/workspace-policy";
import { buildBundledApprovalGovernance } from "@/lib/policies/approval-governance";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type RevenueFollowUpInput = {
  leadName: string;
  leadEmail: string;
  context: string;
  goal: "follow_up" | string;
};

export type PreparedGmailFollowUp = {
  to: string;
  subject: string;
  body: string;
};

function normalizeName(name: string): string {
  return name.trim() || "there";
}

function normalizeContext(context: string): string {
  return context.trim().replace(/\s+/g, " ");
}

export function prepareRevenueFollowUpEmail(input: RevenueFollowUpInput): PreparedGmailFollowUp {
  const leadName = normalizeName(input.leadName);
  const context = normalizeContext(input.context);
  const subject = `Following up on ${leadName === "there" ? "our conversation" : `${leadName}'s next step`}`;
  const contextLine = context
    ? `I wanted to follow up on this: ${context}`
    : "I wanted to follow up and keep the next step moving.";

  return {
    to: input.leadEmail.trim().toLowerCase(),
    subject,
    body: [
      `Hi ${leadName},`,
      "",
      contextLine,
      "",
      "If it is useful, I can help map the next practical step and keep the implementation path lightweight.",
      "",
      "Would you be open to a short follow-up this week so we can decide whether there is a fit?",
      "",
      "Best,",
      "Inovense",
    ].join("\n"),
  };
}

export async function createGmailSendApproval(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  runId: string;
  to: string;
  subject: string;
  body: string;
  policyReason: string;
  dedupeKey?: string;
  dedupeMetadata?: Record<string, unknown>;
  sourceMetadata?: Record<string, unknown>;
  preparedActions?: string[];
  crmPreparation?: Record<string, unknown>;
  crmPreparationStatus?: string;
  preparedHubSpotActions?: Record<string, unknown>;
  customerEmailMode?: CustomerEmailMode;
  slackNotificationSettings?: SlackNotificationSettings;
}) {
  if (input.dedupeKey) {
    const existing = await input.supabase.from("os_approvals").select("id").eq("workspace_id", input.workspaceId).eq("dedupe_key", input.dedupeKey).in("status", ["pending", "executing", "approved"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing.error) throw new Error(`Gmail approval idempotency lookup failed: ${existing.error.message}`);
    if (typeof existing.data?.id === "string") return { approvalId: existing.data.id, reused: true };
  }
  const approvalId = operatorRuntimeId("appr-revenue-gmail");
  const customerEmailMode = input.customerEmailMode ?? "approval_required";
  const governance = await buildBundledApprovalGovernance({
    supabase: input.supabase,
    workspaceId: input.workspaceId,
    operatorKey: "revenue",
    emailConnector: "gmail",
    to: input.to,
    subject: input.subject,
    body: input.body,
    dedupeKey: input.dedupeKey,
    preparedHubSpotActions: input.preparedHubSpotActions,
    memoryDependencies: Array.isArray(input.sourceMetadata?.memoryDependencies) ? input.sourceMetadata.memoryDependencies as import("@/lib/memory/model").MemoryDependency[] : [],
    businessContext: input.sourceMetadata?.businessContext,
  });
  const insert = await input.supabase.from("os_approvals").insert({
    id: approvalId,
    workspace_id: input.workspaceId,
    type: "email",
    title: "Approval required before sending",
    body: `Revenue Operator prepared an outbound Gmail message to ${input.to}.`,
    agent_id: "revenue",
    agent_mark: "RV",
    agent_color: "#4DE8E1",
    run_id: input.runId,
    status: "pending",
    dedupe_key: input.dedupeKey ?? null,
    created_at: new Date().toISOString(),
    continuation_payload: {
      kind: "gmail.send_after_approval",
      workspaceId: input.workspaceId,
      operatorRunId: input.runId,
      operatorKey: "revenue",
      workflowId: typeof input.sourceMetadata?.workflowId === "string" ? input.sourceMetadata.workflowId : null,
      workflowObjective: typeof input.sourceMetadata?.workflowObjective === "string" ? input.sourceMetadata.workflowObjective : null,
      workflowStepId: typeof input.sourceMetadata?.workflowStepId === "string" ? input.sourceMetadata.workflowStepId : null,
      workflowStepOrder: typeof input.sourceMetadata?.workflowStepOrder === "number" ? input.sourceMetadata.workflowStepOrder : null,
      dedupeKey: input.dedupeKey ?? null,
      dedupeMetadata: input.dedupeMetadata ?? null,
      to: input.to,
      subject: input.subject,
      body: input.body,
      draftSubject: input.subject,
      draftBody: input.body,
      originalDraftSubject: input.subject,
      originalDraftBody: input.body,
      editedDraftSubject: null,
      editedDraftBody: null,
      wasEdited: false,
      editedAt: null,
      editedBy: null,
      sourceMetadata: input.sourceMetadata ?? {},
      preparedActions: input.preparedActions ?? ["send_gmail_follow_up"],
      crmPreparation: input.crmPreparation ?? null,
      crmPreparationStatus: input.crmPreparationStatus ?? null,
      preparedHubSpotActions: input.preparedHubSpotActions ?? null,
      approvalScope: governance.approvalScopes.email,
      approvalScopes: governance.approvalScopes,
      policyEvidence: governance.policyEvidence,
      customerEmailPolicy: {
        mode: customerEmailMode,
        customerEmail: customerEmailMode === "draft_only"
          ? "Draft only mode. This email will not be sent automatically."
          : "Customer emails require approval before sending.",
        humanReview: "Required",
        crmUpdate: "Approval required",
        slackAlert: input.slackNotificationSettings?.slackNotificationsEnabled && input.slackNotificationSettings?.slackApprovalAlertsEnabled
          ? "Enabled"
          : "Disabled",
      },
    },
    approval_scope: governance.approvalScopes.email,
    policy_evidence: governance.policyEvidence.email,
    policy_reason: input.policyReason,
  });

  if (insert.error) {
    if (insert.error.code === "23505" && input.dedupeKey) {
      const raced = await input.supabase.from("os_approvals").select("id").eq("workspace_id", input.workspaceId).eq("dedupe_key", input.dedupeKey).in("status", ["pending", "executing", "approved"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!raced.error && typeof raced.data?.id === "string") return { approvalId: raced.data.id, reused: true };
    }
    throw new Error(insert.error.message);
  }
  return { approvalId, reused: false };
}
