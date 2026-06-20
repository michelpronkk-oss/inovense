import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { operatorRuntimeId } from "@/lib/operators/logging";

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
  sourceMetadata?: Record<string, unknown>;
  preparedActions?: string[];
  crmPreparation?: Record<string, unknown>;
  crmPreparationStatus?: string;
}) {
  const approvalId = operatorRuntimeId("appr-revenue-gmail");
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
    created_at: new Date().toISOString(),
    continuation_payload: {
      kind: "gmail.send_after_approval",
      workspaceId: input.workspaceId,
      operatorRunId: input.runId,
      operatorKey: "revenue",
      to: input.to,
      subject: input.subject,
      body: input.body,
      sourceMetadata: input.sourceMetadata ?? {},
      preparedActions: input.preparedActions ?? ["send_gmail_follow_up"],
      crmPreparation: input.crmPreparation ?? null,
      crmPreparationStatus: input.crmPreparationStatus ?? null,
    },
    policy_reason: input.policyReason,
  });

  if (insert.error) throw new Error(insert.error.message);
  return { approvalId };
}
