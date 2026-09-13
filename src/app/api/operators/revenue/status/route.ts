import { NextRequest, NextResponse } from "next/server";
import { GMAIL_READONLY_SCOPE } from "@/lib/connectors/gmail";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { getHubSpotDealPipelineMapping, getHubSpotPropertyReadiness } from "@/lib/operators/executors/hubspot";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { getOperatorActivationState } from "@/lib/operators/activation";
import { getOperatorConnectorReadiness, getOptionalUpsellConnectors } from "@/lib/operators/connector-requirements";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type ScanSummaryOutput = {
  type?: string;
  status?: string;
  sourceMode?: "scheduled" | "manual" | "event_ready" | string;
  cadence?: string;
  scanned?: number;
  opportunitiesFound?: number;
  approvalsCreated?: number;
  skippedCount?: number;
  routedItemCount?: number;
  completedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function asScanSummary(value: unknown): ScanSummaryOutput | null {
  const record = asRecord(value);
  // Revenue scans against whichever email connector is active (Gmail or
  // Microsoft 365 - see resolveRevenueEmailConnector() in scan.ts), so the
  // summary type is "gmail_scan_summary" or "microsoft_scan_summary".
  if (record.type !== "gmail_scan_summary" && record.type !== "microsoft_scan_summary") return null;
  return {
    type: typeof record.type === "string" ? record.type : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    sourceMode: typeof record.sourceMode === "string" ? record.sourceMode : undefined,
    cadence: typeof record.cadence === "string" ? record.cadence : undefined,
    scanned: typeof record.scanned === "number" ? record.scanned : undefined,
    opportunitiesFound: typeof record.opportunitiesFound === "number" ? record.opportunitiesFound : undefined,
    approvalsCreated: typeof record.approvalsCreated === "number" ? record.approvalsCreated : undefined,
    skippedCount: typeof record.skippedCount === "number" ? record.skippedCount : undefined,
    routedItemCount: typeof record.routedItemCount === "number" ? record.routedItemCount : undefined,
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
  if (cadence === "hourly") {
    const next = new Date();
    next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
    return next.toISOString();
  }
  if (!lastRunAt) return null;
  const date = new Date(lastRunAt);
  if (Number.isNaN(date.getTime())) return null;
  if (cadence === "daily") return new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return null;
}

function latestTimestamp(...values: Array<string | null>): string | null {
  return values.filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapPendingApproval(row: Record<string, unknown>) {
  const continuation = asRecord(row.continuation_payload);
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "Approval required",
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    run_id: typeof row.run_id === "string" ? row.run_id : null,
    to: typeof continuation.to === "string" ? continuation.to : null,
    subject: typeof continuation.subject === "string" ? continuation.subject : null,
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

  const [readiness, connectorTruth, runs, pendingApprovals, triggerConfig, manualConfig, activation] = await Promise.all([
    getOperatorReadiness({ workspaceId: context.workspaceId, operatorKey: "revenue" }),
    getConnectorTruth({ workspaceId: context.workspaceId, supabase }),
    supabase
      .from("os_operator_runs")
      .select("id,status,output,created_at,completed_at")
      .eq("workspace_id", context.workspaceId)
      .eq("operator_key", "revenue")
      .in("trigger_type", ["gmail_scan", "microsoft_scan"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("os_approvals")
      .select("id,title,run_id,created_at,continuation_payload")
      .eq("workspace_id", context.workspaceId)
      .eq("agent_id", "revenue")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("os_operator_triggers")
      .select("id,trigger_type,enabled,config,updated_at")
      .eq("workspace_id", context.workspaceId)
      .eq("operator_key", "revenue")
      .eq("trigger_type", "scheduled_monitoring")
      .maybeSingle(),
    supabase
      .from("os_operator_triggers")
      .select("id,trigger_type,enabled,config,updated_at")
      .eq("workspace_id", context.workspaceId)
      .eq("operator_key", "revenue")
      .eq("trigger_type", "manual_monitoring")
      .maybeSingle(),
    getOperatorActivationState({ workspaceId: context.workspaceId, operatorKey: "revenue", supabase }),
  ]);

  if (runs.error) {
    return NextResponse.json({ error: runs.error.message }, { status: 500 });
  }
  if (pendingApprovals.error) {
    return NextResponse.json({ error: pendingApprovals.error.message }, { status: 500 });
  }
  if (triggerConfig.error) {
    return NextResponse.json({ error: triggerConfig.error.message }, { status: 500 });
  }
  if (manualConfig.error) {
    return NextResponse.json({ error: manualConfig.error.message }, { status: 500 });
  }

  const gmail = connectorTruth.find((connector) => connector.connectorKey === "gmail") ?? null;
  const microsoft = connectorTruth.find((connector) => connector.connectorKey === "microsoft") ?? null;
  const hubspot = connectorTruth.find((connector) => connector.connectorKey === "hubspot") ?? null;
  // Microsoft 365 and HubSpot are direct-OAuth connectors. Their executable
  // truth is derived from the encrypted credential and live provider check.
  const microsoftConnected = Boolean(microsoft?.executable);
  const hubspotConnected = Boolean(hubspot?.executable);
  const gmailScopes = gmail?.scopes ?? [];
  const reconnectRequired = Boolean(gmail && !gmailScopes.includes(GMAIL_READONLY_SCOPE));
  const latestScanRow = (runs.data ?? []).find((run) => asScanSummary(run.output));
  const latestScan = latestScanRow ? asScanSummary(latestScanRow.output) : null;
  const hasScan = Boolean(latestScanRow && latestScan);
  const trigger = triggerConfig.data ? asRecord(triggerConfig.data) : {};
  const triggerSettings = asRecord(trigger.config);
  const manualTrigger = manualConfig.data ? asRecord(manualConfig.data) : {};
  const manualSettings = asRecord(manualTrigger.config);
  const monitoringEnabled = activation?.activated === true;
  const cadence = stringValue(triggerSettings.cadence) ?? latestScan?.cadence ?? "hourly";
  const latestRunFallback = latestScan?.completedAt
    ?? (typeof latestScanRow?.completed_at === "string" ? latestScanRow.completed_at : null)
    ?? (typeof latestScanRow?.created_at === "string" ? latestScanRow.created_at : null);
  const latestScheduledScanRow = (runs.data ?? []).find((run) => asScanSummary(run.output)?.sourceMode === "scheduled");
  const latestManualScanRow = (runs.data ?? []).find((run) => asScanSummary(run.output)?.sourceMode === "manual");
  const latestScheduledFallback = latestScheduledScanRow
    ? (typeof latestScheduledScanRow.completed_at === "string" ? latestScheduledScanRow.completed_at : null)
      ?? (typeof latestScheduledScanRow.created_at === "string" ? latestScheduledScanRow.created_at : null)
    : null;
  const latestManualFallback = latestManualScanRow
    ? (typeof latestManualScanRow.completed_at === "string" ? latestManualScanRow.completed_at : null)
      ?? (typeof latestManualScanRow.created_at === "string" ? latestManualScanRow.created_at : null)
    : null;
  const lastScheduledCheckAt = stringValue(triggerSettings.lastScheduledCheckAt) ?? latestScheduledFallback;
  const lastManualCheckAt = stringValue(manualSettings.lastManualCheckAt) ?? latestManualFallback;
  const lastRunAt = latestTimestamp(lastScheduledCheckAt, lastManualCheckAt, stringValue(triggerSettings.lastRunAt), latestRunFallback);
  const lastRunSourceMode = lastManualCheckAt && (!lastScheduledCheckAt || Date.parse(lastManualCheckAt) > Date.parse(lastScheduledCheckAt)) ? "manual" : "scheduled";
  const nextRunAt = monitoringEnabled ? nextRunFromCadence(lastScheduledCheckAt, cadence) : null;
  const scheduledStartedAt = stringValue(triggerSettings.lastScheduledStartedAt);
  const manualStartedAt = stringValue(manualSettings.lastManualStartedAt);
  const lastScheduledCompletedAt = lastScheduledCheckAt;
  const lastManualCompletedAt = lastManualCheckAt;
  const scheduledIsRunning = Boolean(scheduledStartedAt && Date.parse(scheduledStartedAt) > Date.parse(lastScheduledCompletedAt ?? "") && Date.now() - Date.parse(scheduledStartedAt) < 60 * 60 * 1000);
  const manualIsRunning = Boolean(manualStartedAt && Date.parse(manualStartedAt) > Date.parse(lastManualCompletedAt ?? "") && Date.now() - Date.parse(manualStartedAt) < 30 * 60 * 1000);
  const scheduledSummary = asRecord(triggerSettings.lastSuccessfulSummary);
  const manualSummary = asRecord(manualSettings.lastSuccessfulSummary);
  const scheduledSuccessAt = stringValue(triggerSettings.lastSuccessfulCheckAt);
  const manualSuccessAt = stringValue(manualSettings.lastSuccessfulCheckAt);
  const lastSuccessfulCheckAt = latestTimestamp(scheduledSuccessAt, manualSuccessAt)
    ?? latestRunFallback;
  const lastRunSummary = manualSuccessAt && (!scheduledSuccessAt || Date.parse(manualSuccessAt) > Date.parse(scheduledSuccessAt))
    ? manualSummary
    : scheduledSummary;
  const lastSuccessfulSummary = asScanSummary(lastRunSummary) ?? latestScan;
  const lastFailedCheckAt = latestTimestamp(
    stringValue(triggerSettings.lastFailedCheckAt),
    stringValue(manualSettings.lastFailedCheckAt),
  );
  const lastFailureCode = lastRunSourceMode === "manual"
    ? stringValue(manualSettings.lastManualErrorCode) ?? stringValue(triggerSettings.lastScheduledErrorCode)
    : stringValue(triggerSettings.lastScheduledErrorCode) ?? stringValue(manualSettings.lastManualErrorCode);
  const lastRunStatus = lastRunSourceMode === "manual"
    ? stringValue(manualSettings.lastManualStatus) ?? latestScanRow?.status ?? latestScan?.status ?? null
    : stringValue(triggerSettings.lastRunStatus) ?? latestScanRow?.status ?? latestScan?.status ?? null;
  const scheduledFailures = numberValue(triggerSettings.consecutiveScheduledFailures) ?? 0;
  const monitoringStatus = !monitoringEnabled
    ? "paused"
    : reconnectRequired
    ? "reconnect_required"
    : scheduledFailures > 0
      ? "monitoring_issue"
      : "monitoring_active";
  const [hubspotPropertyReadiness, hubspotPipelineMapping] = hubspotConnected
    ? await Promise.all([
      getHubSpotPropertyReadiness(context.workspaceId),
      getHubSpotDealPipelineMapping(context.workspaceId),
    ])
    : [null, null] as const;

  // Capability-based readiness. Connector keys are only counted as connected
  // when they can actually execute (Gmail with send scope, HubSpot with a
  // healthy direct credential), so this never reports readiness the workspace lacks.
  const connectedConnectorKeys: string[] = [];
  if (gmail?.executable) connectedConnectorKeys.push("gmail");
  if (microsoftConnected) connectedConnectorKeys.push("microsoft");
  if (hubspotConnected) connectedConnectorKeys.push("hubspot");
  const revenueCapabilityReadiness = getOperatorConnectorReadiness("revenue", connectedConnectorKeys);
  const connectedCapabilities = revenueCapabilityReadiness?.connectedCapabilities ?? [];
  const emailExecutionReady = connectedCapabilities.includes("email.read") && connectedCapabilities.includes("email.send_after_approval");
  const crmExecutionReady = connectedCapabilities.includes("crm.contacts.write") && connectedCapabilities.includes("crm.deals.write");

  return NextResponse.json({
    readiness,
    gmail: gmail ? {
      status: gmail.status,
      accountEmail: gmail.accountEmail,
      scopes: gmailScopes,
      missingScopes: gmail.missingScopes ?? [],
      executable: Boolean(gmail.executable),
      reconnectRequired,
      permissions: {
        compose: gmailScopes.includes("https://www.googleapis.com/auth/gmail.compose"),
        send: gmailScopes.includes("https://www.googleapis.com/auth/gmail.send"),
        readonly: gmailScopes.includes(GMAIL_READONLY_SCOPE),
      },
    } : null,
    microsoft: microsoft ? {
      status: microsoft.status,
      accountEmail: microsoft.accountEmail,
      connected: microsoftConnected,
      scopes: microsoft.scopes,
      missingScopes: microsoft.missingScopes ?? [],
    } : null,
    hubspot: hubspot ? {
      status: hubspot.status,
      accountEmail: hubspot.accountEmail,
      connected: hubspotConnected,
      source: hubspot.source ?? null,
      missingScopes: hubspot.missingScopes ?? [],
    } : null,
    capabilityReadiness: {
      connectedConnectors: connectedConnectorKeys,
      connectedCapabilities,
      emailExecutionReady,
      crmExecutionReady,
      missingRequiredCapabilities: revenueCapabilityReadiness?.missingRequired ?? [],
      optionalUpsellConnectors: getOptionalUpsellConnectors("revenue", connectedConnectorKeys).map((def) => ({
        connectorKey: def.connectorKey,
        displayName: def.displayName,
        status: def.status,
      })),
    },
    revenueMode: hubspotConnected ? "full_crm_mode" : "email_only_mode",
    revenueModeMessage: hubspotConnected
      ? `${emailExecutionReady ? (gmail?.executable ? "Gmail" : "Microsoft 365") : "An email connector"} and HubSpot are connected. CRM contact and deal updates execute after approval.`
      : `${gmail?.executable ? "Gmail" : microsoftConnected ? "Microsoft 365" : "An email connector"} is connected. HubSpot is missing, so Revenue Operator prepares email follow-ups only.`,
    v1Readiness: {
      status: (gmail?.executable || microsoftConnected) && hubspotConnected ? "Revenue Operator v1 ready" : "Setup required",
      checks: {
        gmailSendAfterApproval: gmail?.executable ? "ready" : "missing",
        microsoftSendAfterApproval: microsoftConnected ? "ready" : "missing",
        hubspotContactDealExecution: hubspotConnected ? "ready" : "missing",
        contactDealAssociation: hubspotConnected ? "ready" : "missing",
        hubspotAttributionProperties: hubspotPropertyReadiness?.status ?? "not_checked",
        pipelineMapping: hubspotPipelineMapping?.status ?? "not_checked",
      },
      optionalCrmEnrichmentMissing: hubspotPropertyReadiness
        ? ["custom_properties_missing", "custom_properties_partial", "property_check_failed"].includes(hubspotPropertyReadiness.status)
        : false,
      hubspotSetupRecommendation: hubspotPropertyReadiness && hubspotPropertyReadiness.status !== "custom_properties_ready" ? {
        missingContactProperties: hubspotPropertyReadiness.missingContactProperties,
        missingDealProperties: hubspotPropertyReadiness.missingDealProperties,
        suggestedAction: "Create Auterim attribution properties in HubSpot to preserve full source context.",
        severity: "non_blocking",
      } : null,
      pipeline: hubspotPipelineMapping,
    },
    monitoring: {
      status: monitoringStatus,
      message: monitoringStatus === "paused"
        ? "Revenue monitoring is paused. Turn it on to resume automatic checks."
        : monitoringStatus === "reconnect_required"
          ? "Reconnect Gmail to resume Revenue monitoring."
          : monitoringStatus === "monitoring_issue"
            ? "Automatic checks need attention. You can try a check now."
            : hasScan ? "Revenue is checking for new work automatically." : "Revenue monitoring is on. The first check is coming up.",
      monitoringEnabled,
      cadence,
      sourceMode: lastRunSourceMode,
      lastRunAt,
      nextRunAt,
      lastRunStatus,
      lastRunSummary: Object.keys(lastSuccessfulSummary ?? {}).length > 0
        ? lastSuccessfulSummary
        : Object.keys(lastRunSummary).length > 0 ? lastRunSummary : latestScan,
      lastSuccessfulCheckAt,
      lastFailedCheckAt,
      lastScheduledCheckAt,
      consecutiveScheduledFailures: scheduledFailures,
      lastFailureCode,
      isRunning: scheduledIsRunning || manualIsRunning,
      manualRunAvailable: boolValue(triggerSettings.manualRunAvailable) ?? true,
      lastScanTime: lastRunAt,
      lastScannedCount: latestScan?.scanned ?? (typeof lastRunSummary.scanned === "number" ? lastRunSummary.scanned : 0),
      opportunitiesFound: latestScan?.opportunitiesFound ?? (typeof lastRunSummary.opportunitiesFound === "number" ? lastRunSummary.opportunitiesFound : 0),
      approvalsCreated: latestScan?.approvalsCreated ?? (typeof lastRunSummary.approvalsCreated === "number" ? lastRunSummary.approvalsCreated : 0),
      skippedSafelyCount: latestScan?.skippedCount ?? (typeof lastRunSummary.skippedCount === "number" ? lastRunSummary.skippedCount : 0),
      routedItemCount: latestScan?.routedItemCount ?? (typeof lastRunSummary.routedItemCount === "number" ? lastRunSummary.routedItemCount : null),
      recentPendingApprovals: (pendingApprovals.data ?? []).map((row) => mapPendingApproval(row as Record<string, unknown>)),
      reconnectRequired,
      nextScanLabel: nextRunAt ? `Next check ${new Date(nextRunAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}` : "Not scheduled",
    },
  });
}
