import "server-only";

import { prepareAction } from "@/lib/actions/execute";
import type { ActionIntent, PreparedAction } from "@/lib/actions/types";
import { getStoredAsanaCredential } from "@/lib/connectors/asana";
import { getStoredJiraCredential, isCreateableJiraIssueType, listJiraIssueTypes, resolveJiraAccessToken } from "@/lib/connectors/jira";
import { readMicrosoftTeamsSettings } from "@/lib/connectors/microsoft-teams";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { prepareRevenueFollowUpEmail } from "@/lib/operators/executors/gmail";
import { evaluateExecutionPolicy } from "@/lib/policies/execution-policy";
import { buildApprovalScope } from "@/lib/policies/approval-scope";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type Materialization =
  | { status: "ready"; action: PreparedAction; continuation: Record<string, unknown> }
  | { status: "blocked" | "needs_configuration"; reasonCode: string; humanReason: string };
type WorkflowRow = Record<string, unknown>;
type StepRow = Record<string, unknown>;

/** Removes controls and unbounded source text before it reaches a provider payload. */
export function sanitizeWorkflowText(value: string, max: number): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function missing(reasonCode: string, humanReason: string, configured = false): Materialization {
  return { status: configured ? "needs_configuration" : "blocked", reasonCode, humanReason };
}

function isVerifiedEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isSafeExternalDraft(value: string): boolean {
  return Boolean(value.trim()) && value.length <= 4_000 && !/{{|<todo>|\[insert details\]|system prompt|ignore previous/i.test(value);
}

function sourceContext(workflow: WorkflowRow, signal: WorkflowRow | null) {
  const objective = sanitizeWorkflowText(String(workflow.objective || "Follow up"), 120);
  const sourceId = sanitizeWorkflowText(String(signal?.source_id || ""), 160);
  const category = sanitizeWorkflowText(String(signal?.category || "workflow signal"), 80);
  const preview = sanitizeWorkflowText(String(signal?.content_preview || ""), 240);
  const title = sanitizeWorkflowText(`${objective}: ${category}`, 180);
  const description = sanitizeWorkflowText(`Workflow objective: ${objective}. Source reference: ${sourceId}. Evidence: ${preview || category}. Review the source before taking the next step.`, 900);
  const internalMessage = sanitizeWorkflowText(`${objective}. Source: ${sourceId}. Signal: ${preview || category}. A tracked recovery action is ready for review; please confirm the next owner and update.`, 900);
  return { objective, sourceId, title, description, internalMessage };
}

async function assertConnectorReady(input: { workspaceId: string; connectorKey: string; supabase: SupabaseAdmin }): Promise<Materialization | null> {
  const truth = await getConnectorTruth({ workspaceId: input.workspaceId, supabase: input.supabase });
  const connector = truth.find((row) => row.connectorKey === input.connectorKey);
  if (!connector || !["connected", "healthy"].includes(connector.status) || connector.executable === false || connector.reconnectRequired) {
    return missing("connector_not_ready", `Reconnect or configure ${input.connectorKey.replace(/_/g, " ")} before Auterim can prepare this action.`, true);
  }
  return null;
}

/** Produces a canonical action plus the existing provider continuation shape. */
async function materializeStep(input: { workspaceId: string; workflow: WorkflowRow; step: StepRow; signal: WorkflowRow | null; supabase: SupabaseAdmin }): Promise<Materialization> {
  const connectorKey = String(input.step.connector_key || "");
  const actionType = String(input.step.action_type || "");
  const source = sourceContext(input.workflow, input.signal);
  if (!source.sourceId) return missing("source_reference_missing", "Auterim needs the originating source reference before it can prepare this action.");
  const connectorIssue = await assertConnectorReady({ workspaceId: input.workspaceId, connectorKey, supabase: input.supabase });
  if (connectorIssue) return connectorIssue;

  const [settings, policy] = await Promise.all([
    loadWorkspacePolicySettings({ workspaceId: input.workspaceId, supabase: input.supabase }),
    loadPolicyWorkspaceSettings({ workspaceId: input.workspaceId, supabase: input.supabase }),
  ]);
  const common = {
    workspaceId: input.workspaceId, operatorKey: String(input.workflow.operator_key),
    dedupeKey: `workflow:${input.workflow.id}:${input.step.id}`, source: "workflow",
    metadata: { workflowId: input.workflow.id, workflowStepId: input.step.id, sourceReference: source.sourceId, payloadIdentity: `${input.workflow.id}:${input.step.id}:${source.sourceId}` },
  };
  let intent: ActionIntent;
  let continuation: Record<string, unknown>;

  if (connectorKey === "asana" && actionType === "create_asana_task") {
    const credential = await getStoredAsanaCredential(input.workspaceId, input.supabase);
    const projectId = typeof credential?.metadata?.selectedProjectId === "string" ? credential.metadata.selectedProjectId.trim() : "";
    if (!projectId) return missing("asana_project_not_selected", "Select an Asana project before Auterim can create this follow-up.", true);
    intent = { ...common, actionType: "create_asana_task", connectorKey, capability: "pm.tasks.create_after_approval", title: "Create Asana recovery task", summary: `Prepare a follow-up for ${source.objective}.`, input: { projectId, name: source.title, notes: source.description }, destinationType: "project_tool", normalizedTarget: projectId };
    continuation = { kind: "shared_action.execute_after_approval" };
  } else if (connectorKey === "trello" && actionType === "create_task") {
    const boardId = settings.trello.defaultBoardId;
    const listId = settings.trello.defaultListId;
    if (!boardId || !listId) return missing("trello_destination_not_selected", "Select a Trello board and list before Auterim can create this follow-up.", true);
    intent = { ...common, actionType: "create_task", connectorKey, capability: "pm.tasks.write_after_approval", title: "Create Trello recovery task", summary: `Prepare a follow-up for ${source.objective}.`, input: { boardId, listId, name: source.title, description: source.description }, destinationType: "project_tool", normalizedTarget: listId };
    continuation = { kind: "shared_action.execute_after_approval" };
  } else if (connectorKey === "slack" && actionType === "send_slack_message") {
    const channelId = settings.slack.slackDefaultChannelId;
    if (!channelId) return missing("slack_destination_not_selected", "Select a Slack channel before Auterim can escalate this delivery risk.", true);
    intent = { ...common, actionType: "send_slack_message", connectorKey, capability: "chat.messages.send_after_approval", title: "Post Slack delivery escalation", summary: `Prepare an internal escalation for ${source.objective}.`, input: { channelId, text: source.internalMessage }, destinationType: "internal", normalizedTarget: channelId };
    continuation = { kind: "slack.send_after_approval", channelId, text: source.internalMessage, context: { workflowId: input.workflow.id, workflowStepId: input.step.id, sourceReference: source.sourceId } };
  } else if (connectorKey === "microsoft_teams" && actionType === "send_teams_message") {
    const microsoft = await input.supabase.from("os_connector_credentials").select("metadata").eq("workspace_id", input.workspaceId).eq("connector_key", "microsoft").maybeSingle();
    const teams = readMicrosoftTeamsSettings((microsoft.data?.metadata ?? null) as Record<string, unknown> | null);
    if (!teams.enabled || !teams.defaultTeamId || !teams.defaultChannelId) return missing("teams_destination_not_selected", "Select a Microsoft Teams channel before Auterim can escalate this issue.", true);
    intent = { ...common, actionType: "send_teams_message", connectorKey, capability: "chat.messages.send_after_approval", title: "Post Teams customer escalation", summary: `Prepare an internal escalation for ${source.objective}.`, input: { teamId: teams.defaultTeamId, channelId: teams.defaultChannelId, text: source.internalMessage }, destinationType: "internal", normalizedTarget: teams.defaultChannelId };
    continuation = { kind: "teams.send_after_approval", teamId: teams.defaultTeamId, teamName: teams.defaultTeamName, channelId: teams.defaultChannelId, channelName: teams.defaultChannelName, channelMembershipType: teams.defaultChannelMembershipType, text: source.internalMessage };
  } else if (connectorKey === "jira" && actionType === "create_jira_issue") {
    const credential = await getStoredJiraCredential(input.workspaceId, input.supabase);
    const projectId = typeof credential?.metadata?.selectedProjectId === "string" ? credential.metadata.selectedProjectId.trim() : "";
    const issueTypeId = typeof credential?.metadata?.selectedIssueTypeId === "string" ? credential.metadata.selectedIssueTypeId.trim() : "";
    if (!projectId || !issueTypeId) return missing("jira_issue_type_not_configured", "Select a Jira project and default issue type before Auterim can create this follow-up.", true);
    const cloudId = typeof credential?.metadata?.cloudId === "string" ? credential.metadata.cloudId : "";
    if (!credential || !cloudId) return missing("jira_destination_not_configured", "Jira needs attention before Auterim can validate this project.", true);
    try {
      const token = await resolveJiraAccessToken({ workspaceId: input.workspaceId, credential, supabase: input.supabase });
      const validTypes = await listJiraIssueTypes(token, cloudId, projectId);
      if (!validTypes.some((item) => item.id === issueTypeId && isCreateableJiraIssueType(item))) return missing("jira_issue_type_invalid", "The saved Jira issue type is no longer valid for this project. Choose a new default issue type.", true);
    } catch {
      return missing("jira_validation_unavailable", "Jira needs attention before Auterim can validate this workflow action.", true);
    }
    intent = { ...common, actionType: "create_jira_issue", connectorKey, capability: "pm.tasks.create_after_approval", title: "Create Jira recovery issue", summary: `Prepare a follow-up for ${source.objective}.`, input: { projectId, issueTypeId, summary: source.title, description: source.description }, destinationType: "project_tool", normalizedTarget: projectId };
    continuation = { kind: "shared_action.execute_after_approval" };
  } else if (actionType === "send_email" && ["gmail", "microsoft"].includes(connectorKey)) {
    const recipient = sanitizeWorkflowText(String(input.signal?.actor || ""), 254).toLowerCase();
    if (!isVerifiedEmail(recipient)) return missing("verified_recipient_not_available", "Auterim could not identify a verified recipient for this follow-up.");
    // This is Revenue's existing conservative deterministic draft helper. It
    // keeps the workflow path from introducing a second email drafting system.
    const draft = prepareRevenueFollowUpEmail({ leadName: "there", leadEmail: recipient, context: source.description, goal: "follow_up" });
    if (!isSafeExternalDraft(draft.subject) || !isSafeExternalDraft(draft.body)) return missing("verified_draft_not_available", "Auterim has not prepared a verified customer-facing draft for this workflow step yet.");
    intent = { ...common, actionType: "send_email", connectorKey, capability: "email.send_after_approval", title: "Send revenue follow-up", summary: `Prepare a customer follow-up to ${recipient}.`, input: { to: recipient, subject: draft.subject, body: draft.body }, destinationType: "customer", normalizedTarget: recipient };
    continuation = { kind: connectorKey === "microsoft" ? "microsoft.send_after_approval" : "gmail.send_after_approval", to: recipient, subject: draft.subject, body: draft.body, draftSubject: draft.subject, draftBody: draft.body, originalDraftSubject: draft.subject, originalDraftBody: draft.body, editedDraftSubject: null, editedDraftBody: null, wasEdited: false, sourceMetadata: { sourceReference: source.sourceId, workflowEvidence: true }, preparedActions: ["send_revenue_follow_up"] };
  } else if (["reply_zendesk_ticket", "reply_intercom_conversation"].includes(actionType)) {
    return missing("verified_draft_not_available", "Auterim has not prepared a verified customer-facing draft for this workflow step yet.");
  } else return missing("unsupported_workflow_step", "This workflow step is not supported by the current action adapter.");

  const action = prepareAction(intent, { policySettings: policy });
  if (!action.policyInput) return missing("policy_input_missing", "Auterim could not safely evaluate this proposed action.");
  return { status: "ready", action, continuation };
}

/** Links an exact, still-pending Client Flow draft instead of creating a second customer reply. */
async function findExistingCustomerReply(input: { workspaceId: string; actionType: string; connectorKey: string; sourceId: string; supabase: SupabaseAdmin }): Promise<{ approvalId: string; action: PreparedAction; continuation: Record<string, unknown> } | null> {
  if (![["zendesk", "reply_zendesk_ticket", "ticketId"], ["intercom", "reply_intercom_conversation", "conversationId"]].some(([connector, action]) => connector === input.connectorKey && action === input.actionType)) return null;
  const key = input.connectorKey === "zendesk" ? "ticketId" : "conversationId";
  const rows = await input.supabase.from("os_approvals").select("id,continuation_payload").eq("workspace_id", input.workspaceId).eq("status", "pending").limit(100);
  if (rows.error) throw new Error(`Existing customer drafts could not be loaded: ${rows.error.message}`);
  for (const row of rows.data ?? []) {
    const continuation = row.continuation_payload && typeof row.continuation_payload === "object" ? row.continuation_payload as Record<string, unknown> : null;
    const action = continuation?.preparedAction && typeof continuation.preparedAction === "object" ? continuation.preparedAction as PreparedAction : null;
    if (continuation?.kind === "shared_action.execute_after_approval" && action?.actionType === input.actionType && action.connectorKey === input.connectorKey && action.input?.[key] === input.sourceId) {
      return { approvalId: String(row.id), action, continuation };
    }
  }
  return null;
}

/** Materializes one durable step. It never contacts a provider and only creates complete approvals. */
export async function materializeWorkflowStep(input: { workflowId: string; stepId: string; workspaceId: string; supabase?: SupabaseAdmin }): Promise<Materialization> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const [workflowResult, stepResult] = await Promise.all([
    supabase.from("os_workflow_runs").select("id,workspace_id,operator_key,originating_signal_id,objective,status").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle(),
    supabase.from("os_workflow_steps").select("id,workflow_id,workspace_id,step_order,action_type,connector_key,status,approval_id,dependency_step_ids").eq("id", input.stepId).eq("workflow_id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle(),
  ]);
  if (workflowResult.error || !workflowResult.data || stepResult.error || !stepResult.data) throw new Error("Workflow step not found.");
  if (stepResult.data.approval_id) return missing("approval_already_exists", "This action is already awaiting a decision.");
  const signalResult = workflowResult.data.originating_signal_id ? await supabase.from("os_signal_events").select("source_id,category,content_preview,actor").eq("id", workflowResult.data.originating_signal_id).eq("workspace_id", input.workspaceId).maybeSingle() : { data: null };
  const existingReply = await findExistingCustomerReply({ workspaceId: input.workspaceId, actionType: String(stepResult.data.action_type), connectorKey: String(stepResult.data.connector_key), sourceId: String(signalResult.data?.source_id || ""), supabase });
  if (existingReply) {
    const policyInput = existingReply.action.policyInput;
    if (!policyInput) return missing("policy_input_missing", "Auterim could not safely evaluate this proposed action.");
    const decision = await evaluateExecutionPolicy({ supabase, policyInput });
    if (decision.executionDecision === "deny" || decision.executionDecision === "pause_operator") return missing("policy_blocked", "Current workspace policy does not allow this action.");
    await supabase.from("os_workflow_steps").update({ status: "awaiting_approval", approval_id: existingReply.approvalId, execution_intent_id: decision.intentId ?? null, block_reason: null }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
    await supabase.from("os_workflow_runs").update({ status: "awaiting_approval" }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
    return { status: "ready", action: existingReply.action, continuation: existingReply.continuation };
  }
  const materialized = await materializeStep({ workspaceId: input.workspaceId, workflow: workflowResult.data, step: stepResult.data, signal: signalResult.data, supabase });
  if (materialized.status !== "ready") {
    await supabase.from("os_workflow_steps").update({ status: "blocked", block_reason: materialized.reasonCode }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
    return materialized;
  }
  const policyInput = materialized.action.policyInput;
  if (!policyInput) return missing("policy_input_missing", "Auterim could not safely evaluate this proposed action.");
  const decision = await evaluateExecutionPolicy({ supabase, policyInput });
  if (decision.executionDecision === "deny" || decision.executionDecision === "pause_operator") {
    await supabase.from("os_workflow_steps").update({ status: "blocked", block_reason: decision.reasonCode, execution_intent_id: decision.intentId ?? null }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
    return missing("policy_blocked", "Current workspace policy does not allow this action.");
  }
  const approvalId = `appr-workflow-${input.workflowId}-${input.stepId}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 200);
  const approvalScope = buildApprovalScope(policyInput, decision);
  const continuation = { ...materialized.continuation, workspaceId: input.workspaceId, operatorKey: workflowResult.data.operator_key, preparedAction: materialized.action, workflowId: input.workflowId, workflowObjective: workflowResult.data.objective, workflowStepId: input.stepId, workflowStepOrder: stepResult.data.step_order, workflowStepReason: "Prepared from verified workflow evidence.", approvalScope, policyEvidence: decision.evidence };
  const insert = await supabase.from("os_approvals").insert({ id: approvalId, workspace_id: input.workspaceId, type: "action", title: materialized.action.title, body: materialized.action.summary, agent_id: workflowResult.data.operator_key, agent_mark: "WF", agent_color: "#4DE8E1", run_id: null, status: "pending", dedupe_key: `workflow:${input.workflowId}:${input.stepId}`, continuation_payload: continuation, approval_scope: approvalScope, policy_evidence: decision.evidence, policy_reason: decision.reason });
  if (insert.error && insert.error.code !== "23505") throw new Error(`Workflow approval creation failed: ${insert.error.message}`);
  if (decision.intentId) await supabase.from("os_execution_intents").update({ status: "awaiting_approval", approval_id: approvalId }).eq("id", decision.intentId).eq("workspace_id", input.workspaceId);
  await supabase.from("os_workflow_steps").update({ status: "awaiting_approval", approval_id: approvalId, execution_intent_id: decision.intentId ?? null, block_reason: null }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
  await supabase.from("os_workflow_runs").update({ status: "awaiting_approval" }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  return materialized;
}
