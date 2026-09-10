import { getConnectorTruth } from "@/lib/connectors/truth";
import { getStoredAsanaCredential, listAsanaTasks, resolveAsanaAccessToken, type AsanaTask } from "@/lib/connectors/asana";
import { getJiraProject, getStoredJiraCredential, resolveJiraAccessToken, searchJiraIssues } from "@/lib/connectors/jira";
import { getStoredZendeskCredential, listZendeskTickets, normalizeZendeskTicket, resolveZendeskAccessToken } from "@/lib/connectors/zendesk";
import {
  listTrelloLists,
  listTrelloCardsDetailed,
  listRecentTrelloCardComments,
  TrelloExecutionError,
  type TrelloCardDetailed,
  type TrelloList,
} from "@/lib/operators/executors/trello";
import { EMPTY_TEAMS_OPERATOR_SIGNALS, getTeamsOperatorSignals, type TeamsOperatorSignals } from "@/lib/operators/executors/microsoft-teams";
import { prepareAction } from "@/lib/actions/execute";
import type { PreparedAction } from "@/lib/actions/types";
import type { Capability } from "@/lib/connectors/capabilities";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { sendSlackApprovalNotification } from "@/lib/notifications/slack";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getWorkspaceExecutionEligibility } from "@/lib/os/execution-eligibility";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { evaluatePolicy } from "@/lib/policies/evaluate";
import { buildApprovalScope } from "@/lib/policies/approval-scope";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { getAppUrl } from "@/lib/urls";
import {
  decideOperationsCardSignal,
  decideOperationsListSignal,
  detectEscalationLabels,
  extractBlockerReason,
  type OperationsDecision,
  type OperationsSignalType,
} from "@/lib/operators/operations/ai-drafting";
import { detectZendeskOperationsSignal } from "@/lib/operators/operations/zendesk-signals";
import { getStoredIntercomCredential, listIntercomConversations, normalizeIntercomConversation, resolveIntercomAccessToken } from "@/lib/connectors/intercom";
import { detectIntercomOperationsSignal } from "@/lib/operators/operations/intercom-signals";
import { loadSelectedGoogleDriveContext } from "@/lib/connectors/google-drive";
import { normalizeDriveSignal, normalizeProjectTaskSignal, normalizeZendeskSignal } from "@/lib/signals/adapters";
import { ingestSignalBatch } from "@/lib/signals/store";
import type { SignalEvent } from "@/lib/signals/types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type OperationsScanSourceMode = "scheduled" | "manual" | "event_ready";

const OPERATIONS_AGENT_ID = "operations";
const OPERATIONS_AGENT_MARK = "OP";
const OPERATIONS_AGENT_COLOR = "#66D0E0";

function actionGovernance(action: PreparedAction | null, policySettings: Awaited<ReturnType<typeof loadPolicyWorkspaceSettings>>) {
  if (!action?.policyInput) return null;
  const decision = evaluatePolicy(action.policyInput, policySettings);
  return { scope: buildApprovalScope(action.policyInput, decision), evidence: decision.evidence };
}

const MAX_LISTS = 12;
const MAX_CARDS_PER_LIST = 40;
const MAX_APPROVALS_PER_RUN = 6;
const STUCK_DAYS = 14;
const NO_ACTIVITY_DAYS = 30;
const DUE_SOON_HOURS = 48;
const TOO_MANY_OPEN = 12;
const MIN_DESC_LENGTH = 15;
const NO_OWNER_MIN_AGE_DAYS = 3;
const BLOCKER_WORDS = ["blocked", "blocker", "waiting", "stuck", "issue", "problem", "on hold", "can't proceed", "cannot proceed"];

// A signal-gated, per-run cap on the extra Trello "recent comments" call
// (see listRecentTrelloCardComments). Comments are only fetched for cards
// that already triggered a signal, and only for signal types where a blocker
// phrase is actually useful context, but this hard cap keeps a single scan
// bounded even on a very active board.
const MAX_COMMENT_FETCHES_PER_RUN = 20;
const COMMENT_FETCH_LIMIT = 8;
const BLOCKER_CONTEXT_SIGNALS = new Set<OperationsSignalType>([
  "blocked_work",
  "stuck_card",
  "no_recent_activity",
  "checklist_stalled",
  "escalation_label",
  "overdue_card",
]);

export type OperationsScanSummary = {
  status?: string;
  message?: string;
  sourceMode?: OperationsScanSourceMode;
  setupComplete?: boolean;
  cardsChecked?: number;
  signalsFound?: number;
  approvalsCreated?: number;
  signals?: {
    signalType: OperationsSignalType;
    severity: string;
    cardName?: string;
    listName?: string;
    runId: string;
    approvalId: string;
    dedupeKey: string;
    isReactivation?: boolean;
  }[];
  observed?: {
    cardId: string;
    cardName: string;
    listName: string;
    signalType: OperationsSignalType;
    bestNextAction: string;
    reason: string;
    dedupeKey: string;
    runId: string;
  }[];
  outcomeMetrics?: {
    flaggedCardCount?: number;
    cardsRecoveredSinceLastScan?: number;
    observedCount?: number;
    waitingExternalCount?: number;
  };
  skipped?: { reason: string; count: number }[];
  /**
   * Microsoft Teams read context for this run. Optional enhancement only:
   * Operations still runs end to end on Trello alone, and a Teams failure
   * never fails the scan (see the guarded call in scanOperationsSignals).
   * Contains counts, provider ids and safe reason codes - never message text.
   */
  teams?: TeamsOperatorSignals;
  zendesk?: { scanned: number; risksFound: number };
  intercom?: { scanned: number; risksFound: number };
  googleDrive?: { scanned: number; usable: number; skipped: number };
  setup?: Record<string, unknown>;
  error?: string;
  details?: unknown;
};

export type OperationsScanResult = {
  ok: boolean;
  status: number;
  body: OperationsScanSummary;
};

type DedupeReason = "existing_pending_approval" | "already_approved" | "previously_rejected" | "already_handled";

function reasonFromApprovalStatus(status: unknown): DedupeReason {
  if (status === "pending" || status === "executing") return "existing_pending_approval";
  if (status === "approved" || status === "partially_completed" || status === "completed") return "already_approved";
  if (status === "rejected") return "previously_rejected";
  return "already_handled";
}

function collectDedupeKeys(value: unknown, set: Set<string>) {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const [key, val] of Object.entries(record)) {
    if ((key === "dedupeKey" || key === "dedupe_key") && typeof val === "string" && val) set.add(val);
    else if (val && typeof val === "object") collectDedupeKeys(val, set);
  }
}

async function loadOperationsDedupeState(input: { supabase: SupabaseAdmin; workspaceId: string }): Promise<Map<string, DedupeReason>> {
  const refs = new Map<string, DedupeReason>();
  const [approvals, runs, outputs, logs] = await Promise.all([
    input.supabase.from("os_approvals").select("status,dedupe_key,continuation_payload").eq("workspace_id", input.workspaceId).eq("agent_id", OPERATIONS_AGENT_ID).limit(500),
    input.supabase.from("os_operator_runs").select("input,output").eq("workspace_id", input.workspaceId).eq("operator_key", "operations").limit(500),
    input.supabase.from("os_operator_outputs").select("payload").eq("workspace_id", input.workspaceId).eq("operator_key", "operations").limit(500),
    input.supabase.from("os_operator_run_logs").select("metadata").eq("workspace_id", input.workspaceId).limit(500),
  ]);

  (approvals.data ?? []).forEach((row) => {
    const reason = reasonFromApprovalStatus(row.status);
    if (typeof row.dedupe_key === "string" && row.dedupe_key) {
      const current = refs.get(row.dedupe_key);
      if (current !== "already_approved" && current !== "existing_pending_approval") refs.set(row.dedupe_key, reason);
    }
    const keys = new Set<string>();
    collectDedupeKeys(row.continuation_payload, keys);
    keys.forEach((key) => {
      const current = refs.get(key);
      if (current !== "already_approved" && current !== "existing_pending_approval") refs.set(key, reason);
    });
  });
  const handledFrom = (rows: { [k: string]: unknown }[] | null, field: string) => {
    (rows ?? []).forEach((row) => {
      const keys = new Set<string>();
      collectDedupeKeys(row[field], keys);
      keys.forEach((key) => { if (!refs.has(key)) refs.set(key, "already_handled"); });
    });
  };
  handledFrom(runs.data, "input");
  handledFrom(runs.data, "output");
  handledFrom(outputs.data, "payload");
  handledFrom(logs.data, "metadata");
  return refs;
}

function listKind(name: string): "done" | "review" | "blocked" | "other" {
  const n = name.toLowerCase();
  if (/(^|\b)(done|complete|completed|shipped|archive|archived|closed)(\b|$)/.test(n)) return "done";
  if (/(review|qa|q\.a\.|to review|approval)/.test(n)) return "review";
  if (/blocked|on hold/.test(n)) return "blocked";
  return "other";
}

function ageDays(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 86400000;
}

// Signal detection order matters: escalation labels are the most explicit,
// human-declared signal available (someone deliberately marked this card
// urgent/blocked), so they are checked first and win over everything else.
// Checklist-based staleness is checked before the generic stuck/no-activity
// checks because a stalled card with an incomplete checklist is a stronger,
// more specific signal than one with no checklist at all. no_owner is
// checked last among the "positive" signals, after due-date/review/activity
// checks, so it only surfaces when nothing more specific already did.
function detectCardSignal(card: TrelloCardDetailed, kind: ReturnType<typeof listKind>): OperationsSignalType | null {
  if (kind === "done") return null;
  if (detectEscalationLabels(card.labels).length > 0) return "escalation_label";
  const text = `${card.name} ${card.desc}`.toLowerCase();
  if (BLOCKER_WORDS.some((word) => text.includes(word))) return "blocked_work";
  if (card.due && !card.dueComplete) {
    const dueTime = new Date(card.due).getTime();
    if (Number.isFinite(dueTime)) {
      if (dueTime < Date.now()) return "overdue_card";
      if (dueTime < Date.now() + DUE_SOON_HOURS * 3600000) return "due_soon";
    }
  }
  if (kind === "review" && !card.dueComplete) return "review_needed";
  const activity = ageDays(card.dateLastActivity);
  const checklistIncomplete = card.badges.checklistItems > 0 && card.badges.checklistItemsChecked < card.badges.checklistItems;
  if (checklistIncomplete && activity !== null && activity > STUCK_DAYS) return "checklist_stalled";
  if (activity !== null && activity > NO_ACTIVITY_DAYS) return "no_recent_activity";
  if (activity !== null && activity > STUCK_DAYS) return "stuck_card";
  if (card.idMembers.length === 0 && activity !== null && activity > NO_OWNER_MIN_AGE_DAYS) return "no_owner";
  if (card.desc.trim().length < MIN_DESC_LENGTH) return "missing_next_step";
  return null;
}

const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function trelloCapabilityFor(actionType: "add_task_comment" | "move_task" | "create_task"): Capability {
  if (actionType === "move_task") return "pm.tasks.update_after_approval";
  if (actionType === "add_task_comment") return "pm.comments.write_after_approval";
  return "pm.tasks.write_after_approval";
}

function nextDailyRunFrom(lastRunAt: string): string {
  return new Date(new Date(lastRunAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

async function upsertOperationsMonitoringConfig(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  sourceMode: OperationsScanSourceMode;
  lastRunAt: string;
  lastRunStatus: string;
  lastRunSummary: Record<string, unknown>;
}) {
  return input.supabase.from("os_operator_triggers").upsert({
    id: `optrig-${input.workspaceId}-operations-monitoring`,
    workspace_id: input.workspaceId,
    operator_key: "operations",
    trigger_type: "scheduled_monitoring",
    enabled: true,
    config: {
      monitoringEnabled: true,
      cadence: "daily",
      scheduleProvider: "trigger.dev",
      triggerTaskId: "operations-operator-daily-scan",
      lastRunAt: input.lastRunAt,
      nextRunAt: nextDailyRunFrom(input.lastRunAt),
      lastRunStatus: input.lastRunStatus,
      lastRunSummary: input.lastRunSummary,
      manualRunAvailable: true,
      sourceMode: input.sourceMode,
    },
  });
}

function scanFailure(error: unknown): OperationsScanResult {
  if (error instanceof TrelloExecutionError) {
    return { ok: false, status: error.details.status || 502, body: { error: "trello_scan_failed", message: error.message, details: error.details } };
  }
  return { ok: false, status: 500, body: { error: "operations_scan_failed", message: error instanceof Error ? error.message : "Operations scan failed." } };
}

export async function scanOperationsSignals(input: {
  workspaceId: string;
  sourceMode?: OperationsScanSourceMode;
  supabase?: SupabaseAdmin;
}): Promise<OperationsScanResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const workspaceId = input.workspaceId.trim();
  const sourceMode = input.sourceMode ?? "manual";

  const [truth, policy] = await Promise.all([
    getConnectorTruth({ workspaceId, supabase }),
    loadWorkspacePolicySettings({ supabase, workspaceId }),
  ]);
  const policySettings = await loadPolicyWorkspaceSettings({ supabase, workspaceId });
  const isConnected = (key: string) => truth.some((c) =>
    c.connectorKey === key
    && (c.status === "healthy" || c.status === "connected")
    && c.executable === true);
  const trelloConnected = isConnected("trello");
  const asanaTruth = truth.find((c) => c.connectorKey === "asana");
  const asanaConnected = asanaTruth?.status === "healthy";
  const asanaExecutable = asanaTruth?.executable === true;
  const asanaCredential = asanaConnected ? await getStoredAsanaCredential(workspaceId, supabase) : null;
  const asanaMetadata = (asanaCredential?.metadata ?? {}) as Record<string, unknown>;
  const asanaProjectId = typeof asanaMetadata.selectedProjectId === "string" ? asanaMetadata.selectedProjectId : null;
  const jiraTruth = truth.find((c) => c.connectorKey === "jira");
  const jiraConnected = jiraTruth?.status === "healthy";
  const jiraExecutable = jiraTruth?.executable === true;
  const jiraCredential = jiraConnected ? await getStoredJiraCredential(workspaceId, supabase) : null;
  const jiraMetadata = (jiraCredential?.metadata ?? {}) as Record<string, unknown>;
  const jiraProjectId = typeof jiraMetadata.selectedProjectId === "string" ? jiraMetadata.selectedProjectId : null;
  const slackConnected = isConnected("slack");
  const boardId = policy.trello.defaultBoardId;
  const boardName = policy.trello.defaultBoardName ?? "Default board";
  const slackChannelId = policy.slack.slackDefaultChannelId;
  const slackChannelName = policy.slack.slackDefaultChannelName;

  // Microsoft Teams is a native (direct-OAuth) connector, so its truth row has
  // no Nango ids - it is checked on its own healthy/executable truth instead.
  const teamsTruth = truth.find((c) => c.connectorKey === "microsoft_teams") ?? null;
  const teamsConnected = teamsTruth?.status === "healthy";
  const zendeskTruth = truth.find((c) => c.connectorKey === "zendesk");
  const zendeskConnected = zendeskTruth?.status === "healthy";
  const intercomTruth = truth.find((c) => c.connectorKey === "intercom");
  const intercomConnected = intercomTruth?.status === "healthy";
  let googleDriveContext = { scanned: 0, usable: 0, skipped: 0 };
  const googleDriveTruth = truth.find((c) => c.connectorKey === "google_drive");
  if (googleDriveTruth?.status === "healthy") {
    try {
      const context = await loadSelectedGoogleDriveContext({ workspaceId, supabase, maxFiles: 5 });
      googleDriveContext = { scanned: context.scanned, usable: context.files.length, skipped: context.skipped };
      // Drive changes are awareness events only. The central engine stores a
      // bounded reference and never lets document text create work by itself.
      await ingestSignalBatch({ workspaceId, events: context.files.map((file) => normalizeDriveSignal({ workspaceId, file })), supabase });
    } catch (error) { console.warn("[operations-scan] Drive context skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown Drive error" }); }
  }

  const setup = {
    trelloConnected,
    asanaConnected,
    asanaExecutable,
    asanaProjectSelected: Boolean(asanaProjectId),
    jiraConnected,
    jiraExecutable,
    jiraProjectSelected: Boolean(jiraProjectId),
    trelloDestinationSet: Boolean(policy.trello.defaultBoardId && policy.trello.defaultListId),
    slackConnected,
    slackChannelSelected: Boolean(slackChannelId),
    teamsConnected,
    zendeskConnected,
    zendeskExecutable: zendeskTruth?.executable === true,
    boardName,
  };

  if (!trelloConnected || !boardId) {
    if (asanaConnected && asanaProjectId && asanaCredential) {
      const eligibility = await getWorkspaceExecutionEligibility(workspaceId, supabase);
      if (!eligibility.eligible) return { ok: false, status: 402, body: { status: "plan_required", message: eligibility.reason, sourceMode, setup } };
      try {
        const token = await resolveAsanaAccessToken({ workspaceId, credential: asanaCredential, supabase });
        const tasks: AsanaTask[] = await listAsanaTasks(token, asanaProjectId);
        const overdue = tasks.find((task) => !task.completed && task.due_on && new Date(task.due_on).getTime() < Date.now());
        const stale = !overdue ? tasks.find((task) => !task.completed && task.modified_at && Date.now() - new Date(task.modified_at).getTime() > STUCK_DAYS * 86400000) : null;
        const candidate = overdue ?? stale;
        if (!candidate || !asanaExecutable) {
          return { ok: true, status: 200, body: { status: "completed", setupComplete: true, message: `Read ${tasks.length} Asana tasks for Operations.${asanaExecutable ? " No follow-up signal met the launch threshold." : " Write permissions are not enabled, so no Asana action was proposed."}`, sourceMode, cardsChecked: tasks.length, signalsFound: candidate ? 1 : 0, approvalsCreated: 0, setup, skipped: [{ reason: asanaExecutable ? "no_action_threshold" : "asana_write_scope_missing", count: tasks.length }] } };
        }
        const handled = await loadOperationsDedupeState({ supabase, workspaceId });
        const signalType = overdue ? "overdue_card" : "stuck_card";
        const dedupeKey = `operations:asana:task:${candidate.gid}:${signalType}:${new Date().toISOString().slice(0, 10)}`;
        if (handled.has(dedupeKey)) return { ok: true, status: 200, body: { status: "completed", setupComplete: true, message: "The Asana signal was already handled for today.", sourceMode, cardsChecked: tasks.length, signalsFound: 1, approvalsCreated: 0, setup, skipped: [{ reason: handled.get(dedupeKey) ?? "already_handled", count: 1 }] } };
        const preparedAsanaAction = prepareAction({ workspaceId, operatorKey: "operations", actionType: "create_asana_task", connectorKey: "asana", capability: "pm.tasks.create_after_approval", title: "Create an Asana follow-up task", summary: `Prepare a follow-up for ${candidate.name} because it is ${overdue ? "overdue" : "stale"}.`, input: { projectId: asanaProjectId, name: `Follow up: ${candidate.name}`, notes: `Auterim detected ${overdue ? "an overdue" : "a stale"} task during Operations monitoring. Review the source task before execution.`, dueOn: null }, dedupeKey, source: "asana_scan", destinationType: "project_tool", normalizedTarget: candidate.gid, metadata: { asanaProjectId, asanaTaskId: candidate.gid, payloadIdentity: `${candidate.gid}:${signalType}`, signalType } }, { policySettings });
        const runId = operatorRuntimeId("oprun-operations-asana"); const startedAt = new Date().toISOString();
        const runInsert = await supabase.from("os_operator_runs").insert({ id: runId, workspace_id: workspaceId, operator_key: "operations", trigger_type: "asana_scan", status: "waiting_for_approval", input: { source: "asana_scan", sourceMode, dedupeKey, signalType, taskId: candidate.gid }, output: {}, readiness: {}, risk_level: "medium", started_at: startedAt });
        if (runInsert.error) throw new Error(runInsert.error.message);
        const approvalId = operatorRuntimeId("appr-operations-asana");
        const approvalInsert = await supabase.from("os_approvals").insert({ id: approvalId, workspace_id: workspaceId, type: "action", title: preparedAsanaAction.title, body: preparedAsanaAction.summary, agent_id: OPERATIONS_AGENT_ID, agent_mark: OPERATIONS_AGENT_MARK, agent_color: OPERATIONS_AGENT_COLOR, run_id: runId, status: "pending", dedupe_key: dedupeKey, created_at: startedAt, continuation_payload: { kind: "shared_action.execute_after_approval", workspaceId, operatorKey: "operations", preparedAction: preparedAsanaAction }, policy_reason: "Asana writes require human approval before execution." });
        if (approvalInsert.error) throw new Error(approvalInsert.error.message);
        return { ok: true, status: 200, body: { status: "completed", setupComplete: true, message: "Operations prepared an approval-gated Asana follow-up task.", sourceMode, cardsChecked: tasks.length, signalsFound: 1, approvalsCreated: 1, signals: [{ signalType, severity: "medium", cardName: candidate.name, listName: "Asana project", runId, approvalId, dedupeKey }], setup } };
      } catch { return { ok: false, status: 502, body: { error: "asana_scan_failed", message: "Could not read the selected Asana project.", sourceMode, setup } }; }
    }
    if (jiraConnected && jiraProjectId && jiraCredential) {
      const eligibility = await getWorkspaceExecutionEligibility(workspaceId, supabase);
      if (!eligibility.eligible) return { ok: false, status: 402, body: { status: "plan_required", message: eligibility.reason, sourceMode, setup } };
      try {
        const cloudId = typeof jiraMetadata.cloudId === "string" ? jiraMetadata.cloudId : null;
        if (!cloudId) throw new Error("Jira site discovery is incomplete.");
        const token = await resolveJiraAccessToken({ workspaceId, credential: jiraCredential, supabase });
        const project = await getJiraProject(token, cloudId, jiraProjectId);
        const issues = await searchJiraIssues(token, cloudId, project, { maxResults: 100 });
        const terminal = new Set(["done", "closed", "resolved", "cancelled"]);
        const now = Date.now();
        const candidate = issues.find((issue) => {
          const status = issue.status.toLowerCase(); if (terminal.has(status)) return false;
          const blocker = issue.labels.some((label) => /blocked|blocker|impediment/i.test(label)) || /\b(blocked|blocker|impediment|cannot proceed|can't proceed)\b/i.test(`${issue.summary} ${issue.description}`);
          const overdue = Boolean(issue.dueAt && new Date(issue.dueAt).getTime() < now);
          const stale = Boolean(issue.updatedAt && now - new Date(issue.updatedAt).getTime() > STUCK_DAYS * 86400000 && /highest|high|critical|urgent/i.test(issue.priority ?? ""));
          return blocker || overdue || stale || (!issue.assigneeAccountId && /highest|high|critical|urgent/i.test(issue.priority ?? ""));
        });
        if (!candidate || !jiraExecutable) return { ok: true, status: 200, body: { status: "completed", setupComplete: true, message: `Read ${issues.length} Jira issues for Operations.${jiraExecutable ? " No follow-up signal met the launch threshold." : " Write permissions are not enabled, so no Jira action was proposed."}`, sourceMode, cardsChecked: issues.length, signalsFound: candidate ? 1 : 0, approvalsCreated: 0, setup, skipped: [{ reason: jiraExecutable ? "no_action_threshold" : "jira_write_scope_missing", count: issues.length }] } };
        const handled = await loadOperationsDedupeState({ supabase, workspaceId });
        const explicitBlocked = candidate.labels.some((label) => /blocked|blocker|impediment/i.test(label)) || /\b(blocked|blocker|impediment|cannot proceed|can't proceed)\b/i.test(`${candidate.summary} ${candidate.description}`);
        const signalType: OperationsSignalType = explicitBlocked ? "blocked_work" : candidate.dueAt && new Date(candidate.dueAt).getTime() < now ? "overdue_card" : "stuck_card";
        const dedupeKey = `operations:jira:issue:${candidate.issueKey}:${signalType}:${new Date().toISOString().slice(0, 10)}`;
        if (handled.has(dedupeKey)) return { ok: true, status: 200, body: { status: "completed", setupComplete: true, message: "The Jira signal was already handled for today.", sourceMode, cardsChecked: issues.length, signalsFound: 1, approvalsCreated: 0, setup, skipped: [{ reason: handled.get(dedupeKey) ?? "already_handled", count: 1 }] } };
        const prepared = prepareAction({ workspaceId, operatorKey: "operations", actionType: "add_jira_comment", connectorKey: "jira", capability: "pm.comments.write_after_approval", title: "Add a Jira blocker follow-up comment", summary: `Prepare a follow-up for ${candidate.issueKey} because it is ${signalType.replace("_", " ")}.`, input: { issueKey: candidate.issueKey, text: `Auterim detected ${signalType.replace("_", " ")} during Operations monitoring. Review the issue and confirm the next step.` }, dedupeKey, source: "jira_scan", destinationType: "project_tool", normalizedTarget: candidate.issueKey, metadata: { jiraCloudId: cloudId, jiraProjectId: project.id, jiraIssueKey: candidate.issueKey, payloadIdentity: `${candidate.issueKey}:${signalType}`, signalType } }, { policySettings });
        const runId = operatorRuntimeId("oprun-operations-jira"); const startedAt = new Date().toISOString(); const runInsert = await supabase.from("os_operator_runs").insert({ id: runId, workspace_id: workspaceId, operator_key: "operations", trigger_type: "jira_scan", status: "waiting_for_approval", input: { source: "jira_scan", sourceMode, dedupeKey, signalType, issueKey: candidate.issueKey }, output: {}, readiness: {}, risk_level: "medium", started_at: startedAt }); if (runInsert.error) throw new Error(runInsert.error.message);
        const approvalId = operatorRuntimeId("appr-operations-jira"); const approvalInsert = await supabase.from("os_approvals").insert({ id: approvalId, workspace_id: workspaceId, type: "action", title: prepared.title, body: prepared.summary, agent_id: OPERATIONS_AGENT_ID, agent_mark: OPERATIONS_AGENT_MARK, agent_color: OPERATIONS_AGENT_COLOR, run_id: runId, status: "pending", dedupe_key: dedupeKey, created_at: startedAt, continuation_payload: { kind: "shared_action.execute_after_approval", workspaceId, operatorKey: "operations", preparedAction: prepared }, policy_reason: "Jira writes require human approval before execution." }); if (approvalInsert.error) throw new Error(approvalInsert.error.message);
        return { ok: true, status: 200, body: { status: "completed", setupComplete: true, message: "Operations prepared an approval-gated Jira follow-up comment.", sourceMode, cardsChecked: issues.length, signalsFound: 1, approvalsCreated: 1, signals: [{ signalType, severity: explicitBlocked ? "high" : "medium", cardName: candidate.summary, listName: project.name, runId, approvalId, dedupeKey }], setup } };
      } catch { return { ok: false, status: 502, body: { error: "jira_scan_failed", message: "Could not read the selected Jira project.", sourceMode, setup } }; }
    }
    return { ok: true, status: 200, body: { status: "setup_incomplete", setupComplete: false, message: "Connect Trello, Asana, or Jira, then select a project destination to run Operations.", sourceMode, setup } };
  }

  // Real billing enforcement - see the matching check in revenue/scan.ts for
  // the full rationale. Checked after Trello setup (a real setup gap is
  // still the more specific/useful error) and before any Trello API call,
  // and never blocks review/action on approvals already sitting in the
  // queue - it only gates starting new scan work.
  const executionEligibility = await getWorkspaceExecutionEligibility(workspaceId, supabase);
  if (!executionEligibility.eligible) {
    return {
      ok: false,
      status: 402,
      body: {
        status: "plan_required",
        message: executionEligibility.reason,
        sourceMode,
        setup,
        details: { billingStatus: executionEligibility.billingStatus, planTier: executionEligibility.planTier, trialEndsAt: executionEligibility.trialEndsAt },
      },
    };
  }

  try {
    const lists = (await listTrelloLists(workspaceId, boardId)).filter((l) => !l.closed).slice(0, MAX_LISTS);
    const handled = await loadOperationsDedupeState({ supabase, workspaceId });

    const candidates: { decision: OperationsDecision; card?: TrelloCardDetailed; listName: string; dedupeKey: string; isReactivation: boolean; ageAtDetectionDays: number | null }[] = [];
    const centralProjectEvents: SignalEvent[] = [];
    const observed: NonNullable<OperationsScanSummary["observed"]> = [];
    const flaggedCardIds = new Set<string>();
    let cardsChecked = 0;
    let commentFetchCount = 0;
    const skippedCounts: Record<string, number> = {};
    const bump = (reason: string) => { skippedCounts[reason] = (skippedCounts[reason] ?? 0) + 1; };

    for (const list of lists) {
      const kind = listKind(list.name);
      let cards: TrelloCardDetailed[] = [];
      try {
        cards = (await listTrelloCardsDetailed(workspaceId, list.id)).filter((c) => !c.closed).slice(0, MAX_CARDS_PER_LIST);
      } catch (error) {
        if (error instanceof TrelloExecutionError) { bump("trello_list_read_failed"); continue; }
        throw error;
      }

      if (kind !== "done" && cards.length > TOO_MANY_OPEN) {
        const dedupeKey = `operations:trello:list:${list.id}:too_many_open_tasks:${new Date().toISOString().slice(0, 10)}`;
        if (handled.has(dedupeKey)) bump(handled.get(dedupeKey)!);
        else candidates.push({
          decision: decideOperationsListSignal({ signalType: "too_many_open_tasks", listName: list.name, listId: list.id, boardName, boardId, openCount: cards.length }),
          listName: list.name,
          dedupeKey,
          isReactivation: false,
          ageAtDetectionDays: null,
        });
      }

      for (const card of cards) {
        cardsChecked += 1;
        if (centralProjectEvents.length < 100) {
          centralProjectEvents.push(normalizeProjectTaskSignal({
            workspaceId,
            task: {
              connectorKey: "trello",
              id: card.id,
              title: card.name,
              status: kind === "done" || card.closed ? "completed" : "open",
              dueAt: card.due,
              updatedAt: card.dateLastActivity,
              url: card.url,
              isBlocked: /\b(blocked|blocker|stuck|waiting|on hold)\b/i.test(`${card.name} ${card.desc}`),
            },
          }));
        }
        const signalType = detectCardSignal(card, kind);
        if (!signalType) { bump(kind === "done" ? "completed_card" : "no_operational_signals"); continue; }

        // Real scoring inputs, now that idMembers/labels/badges are fetched.
        const dueTime = card.due ? new Date(card.due).getTime() : NaN;
        const daysOverdue = card.due && !card.dueComplete && Number.isFinite(dueTime) && dueTime < Date.now()
          ? (Date.now() - dueTime) / 86400000
          : null;
        const hasOwner = card.idMembers.length > 0;
        const escalationLabels = detectEscalationLabels(card.labels);
        const unresolvedAgeDays = ageDays(card.dateLastActivity);
        let blockerReason = extractBlockerReason([card.desc, card.name]);
        // Comment fetch is signal-gated (only for cards that already
        // triggered a signal where a blocker phrase adds real value) and
        // capped per run - see MAX_COMMENT_FETCHES_PER_RUN.
        if (!blockerReason && BLOCKER_CONTEXT_SIGNALS.has(signalType) && commentFetchCount < MAX_COMMENT_FETCHES_PER_RUN) {
          commentFetchCount += 1;
          try {
            const comments = await listRecentTrelloCardComments(workspaceId, card.id, COMMENT_FETCH_LIMIT);
            blockerReason = extractBlockerReason(comments.map((comment) => comment.text));
          } catch (error) {
            if (error instanceof TrelloExecutionError) bump("trello_comment_read_failed");
            else throw error;
          }
        }

        const decision = decideOperationsCardSignal({
          signalType,
          card,
          listName: list.name,
          boardName,
          boardId,
          lists: lists as TrelloList[],
          daysOverdue,
          hasOwner,
          escalationLabels,
          checklistTotal: card.badges.checklistItems,
          checklistChecked: card.badges.checklistItemsChecked,
          unresolvedAgeDays,
          blockerReason,
        });

        // Card-level reactivation: the dedupe key now includes the computed
        // severity band (and whether the blocker is external), not just the
        // card+signal pair. A card that already had this exact signal at the
        // same severity/blocker band is a hard duplicate. If the band changed
        // (situation worsened, blocker appeared/resolved, owner assigned,
        // etc.) it is treated as a new, reactivated occurrence - mirroring
        // Revenue's thread-reactivation pattern. The only thing that still
        // hard-blocks across bands is an *unresolved* legacy-format approval
        // for the exact same card+signal (pre-dating this change), so the
        // pass never double-fires on top of a still-open approval.
        const legacyDedupeKey = `operations:trello:card:${card.id}:${signalType}`;
        const dedupeKey = `${legacyDedupeKey}:${decision.severity}:${decision.bestNextAction === "wait_external_dependency" ? "ext" : "std"}`;
        const legacyReason = handled.get(legacyDedupeKey);
        const currentReason = handled.get(dedupeKey);
        if (currentReason) { bump(currentReason); continue; }
        if (legacyReason === "existing_pending_approval") { bump(legacyReason); continue; }
        const isReactivation = Boolean(legacyReason);

        flaggedCardIds.add(card.id);

        if (decision.bestNextAction === "observe_low_severity" || decision.bestNextAction === "wait_external_dependency") {
          // A deliberate, logged "no action" outcome - not a silent drop. No
          // Trello write and no Slack ping are prepared; the next scan will
          // re-evaluate this card and only resurface it if the dedupe band
          // above changes.
          const completedAt = new Date().toISOString();
          const noActionInput = {
            source: "trello_scan",
            sourceMode,
            dedupeKey,
            signalType: decision.signalType,
            severity: decision.severity,
            confidence: decision.confidence,
            bestNextAction: decision.bestNextAction,
            bestNextActionReason: decision.bestNextActionReason,
            blockerReason: decision.blockerReason,
            priorityReasons: decision.priorityReasons,
            boardId,
            boardName,
            listName: list.name,
            cardId: card.id,
            cardName: card.name,
            cardUrl: card.url ?? card.shortUrl ?? null,
            isReactivation,
          };
          const noActionRunId = operatorRuntimeId("oprun-operations-scan");
          const runInsert = await supabase.from("os_operator_runs").insert({
            id: noActionRunId,
            workspace_id: workspaceId,
            operator_key: "operations",
            trigger_type: "trello_scan",
            status: "completed",
            input: noActionInput,
            output: { status: "no_action", reason: decision.bestNextActionReason },
            readiness: {},
            risk_level: "low",
            started_at: completedAt,
            completed_at: completedAt,
          });
          if (runInsert.error) throw new Error(runInsert.error.message);
          await logOperatorEvent({
            supabase, workspaceId, runId: noActionRunId,
            eventType: "operations.scan.no_action",
            message: `No action for "${card.name}": ${decision.bestNextActionReason}`,
            metadata: noActionInput,
          });
          const outputInsert = await supabase.from("os_operator_outputs").insert({
            id: operatorRuntimeId("opout"),
            workspace_id: workspaceId,
            run_id: noActionRunId,
            operator_key: "operations",
            output_type: "operations_no_action_summary",
            title: `No action: ${card.name}`,
            payload: noActionInput,
            requires_approval: false,
          });
          if (outputInsert.error) throw new Error(outputInsert.error.message);
          observed.push({
            cardId: card.id,
            cardName: card.name,
            listName: list.name,
            signalType: decision.signalType,
            bestNextAction: decision.bestNextAction,
            reason: decision.bestNextActionReason,
            dedupeKey,
            runId: noActionRunId,
          });
          handled.set(dedupeKey, "already_handled");
          bump(decision.bestNextAction);
          continue;
        }

        candidates.push({ decision, card, listName: list.name, dedupeKey, isReactivation, ageAtDetectionDays: daysOverdue ?? unresolvedAgeDays });
      }
    }

    candidates.sort((a, b) => SEVERITY_RANK[a.decision.severity] - SEVERITY_RANK[b.decision.severity]);
    const selected = candidates.slice(0, MAX_APPROVALS_PER_RUN);
    if (candidates.length > selected.length) skippedCounts["rate_limited_this_run"] = candidates.length - selected.length;

    const created: NonNullable<OperationsScanSummary["signals"]> = [];

    for (const candidate of selected) {
      const { decision, card, listName, dedupeKey, isReactivation } = candidate;
      const runId = operatorRuntimeId("oprun-operations-scan");

      // Prepared actions through the Shared Action Layer. Both stay approval-gated.
      const preparedSlackAction: PreparedAction | null = slackConnected && slackChannelId
        ? prepareAction({
          workspaceId,
          operatorKey: "operations",
          actionType: "send_slack_message",
          connectorKey: "slack",
          capability: "chat.messages.send_after_approval",
          title: "Internal operations update",
          summary: decision.plainEnglishSummary,
          input: { channelId: slackChannelId, channelName: slackChannelName ?? "selected channel", text: decision.preparedSlackMessage },
          dedupeKey: `${dedupeKey}:slack`,
          source: "trello",
          metadata: { operatorKey: "operations", signalType: decision.signalType },
        }, { policySettings })
        : null;

      let preparedTrelloAction: PreparedAction | null = null;
      const plan = decision.preparedTrelloPlan;
      if (plan) {
        const capability = trelloCapabilityFor(plan.actionType);
        const actionInput = plan.actionType === "add_task_comment"
          ? { cardId: plan.cardId, text: plan.text }
          : plan.actionType === "move_task"
            ? { cardId: plan.cardId, listId: plan.listId, listName: plan.listName }
            : { boardId: plan.boardId, boardName, listId: plan.listId, listName: plan.listName, name: plan.name, description: plan.description };
        preparedTrelloAction = prepareAction({
          workspaceId,
          operatorKey: "operations",
          actionType: plan.actionType,
          connectorKey: "trello",
          capability,
          title: decision.approvalTitle,
          summary: decision.plainEnglishSummary,
          input: actionInput,
          dedupeKey: `${dedupeKey}:trello`,
          source: "trello",
          metadata: { operatorKey: "operations", signalType: decision.signalType, cardUrl: card?.url ?? null },
        }, { policySettings });
      }

      if (!preparedSlackAction && !preparedTrelloAction) { bump("not_actionable"); continue; }

      const operationsMeta = {
        operatorKey: "operations",
        dedupeKey,
        signalType: decision.signalType,
        severity: decision.severity,
        confidence: decision.confidence,
        priorityScore: decision.score,
        priorityReasons: decision.priorityReasons,
        bestNextAction: decision.bestNextAction,
        blockerReason: decision.blockerReason,
        isReactivation,
        boardId,
        boardName,
        listName,
        cardName: card?.name ?? null,
        cardId: card?.id ?? null,
        cardUrl: card?.url ?? card?.shortUrl ?? null,
        plainEnglishSummary: decision.plainEnglishSummary,
        recommendedAction: decision.recommendedAction,
        reasoning: decision.reasoning,
        preparedSlackMessage: preparedSlackAction ? decision.preparedSlackMessage : null,
        slackChannelName: slackChannelName,
      };

      const runInsert = await supabase.from("os_operator_runs").insert({
        id: runId,
        workspace_id: workspaceId,
        operator_key: "operations",
        trigger_type: "trello_scan",
        status: "running",
        input: { source: "trello_scan", sourceMode, ...operationsMeta },
        output: {},
        readiness: {},
        risk_level: "medium",
        started_at: new Date().toISOString(),
      });
      if (runInsert.error) throw new Error(runInsert.error.message);

      await logOperatorEvent({
        supabase, workspaceId, runId,
        eventType: "operations_signal_detected",
        message: `Detected ${decision.signalType.replace(/_/g, " ")}: ${decision.plainEnglishSummary}`,
        metadata: operationsMeta,
      });

      const approvalId = operatorRuntimeId("appr-operations");
      const slackGovernance = actionGovernance(preparedSlackAction, policySettings);
      const trelloGovernance = actionGovernance(preparedTrelloAction, policySettings);
      const approvalScopes = { slack: slackGovernance?.scope ?? null, trello: trelloGovernance?.scope ?? null };
      const policyEvidence = { slack: slackGovernance?.evidence ?? null, trello: trelloGovernance?.evidence ?? null };
      const approvalInsert = await supabase.from("os_approvals").insert({
        id: approvalId,
        workspace_id: workspaceId,
        type: "action",
        title: decision.approvalTitle,
        body: decision.plainEnglishSummary,
        agent_id: OPERATIONS_AGENT_ID,
        agent_mark: OPERATIONS_AGENT_MARK,
        agent_color: OPERATIONS_AGENT_COLOR,
        run_id: runId,
        status: "pending",
        dedupe_key: dedupeKey,
        created_at: new Date().toISOString(),
        continuation_payload: {
          kind: "operations.execute_after_approval",
          workspaceId,
          operatorRunId: runId,
          operatorKey: "operations",
          dedupeKey,
          preparedSlackAction,
          preparedTrelloAction,
          approvalScopes,
          policyEvidence,
          operations: operationsMeta,
          policy: {
            slackMessage: preparedSlackAction ? "Approval required" : "Not prepared",
            trelloUpdate: preparedTrelloAction ? "Approval required" : "Not prepared",
            humanReview: "Required",
          },
        },
        approval_scope: slackGovernance?.scope ?? trelloGovernance?.scope ?? null,
        policy_evidence: slackGovernance?.evidence ?? trelloGovernance?.evidence ?? null,
        policy_reason: "Operations actions require human approval before any Slack message or Trello change.",
      });
      if (approvalInsert.error) throw new Error(approvalInsert.error.message);

      const output = {
        type: "operations_signal",
        source: "trello_scan",
        approvalId,
        operations: operationsMeta,
        preparedSlackAction,
        preparedTrelloAction,
      };
      const outputInsert = await supabase.from("os_operator_outputs").insert({
        id: operatorRuntimeId("opout"),
        workspace_id: workspaceId,
        run_id: runId,
        operator_key: "operations",
        output_type: "operations_signal",
        title: `${decision.approvalTitle}: ${card?.name ?? listName}`,
        payload: output,
        requires_approval: true,
        approval_id: approvalId,
      });
      if (outputInsert.error) throw new Error(outputInsert.error.message);

      const runUpdate = await supabase.from("os_operator_runs").update({ status: "waiting_for_approval", output, approval_id: approvalId }).eq("id", runId).eq("workspace_id", workspaceId);
      if (runUpdate.error) throw new Error(runUpdate.error.message);

      await logOperatorEvent({
        supabase, workspaceId, runId,
        eventType: "operations_approval_created",
        message: `Created Operations approval ${approvalId}.`,
        metadata: { approvalId, dedupeKey, signalType: decision.signalType, severity: decision.severity },
      });

      try {
        await sendSlackApprovalNotification({
          supabase, workspaceId, approvalId, runId,
          eventType: "revenue_approval_created",
          operatorKey: "operations",
          title: decision.approvalTitle,
          summary: decision.plainEnglishSummary,
          confidence: decision.confidence,
          risk: decision.severity,
          source: "trello",
          actionLabel: preparedTrelloAction ? preparedTrelloAction.actionType.replace(/_/g, " ") : "internal Slack update",
          approvalUrl: `${getAppUrl()}/approvals`,
          metadata: { dedupeKey, signalType: decision.signalType, contactName: card?.name ?? listName, subject: card?.name ?? listName, preparedActions: [preparedSlackAction ? "send_slack_message" : null, preparedTrelloAction?.actionType ?? null].filter(Boolean) },
        });
      } catch (error) {
        console.warn("[operations-scan] slack approval notification skipped", { workspaceId, approvalId, error: error instanceof Error ? error.message : "Unknown Slack notification error" });
      }

      created.push({ signalType: decision.signalType, severity: decision.severity, cardName: card?.name, listName, runId, approvalId, dedupeKey, isReactivation });
      handled.set(dedupeKey, "existing_pending_approval");
    }

    const completedAt = new Date().toISOString();
    const skipped = Object.entries(skippedCounts).map(([reason, count]) => ({ reason, count }));

    // Staged migration: the legacy scan still owns Trello UX and approval
    // preparation, while its bounded provider observations also feed the
    // central engine. Ingestion failures never block the established scan.
    try {
      await ingestSignalBatch({ workspaceId, events: centralProjectEvents, supabase });
    } catch (error) {
      console.warn("[operations-scan] central Trello signal ingestion skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown signal ingestion error" });
    }

    // Outcome tracking (Phase 15): compare this run's flagged card ids against
    // the previous scan's flagged card ids to derive an honest "recovered"
    // count - a card that had an open signal last scan and shows none this
    // scan. No hours-saved/ROI figure is fabricated anywhere here.
    const previousSummaryRes = await supabase
      .from("os_operator_outputs")
      .select("payload,created_at")
      .eq("workspace_id", workspaceId)
      .eq("operator_key", "operations")
      .eq("output_type", "operations_scan_summary")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const previousFlaggedCardIds: string[] = Array.isArray((previousSummaryRes.data?.payload as Record<string, unknown> | undefined)?.flaggedCardIds)
      ? ((previousSummaryRes.data!.payload as Record<string, unknown>).flaggedCardIds as unknown[]).filter((id): id is string => typeof id === "string")
      : [];
    const currentFlaggedCardIds = Array.from(flaggedCardIds);
    const cardsRecoveredSinceLastScan = previousFlaggedCardIds.filter((id) => !flaggedCardIds.has(id)).length;
    const ageAtDetectionSamplesDays = candidates
      .map((c) => c.ageAtDetectionDays)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    // Optional Microsoft Teams read context. Guarded so a Teams outage,
    // revoked consent, or missing scope can never fail an Operations run that
    // is otherwise healthy on Trello.
    let teamsSignals: TeamsOperatorSignals = EMPTY_TEAMS_OPERATOR_SIGNALS;
    if (teamsConnected) {
      try {
        teamsSignals = await getTeamsOperatorSignals({ workspaceId, operatorKey: "operations", supabase });
      } catch (error) {
        console.warn("[operations-scan] teams context skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown Teams context error" });
      }
    }

    let zendeskSupport = { scanned: 0, risksFound: 0 };
    if (zendeskConnected) {
      try {
        const credential = await getStoredZendeskCredential(workspaceId, supabase);
        const subdomain = typeof credential?.metadata?.subdomain === "string" ? credential.metadata.subdomain : null;
        if (credential && subdomain) {
          const token = await resolveZendeskAccessToken({ workspaceId, credential, supabase });
          const result = await listZendeskTickets(token, subdomain, { cursor: typeof credential.metadata?.syncCursor === "string" ? credential.metadata.syncCursor : null, updatedSince: typeof credential.metadata?.lastScannedAt === "string" ? credential.metadata.lastScannedAt : null, maxResults: 40 });
          const normalizedTickets = result.tickets.map((ticket) => normalizeZendeskTicket(ticket, subdomain));
          zendeskSupport = { scanned: result.tickets.length, risksFound: result.tickets.reduce((count, ticket) => count + (detectZendeskOperationsSignal(normalizeZendeskTicket(ticket, subdomain)) ? 1 : 0), 0) };
          await ingestSignalBatch({ workspaceId, events: normalizedTickets.map((ticket) => normalizeZendeskSignal({ workspaceId, ticket })), supabase });
          await supabase.from("os_connector_credentials").update({ metadata: { ...(credential.metadata ?? {}), lastScannedAt: new Date().toISOString(), syncCursor: result.nextCursor } }).eq("workspace_id", workspaceId).eq("connector_key", "zendesk");
        }
      } catch (error) {
        console.warn("[operations-scan] Zendesk support context skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown Zendesk context error" });
      }
    }
    let intercomSupport = { scanned: 0, risksFound: 0 };
    if (intercomConnected) {
      try {
        const credential = await getStoredIntercomCredential(workspaceId, supabase);
        if (credential) {
          const token = await resolveIntercomAccessToken({ workspaceId, credential, supabase });
          const region = typeof credential.metadata?.region === "string" ? credential.metadata.region as "us" | "eu" | "au" : "us";
          const result = await listIntercomConversations(token, region, { cursor: typeof credential.metadata?.syncCursor === "string" ? credential.metadata.syncCursor : null, updatedSince: typeof credential.metadata?.lastScannedAt === "string" ? credential.metadata.lastScannedAt : null, maxResults: 40 });
          intercomSupport = { scanned: result.conversations.length, risksFound: result.conversations.reduce((count, conversation) => count + (detectIntercomOperationsSignal(normalizeIntercomConversation(conversation, region)) ? 1 : 0), 0) };
          await supabase.from("os_connector_credentials").update({ metadata: { ...(credential.metadata ?? {}), lastScannedAt: new Date().toISOString(), syncCursor: result.nextCursor } }).eq("workspace_id", workspaceId).eq("connector_key", "intercom");
        }
      } catch (error) {
        console.warn("[operations-scan] Intercom support context skipped", { workspaceId, error: error instanceof Error ? error.message : "Unknown Intercom context error" });
      }
    }

    const scanSummary = {
      type: "operations_scan_summary",
      status: "completed",
      sourceMode,
      teams: teamsSignals,
      zendesk: zendeskSupport,
      intercom: intercomSupport,
      googleDrive: googleDriveContext,
      monitoringEnabled: true,
      cadence: "daily",
      setupComplete: true,
      cardsChecked,
      signalsFound: candidates.length,
      approvalsCreated: created.length,
      observedCount: observed.filter((o) => o.bestNextAction === "observe_low_severity").length,
      waitingExternalCount: observed.filter((o) => o.bestNextAction === "wait_external_dependency").length,
      reactivatedCount: candidates.filter((c) => c.isReactivation).length,
      staleOverdueCount: candidates.filter((c) => ["overdue_card", "stuck_card", "no_recent_activity"].includes(c.decision.signalType)).length,
      flaggedCardIds: currentFlaggedCardIds,
      cardsRecoveredSinceLastScan,
      ageAtDetectionSamplesDays,
      skipped,
      completedAt,
    };

    const scanRunId = operatorRuntimeId("oprun-operations-scan-summary");
    const scanRunInsert = await supabase.from("os_operator_runs").insert({
      id: scanRunId,
      workspace_id: workspaceId,
      operator_key: "operations",
      trigger_type: "trello_scan",
      status: "completed",
      input: { source: "trello_scan_monitor", sourceMode },
      output: scanSummary,
      readiness: {},
      risk_level: "low",
      started_at: completedAt,
      completed_at: completedAt,
    });
    if (scanRunInsert.error) throw new Error(scanRunInsert.error.message);

    await logOperatorEvent({
      supabase, workspaceId, runId: scanRunId,
      eventType: "operations_scan_completed",
      message: `Operations scan completed: ${cardsChecked} cards checked, ${candidates.length} signals, ${created.length} approvals.`,
      metadata: scanSummary,
    });

    await supabase.from("os_operator_outputs").insert({
      id: operatorRuntimeId("opout"),
      workspace_id: workspaceId,
      run_id: scanRunId,
      operator_key: "operations",
      output_type: "operations_scan_summary",
      title: "Operations scan summary",
      payload: scanSummary,
      requires_approval: false,
    });

    const monitoringUpdate = await upsertOperationsMonitoringConfig({ supabase, workspaceId, sourceMode, lastRunAt: completedAt, lastRunStatus: "completed", lastRunSummary: scanSummary });
    if (monitoringUpdate.error) console.warn("[operations-scan] monitoring config update skipped", { workspaceId, error: monitoringUpdate.error.message });

    return {
      ok: true,
      status: 200,
      body: {
        status: "completed",
        setupComplete: true,
        sourceMode,
        cardsChecked,
        signalsFound: candidates.length,
        approvalsCreated: created.length,
        signals: created,
        observed,
        outcomeMetrics: {
          flaggedCardCount: currentFlaggedCardIds.length,
          cardsRecoveredSinceLastScan,
          observedCount: scanSummary.observedCount,
          waitingExternalCount: scanSummary.waitingExternalCount,
        },
        skipped,
        setup,
      },
    };
  } catch (error) {
    return scanFailure(error);
  }
}
