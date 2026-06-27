import { schedules, task } from "@trigger.dev/sdk/v3";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { recordSystemTaskRun, type SystemTaskSourceMode, type SystemTaskType } from "@/lib/operators/runtime/system-task";

type OperationsOperatorScanPayload = {
  workspaceId?: string;
};

const DEFAULT_OPERATIONS_WORKSPACE_ID = "ws-atlas";

// Runtime placeholder, NOT a fake operator. This only inspects connector
// readiness so Trigger.dev shows the future Operations direction. It creates no
// approvals, moves no cards, and sends no messages.
async function runOperationsReadiness(input: { workspaceId: string; taskId: string; taskType: SystemTaskType; sourceMode: SystemTaskSourceMode }) {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) {
    return { status: "invalid_payload", message: "workspaceId is required." };
  }

  const [truth, policy] = await Promise.all([
    getConnectorTruth({ workspaceId }),
    loadWorkspacePolicySettings({ workspaceId }),
  ]);

  const isConnected = (key: string) => truth.some((connector) =>
    connector.connectorKey === key && connector.status === "connected" && connector.providerConfigKey && connector.nangoConnectionId);

  const slackConnected = isConnected("slack");
  const trelloConnected = isConnected("trello");
  const trelloDestinationConfigured = Boolean(policy.trello.defaultBoardId && policy.trello.defaultListId);

  const ready = slackConnected && trelloConnected && trelloDestinationConfigured;
  const status = ready ? "ready_for_v1" : "setup_incomplete";

  const missing: string[] = [];
  if (!slackConnected) missing.push("Connect Slack.");
  if (!trelloConnected) missing.push("Connect Trello.");
  else if (!trelloDestinationConfigured) missing.push("Select a default Trello board and list.");

  const summary = {
    status,
    slackConnected,
    trelloConnected,
    trelloDestinationConfigured,
    recommendedSetup: missing,
    note: "Operations Operator v1 is not built yet. This is a readiness placeholder only.",
  };

  await recordSystemTaskRun({
    workspaceId,
    operatorKey: "operations",
    taskId: input.taskId,
    taskType: input.taskType,
    sourceMode: input.sourceMode,
    status,
    eventType: "operations_readiness_checked",
    message: ready
      ? "Operations readiness: ready for v1 (Slack and Trello configured)."
      : `Operations readiness: setup incomplete. ${missing.join(" ")}`.trim(),
    summary,
  });

  return { workspaceId, ...summary };
}

export const operationsOperatorScan = task({
  id: "operations-operator-scan",
  run: async (payload: OperationsOperatorScanPayload) => {
    return runOperationsReadiness({
      workspaceId: payload.workspaceId?.trim() || DEFAULT_OPERATIONS_WORKSPACE_ID,
      taskId: "operations-operator-scan",
      taskType: "manual",
      sourceMode: "manual",
    });
  },
});

export const operationsOperatorDailyScan = schedules.task({
  id: "operations-operator-daily-scan",
  cron: {
    pattern: "0 8 * * *",
    timezone: "UTC",
  },
  run: async () => {
    // TODO: multi-workspace fanout. List active workspaces, run per workspace,
    // respect plan cadence/entitlements and operator enabled/disabled state.
    return runOperationsReadiness({
      workspaceId: DEFAULT_OPERATIONS_WORKSPACE_ID,
      taskId: "operations-operator-daily-scan",
      taskType: "scheduled",
      sourceMode: "scheduled",
    });
  },
});
