import { getOperatorReadiness, type OperatorReadiness } from "@/lib/operators/readiness";
import { evaluateManualRunPolicy } from "@/lib/operators/policies";
import { createGmailSendApproval, prepareRevenueFollowUpEmail, type RevenueFollowUpInput } from "@/lib/operators/executors/gmail";
import { createOutlookSendApproval } from "@/lib/operators/executors/outlook";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Revenue Operator supports Gmail and Outlook as interchangeable email
 * connectors. Readiness already reports which connector(s) are actually
 * connected (readiness.connectedRequiredConnectors); this picks the one to
 * execute against. Gmail is preferred when both are somehow connected, which
 * keeps existing Gmail-only workspaces behaving exactly as before.
 */
type EmailConnectorKey = "gmail" | "outlook";

function resolveEmailConnector(readiness: OperatorReadiness): EmailConnectorKey | null {
  const connected = readiness.connectedRequiredConnectors;
  if (connected.includes("gmail")) return "gmail";
  if (connected.includes("outlook")) return "outlook";
  return null;
}

export type RevenueOperatorRunInput = RevenueFollowUpInput;

export type RunOperatorInput = {
  workspaceId: string;
  operatorKey: string;
  input: RevenueOperatorRunInput;
  supabase?: SupabaseAdmin;
};

function validateRevenueInput(input: RevenueOperatorRunInput): string | null {
  if (!input.leadName?.trim()) return "input.leadName is required.";
  if (!input.leadEmail?.trim()) return "input.leadEmail is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.leadEmail.trim())) return "input.leadEmail must be a valid email.";
  if (!input.context?.trim()) return "input.context is required.";
  if (!input.goal?.trim()) return "input.goal is required.";
  return null;
}

function assertRunAllowed(readiness: OperatorReadiness): { ok: true } | { ok: false; status: number; error: string; readiness: OperatorReadiness } {
  if (readiness.status === "missing_connector") {
    return { ok: false, status: 409, error: readiness.reason, readiness };
  }
  if (readiness.status === "upgrade_required") {
    return { ok: false, status: 402, error: readiness.reason, readiness };
  }
  if (readiness.status === "coming_next" || readiness.status === "preview") {
    return { ok: false, status: 409, error: readiness.reason, readiness };
  }
  if (readiness.status !== "ready" && readiness.status !== "draft_only") {
    return { ok: false, status: 409, error: readiness.reason, readiness };
  }
  return { ok: true };
}

async function insertStep(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  runId: string;
  stepKey: string;
  title: string;
  status: "completed" | "blocked" | "failed";
  stepInput?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}) {
  return input.supabase.from("os_operator_run_steps").insert({
    id: operatorRuntimeId("opstep"),
    workspace_id: input.workspaceId,
    run_id: input.runId,
    step_key: input.stepKey,
    title: input.title,
    status: input.status,
    input: input.stepInput ?? {},
    output: input.output ?? {},
    error: input.error ?? null,
    completed_at: new Date().toISOString(),
  });
}

export async function runRevenueOperator(input: RunOperatorInput) {
  const supabase = input.supabase ?? createSupabaseAdmin();

  if (input.operatorKey !== "revenue") {
    return { ok: false as const, status: 400, error: "Only operatorKey=revenue is supported in Pass 3." };
  }

  const validationError = validateRevenueInput(input.input);
  if (validationError) {
    return { ok: false as const, status: 400, error: validationError };
  }

  const readiness = await getOperatorReadiness({ workspaceId: input.workspaceId, operatorKey: "revenue" });
  if (!readiness) {
    return { ok: false as const, status: 404, error: "Revenue Operator readiness was not found." };
  }

  const allowed = assertRunAllowed(readiness);
  if (!allowed.ok) return allowed;

  const emailConnector = resolveEmailConnector(readiness);
  if (!emailConnector) {
    return { ok: false as const, status: 409, error: "Revenue readiness reported ready, but no connected email connector (Gmail or Outlook) was found.", readiness };
  }

  const policy = evaluateManualRunPolicy({
    operatorKey: "revenue",
    readiness,
    action: emailConnector === "outlook" ? "outlook.follow_up_send" : "gmail.follow_up_send",
  });
  if (!policy.ok) {
    return { ok: false as const, status: 403, error: policy.reason, readiness };
  }

  const runId = operatorRuntimeId("oprun-revenue");
  const now = new Date().toISOString();
  const runInsert = await supabase.from("os_operator_runs").insert({
    id: runId,
    workspace_id: input.workspaceId,
    operator_key: "revenue",
    trigger_type: "manual",
    status: "running",
    input: input.input,
    output: {},
    readiness,
    risk_level: policy.riskLevel,
    started_at: now,
    created_at: now,
  });
  if (runInsert.error) {
    return { ok: false as const, status: 500, error: runInsert.error.message };
  }

  try {
    await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      eventType: "operator.run.started",
      message: "Revenue Operator manual run started.",
      metadata: { operatorKey: "revenue", triggerType: "manual" },
    });

    await insertStep({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      stepKey: "readiness_check",
      title: "Check operator readiness",
      status: "completed",
      output: { status: readiness.status, canRunManual: readiness.canRunManual },
    });
    await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      eventType: "readiness.checked",
      message: `Revenue readiness is ${readiness.status}.`,
      metadata: { readinessStatus: readiness.status },
    });

    const draft = prepareRevenueFollowUpEmail(input.input);
    await insertStep({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      stepKey: "prepare_follow_up",
      title: "Prepare follow-up email",
      status: "completed",
      stepInput: { leadEmail: input.input.leadEmail, goal: input.input.goal },
      output: draft,
    });
    await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      eventType: emailConnector === "outlook" ? "outlook.follow_up.prepared" : "gmail.follow_up.prepared",
      message: `Prepared follow-up email for ${draft.to}.`,
      metadata: { to: draft.to, subject: draft.subject },
    });

    await insertStep({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      stepKey: "policy_check",
      title: "Check execution policy",
      status: "completed",
      output: { requiresApproval: policy.requiresApproval, reason: policy.reason, riskLevel: policy.riskLevel },
    });
    await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      eventType: "policy.checked",
      message: policy.reason,
      metadata: { requiresApproval: policy.requiresApproval, riskLevel: policy.riskLevel },
    });

    const approval = emailConnector === "outlook"
      ? await createOutlookSendApproval({
        supabase,
        workspaceId: input.workspaceId,
        runId,
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
        policyReason: policy.reason,
      })
      : await createGmailSendApproval({
        supabase,
        workspaceId: input.workspaceId,
        runId,
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
        policyReason: policy.reason,
      });
    await insertStep({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      stepKey: "create_approval",
      title: "Create approval request",
      status: "completed",
      output: { approvalId: approval.approvalId },
    });
    await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      eventType: "approval.created",
      message: `Created ${emailConnector === "outlook" ? "Outlook" : "Gmail"} send approval ${approval.approvalId}.`,
      metadata: { approvalId: approval.approvalId },
    });

    const outputType = emailConnector === "outlook" ? "outlook_follow_up_draft" : "gmail_follow_up_draft";
    const output = {
      type: outputType,
      draft,
      approvalId: approval.approvalId,
    };
    const outputInsert = await supabase.from("os_operator_outputs").insert({
      id: operatorRuntimeId("opout"),
      workspace_id: input.workspaceId,
      run_id: runId,
      operator_key: "revenue",
      output_type: outputType,
      title: `Follow-up draft for ${input.input.leadName}`,
      payload: output,
      requires_approval: true,
      approval_id: approval.approvalId,
    });
    if (outputInsert.error) throw new Error(outputInsert.error.message);

    const runUpdate = await supabase.from("os_operator_runs").update({
      status: "waiting_for_approval",
      output,
      approval_id: approval.approvalId,
    }).eq("id", runId).eq("workspace_id", input.workspaceId);
    if (runUpdate.error) throw new Error(runUpdate.error.message);

    return {
      ok: true as const,
      run: {
        id: runId,
        workspaceId: input.workspaceId,
        operatorKey: "revenue",
        status: "waiting_for_approval",
        approvalId: approval.approvalId,
        readiness,
      },
      output,
      approval,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Revenue Operator run failed.";
    await supabase.from("os_operator_runs").update({
      status: "failed",
      error: message,
      completed_at: new Date().toISOString(),
    }).eq("id", runId).eq("workspace_id", input.workspaceId);
    await logOperatorEvent({
      supabase,
      workspaceId: input.workspaceId,
      runId,
      level: "error",
      eventType: "operator.run.failed",
      message,
    });
    return { ok: false as const, status: 500, error: message, readiness };
  }
}
