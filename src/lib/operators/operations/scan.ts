import { getConnectorTruth } from "@/lib/connectors/truth";
import {
  listTrelloLists,
  listTrelloCardsDetailed,
  TrelloExecutionError,
  type TrelloCardDetailed,
  type TrelloList,
} from "@/lib/operators/executors/trello";
import { prepareAction } from "@/lib/actions/execute";
import type { PreparedAction } from "@/lib/actions/types";
import type { Capability } from "@/lib/connectors/capabilities";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";
import { sendSlackApprovalNotification } from "@/lib/notifications/slack";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { getAppUrl } from "@/lib/urls";
import {
  decideOperationsCardSignal,
  decideOperationsListSignal,
  type OperationsDecision,
  type OperationsSignalType,
} from "@/lib/operators/operations/ai-drafting";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
type OperationsScanSourceMode = "scheduled" | "manual" | "event_ready";

const OPERATIONS_AGENT_ID = "operations";
const OPERATIONS_AGENT_MARK = "OP";
const OPERATIONS_AGENT_COLOR = "#66D0E0";

const MAX_LISTS = 12;
const MAX_CARDS_PER_LIST = 40;
const MAX_APPROVALS_PER_RUN = 6;
const STUCK_DAYS = 14;
const NO_ACTIVITY_DAYS = 30;
const DUE_SOON_HOURS = 48;
const TOO_MANY_OPEN = 12;
const MIN_DESC_LENGTH = 15;
const BLOCKER_WORDS = ["blocked", "blocker", "waiting", "stuck", "issue", "problem", "on hold", "can't proceed", "cannot proceed"];

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
  }[];
  skipped?: { reason: string; count: number }[];
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

function detectCardSignal(card: TrelloCardDetailed, kind: ReturnType<typeof listKind>): OperationsSignalType | null {
  if (kind === "done") return null;
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
  if (activity !== null && activity > NO_ACTIVITY_DAYS) return "no_recent_activity";
  if (activity !== null && activity > STUCK_DAYS) return "stuck_card";
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
  const isConnected = (key: string) => truth.some((c) => c.connectorKey === key && c.status === "connected" && c.providerConfigKey && c.nangoConnectionId);
  const trelloConnected = isConnected("trello");
  const slackConnected = isConnected("slack");
  const boardId = policy.trello.defaultBoardId;
  const boardName = policy.trello.defaultBoardName ?? "Default board";
  const slackChannelId = policy.slack.slackDefaultChannelId;
  const slackChannelName = policy.slack.slackDefaultChannelName;

  const setup = {
    trelloConnected,
    trelloDestinationSet: Boolean(policy.trello.defaultBoardId && policy.trello.defaultListId),
    slackConnected,
    slackChannelSelected: Boolean(slackChannelId),
    boardName,
  };

  if (!trelloConnected || !boardId) {
    return { ok: true, status: 200, body: { status: "setup_incomplete", setupComplete: false, message: "Connect Trello and select a default board to run Operations.", sourceMode, setup } };
  }

  try {
    const lists = (await listTrelloLists(workspaceId, boardId)).filter((l) => !l.closed).slice(0, MAX_LISTS);
    const handled = await loadOperationsDedupeState({ supabase, workspaceId });

    const candidates: { decision: OperationsDecision; card?: TrelloCardDetailed; listName: string; dedupeKey: string }[] = [];
    let cardsChecked = 0;
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
        });
      }

      for (const card of cards) {
        cardsChecked += 1;
        const signalType = detectCardSignal(card, kind);
        if (!signalType) { bump(kind === "done" ? "completed_card" : "no_operational_signals"); continue; }
        const dedupeKey = `operations:trello:card:${card.id}:${signalType}`;
        if (handled.has(dedupeKey)) { bump(handled.get(dedupeKey)!); continue; }
        candidates.push({
          decision: decideOperationsCardSignal({ signalType, card, listName: list.name, boardName, boardId, lists: lists as TrelloList[] }),
          card,
          listName: list.name,
          dedupeKey,
        });
      }
    }

    candidates.sort((a, b) => SEVERITY_RANK[a.decision.severity] - SEVERITY_RANK[b.decision.severity]);
    const selected = candidates.slice(0, MAX_APPROVALS_PER_RUN);
    if (candidates.length > selected.length) skippedCounts["rate_limited_this_run"] = candidates.length - selected.length;

    const created: NonNullable<OperationsScanSummary["signals"]> = [];

    for (const candidate of selected) {
      const { decision, card, listName, dedupeKey } = candidate;
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
          operations: operationsMeta,
          policy: {
            slackMessage: preparedSlackAction ? "Approval required" : "Not prepared",
            trelloUpdate: preparedTrelloAction ? "Approval required" : "Not prepared",
            humanReview: "Required",
          },
        },
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

      created.push({ signalType: decision.signalType, severity: decision.severity, cardName: card?.name, listName, runId, approvalId, dedupeKey });
      handled.set(dedupeKey, "existing_pending_approval");
    }

    const completedAt = new Date().toISOString();
    const skipped = Object.entries(skippedCounts).map(([reason, count]) => ({ reason, count }));
    const scanSummary = {
      type: "operations_scan_summary",
      status: "completed",
      sourceMode,
      monitoringEnabled: true,
      cadence: "daily",
      setupComplete: true,
      cardsChecked,
      signalsFound: candidates.length,
      approvalsCreated: created.length,
      staleOverdueCount: candidates.filter((c) => ["overdue_card", "stuck_card", "no_recent_activity"].includes(c.decision.signalType)).length,
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
        skipped,
        setup,
      },
    };
  } catch (error) {
    return scanFailure(error);
  }
}
