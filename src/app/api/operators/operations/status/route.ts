import { NextRequest, NextResponse } from "next/server";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type OperationsScanSummaryOutput = {
  type?: string;
  status?: string;
  sourceMode?: string;
  cadence?: string;
  cardsChecked?: number;
  signalsFound?: number;
  approvalsCreated?: number;
  staleOverdueCount?: number;
  completedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function asScanSummary(value: unknown): OperationsScanSummaryOutput | null {
  const record = asRecord(value);
  if (record.type !== "operations_scan_summary") return null;
  return {
    type: typeof record.type === "string" ? record.type : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    sourceMode: typeof record.sourceMode === "string" ? record.sourceMode : undefined,
    cadence: typeof record.cadence === "string" ? record.cadence : undefined,
    cardsChecked: typeof record.cardsChecked === "number" ? record.cardsChecked : undefined,
    signalsFound: typeof record.signalsFound === "number" ? record.signalsFound : undefined,
    approvalsCreated: typeof record.approvalsCreated === "number" ? record.approvalsCreated : undefined,
    staleOverdueCount: typeof record.staleOverdueCount === "number" ? record.staleOverdueCount : undefined,
    completedAt: typeof record.completedAt === "string" ? record.completedAt : undefined,
  };
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function nextRunFromCadence(lastRunAt: string | null, cadence: string): string | null {
  if (!lastRunAt) return null;
  const date = new Date(lastRunAt);
  if (Number.isNaN(date.getTime())) return null;
  if (cadence === "daily") return new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return null;
}

function mapPendingApproval(row: Record<string, unknown>) {
  const continuation = asRecord(row.continuation_payload);
  const operations = asRecord(continuation.operations);
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "Approval required",
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    run_id: typeof row.run_id === "string" ? row.run_id : null,
    signalType: typeof operations.signalType === "string" ? operations.signalType : null,
    severity: typeof operations.severity === "string" ? operations.severity : null,
    cardName: typeof operations.cardName === "string" ? operations.cardName : null,
    listName: typeof operations.listName === "string" ? operations.listName : null,
  };
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const [connectorTruth, policy, runs, pendingApprovals, triggerConfig] = await Promise.all([
    getConnectorTruth({ workspaceId: context.workspaceId, supabase }),
    loadWorkspacePolicySettings({ supabase, workspaceId: context.workspaceId }),
    supabase
      .from("os_operator_runs")
      .select("id,status,output,created_at,completed_at")
      .eq("workspace_id", context.workspaceId)
      .eq("operator_key", "operations")
      .eq("trigger_type", "trello_scan")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("os_approvals")
      .select("id,title,run_id,created_at,continuation_payload")
      .eq("workspace_id", context.workspaceId)
      .eq("agent_id", "operations")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("os_operator_triggers")
      .select("id,trigger_type,enabled,config,updated_at")
      .eq("workspace_id", context.workspaceId)
      .eq("operator_key", "operations")
      .eq("trigger_type", "scheduled_monitoring")
      .maybeSingle(),
  ]);

  if (runs.error) return NextResponse.json({ error: runs.error.message }, { status: 500 });
  if (pendingApprovals.error) return NextResponse.json({ error: pendingApprovals.error.message }, { status: 500 });
  if (triggerConfig.error) return NextResponse.json({ error: triggerConfig.error.message }, { status: 500 });

  const slack = connectorTruth.find((c) => c.connectorKey === "slack") ?? null;
  const trello = connectorTruth.find((c) => c.connectorKey === "trello") ?? null;
  const slackConnected = Boolean(slack && slack.status === "connected" && slack.providerConfigKey && slack.nangoConnectionId);
  const trelloConnected = Boolean(trello && trello.status === "connected" && trello.providerConfigKey && trello.nangoConnectionId);
  const trelloDestinationSet = Boolean(policy.trello.defaultBoardId && policy.trello.defaultListId);
  const slackChannelSelected = Boolean(policy.slack.slackDefaultChannelId);
  const slackAlertsReady = slackConnected && slackChannelSelected;

  const approvalFlowActive = true;
  const coreReady = trelloConnected && trelloDestinationSet && approvalFlowActive;
  const requiredChecks = [trelloConnected, trelloDestinationSet, approvalFlowActive];
  const readinessPercent = Math.round((requiredChecks.filter(Boolean).length / requiredChecks.length) * 100);
  const setupState = !trelloConnected ? "needs_setup" : coreReady ? "ready" : "setup_incomplete";

  const latestScanRow = (runs.data ?? []).find((run) => asScanSummary(run.output));
  const latestScan = latestScanRow ? asScanSummary(latestScanRow.output) : null;
  const hasScan = Boolean(latestScanRow && latestScan);
  const trigger = triggerConfig.data ? asRecord(triggerConfig.data) : {};
  const triggerSettings = asRecord(trigger.config);
  const monitoringEnabled = boolValue(trigger.enabled) ?? boolValue(triggerSettings.monitoringEnabled) ?? true;
  const cadence = stringValue(triggerSettings.cadence) ?? latestScan?.cadence ?? "daily";
  const lastRunAt = stringValue(triggerSettings.lastRunAt)
    ?? latestScan?.completedAt
    ?? (typeof latestScanRow?.completed_at === "string" ? latestScanRow.completed_at : null)
    ?? (typeof latestScanRow?.created_at === "string" ? latestScanRow.created_at : null);
  const nextRunAt = stringValue(triggerSettings.nextRunAt) ?? nextRunFromCadence(lastRunAt, cadence);
  const lastRunSummary = asRecord(triggerSettings.lastRunSummary);
  const monitoringStatus = !coreReady ? "setup_incomplete" : monitoringEnabled ? "monitoring_active" : "idle";

  return NextResponse.json({
    trello: trello ? { status: trello.status, connected: trelloConnected, defaultBoardName: policy.trello.defaultBoardName, defaultListName: policy.trello.defaultListName } : { status: "not_connected", connected: false, defaultBoardName: policy.trello.defaultBoardName, defaultListName: policy.trello.defaultListName },
    slack: slack ? { status: slack.status, connected: slackConnected, channelSelected: slackChannelSelected, defaultChannelName: policy.slack.slackDefaultChannelName } : { status: "not_connected", connected: false, channelSelected: slackChannelSelected, defaultChannelName: policy.slack.slackDefaultChannelName },
    setup: {
      state: setupState,
      readinessPercent,
      coreReady,
      trelloConnected,
      trelloDestinationSet,
      slackConnected,
      slackChannelSelected,
      slackAlertsReady,
      slackRecommendedMissing: !slackAlertsReady,
      approvalFlowActive,
      canRunManual: coreReady,
    },
    monitoring: {
      status: monitoringStatus,
      message: hasScan ? "Monitoring is active. Latest check loaded from operator run history." : "Monitoring is active. No check has run yet.",
      monitoringEnabled,
      cadence,
      sourceMode: stringValue(triggerSettings.sourceMode) ?? latestScan?.sourceMode ?? "scheduled",
      lastRunAt,
      nextRunAt,
      lastRunStatus: stringValue(triggerSettings.lastRunStatus) ?? latestScanRow?.status ?? latestScan?.status ?? null,
      lastRunSummary: Object.keys(lastRunSummary).length > 0 ? lastRunSummary : latestScan,
      lastScanTime: lastRunAt,
      cardsChecked: latestScan?.cardsChecked ?? (typeof lastRunSummary.cardsChecked === "number" ? lastRunSummary.cardsChecked : 0),
      signalsFound: latestScan?.signalsFound ?? (typeof lastRunSummary.signalsFound === "number" ? lastRunSummary.signalsFound : 0),
      approvalsCreated: latestScan?.approvalsCreated ?? (typeof lastRunSummary.approvalsCreated === "number" ? lastRunSummary.approvalsCreated : 0),
      staleOverdueCount: latestScan?.staleOverdueCount ?? (typeof lastRunSummary.staleOverdueCount === "number" ? lastRunSummary.staleOverdueCount : 0),
      nextScanLabel: nextRunAt ? `Next daily check ${new Date(nextRunAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Daily scan ready",
      recentPendingApprovals: (pendingApprovals.data ?? []).map((row) => mapPendingApproval(row as Record<string, unknown>)),
    },
  });
}
