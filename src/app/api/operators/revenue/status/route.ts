import { NextRequest, NextResponse } from "next/server";
import { GMAIL_READONLY_SCOPE } from "@/lib/connectors/gmail";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { getHubSpotDealPipelineMapping, getHubSpotPropertyReadiness } from "@/lib/operators/executors/hubspot";
import { getOperatorReadiness } from "@/lib/operators/readiness";
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
  if (record.type !== "gmail_scan_summary") return null;
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
  if (!lastRunAt) return null;
  const date = new Date(lastRunAt);
  if (Number.isNaN(date.getTime())) return null;
  if (cadence === "daily") return new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return null;
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

  const [readiness, connectorTruth, runs, pendingApprovals, triggerConfig] = await Promise.all([
    getOperatorReadiness({ workspaceId: context.workspaceId, operatorKey: "revenue" }),
    getConnectorTruth({ workspaceId: context.workspaceId, supabase }),
    supabase
      .from("os_operator_runs")
      .select("id,status,output,created_at,completed_at")
      .eq("workspace_id", context.workspaceId)
      .eq("operator_key", "revenue")
      .eq("trigger_type", "gmail_scan")
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

  const gmail = connectorTruth.find((connector) => connector.connectorKey === "gmail") ?? null;
  const hubspot = connectorTruth.find((connector) => connector.connectorKey === "hubspot") ?? null;
  const hubspotConnected = Boolean(
    hubspot
    && hubspot.status === "connected"
    && hubspot.providerConfigKey
    && hubspot.nangoConnectionId
  );
  const gmailScopes = gmail?.scopes ?? [];
  const reconnectRequired = Boolean(gmail && !gmailScopes.includes(GMAIL_READONLY_SCOPE));
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
  const lastRunSourceMode = stringValue(triggerSettings.sourceMode) ?? latestScan?.sourceMode ?? "scheduled";
  const monitoringStatus = reconnectRequired
    ? "reconnect_required"
    : monitoringEnabled
      ? "monitoring_active"
      : "idle";
  const [hubspotPropertyReadiness, hubspotPipelineMapping] = hubspotConnected
    ? await Promise.all([
      getHubSpotPropertyReadiness(context.workspaceId),
      getHubSpotDealPipelineMapping(context.workspaceId),
    ])
    : [null, null] as const;

  // Capability-based readiness. Connector keys are only counted as connected
  // when they can actually execute (Gmail with send scope, HubSpot with a live
  // Nango connection), so this never reports readiness the workspace lacks.
  const connectedConnectorKeys: string[] = [];
  if (gmail?.executable) connectedConnectorKeys.push("gmail");
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
    hubspot: hubspot ? {
      status: hubspot.status,
      accountEmail: hubspot.accountEmail,
      connected: hubspotConnected,
      providerConfigKey: hubspot.providerConfigKey,
      hasNangoConnection: Boolean(hubspot.nangoConnectionId),
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
      ? "Gmail and HubSpot are connected. CRM contact and deal updates execute after approval."
      : "Gmail is connected. HubSpot is missing, so Revenue Operator prepares email follow-ups only.",
    v1Readiness: {
      status: gmail?.executable && hubspotConnected ? "Revenue Operator v1 ready" : "Setup required",
      checks: {
        gmailSendAfterApproval: gmail?.executable ? "ready" : "missing",
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
        suggestedAction: "Create Inovense attribution properties in HubSpot to preserve full source context.",
        severity: "non_blocking",
      } : null,
      pipeline: hubspotPipelineMapping,
    },
    monitoring: {
      status: monitoringStatus,
      message: hasScan ? "Monitoring is active. Latest check loaded from operator run history." : "Monitoring is active. No check has run yet.",
      monitoringEnabled,
      cadence,
      sourceMode: lastRunSourceMode,
      lastRunAt,
      nextRunAt,
      lastRunStatus: stringValue(triggerSettings.lastRunStatus) ?? latestScanRow?.status ?? latestScan?.status ?? null,
      lastRunSummary: Object.keys(lastRunSummary).length > 0 ? lastRunSummary : latestScan,
      manualRunAvailable: boolValue(triggerSettings.manualRunAvailable) ?? true,
      lastScanTime: lastRunAt,
      lastScannedCount: latestScan?.scanned ?? (typeof lastRunSummary.scanned === "number" ? lastRunSummary.scanned : 0),
      opportunitiesFound: latestScan?.opportunitiesFound ?? (typeof lastRunSummary.opportunitiesFound === "number" ? lastRunSummary.opportunitiesFound : 0),
      approvalsCreated: latestScan?.approvalsCreated ?? (typeof lastRunSummary.approvalsCreated === "number" ? lastRunSummary.approvalsCreated : 0),
      skippedSafelyCount: latestScan?.skippedCount ?? (typeof lastRunSummary.skippedCount === "number" ? lastRunSummary.skippedCount : 0),
      routedItemCount: latestScan?.routedItemCount ?? (typeof lastRunSummary.routedItemCount === "number" ? lastRunSummary.routedItemCount : null),
      recentPendingApprovals: (pendingApprovals.data ?? []).map((row) => mapPendingApproval(row as Record<string, unknown>)),
      reconnectRequired,
      nextScanLabel: nextRunAt ? `Next daily check ${new Date(nextRunAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Daily scan ready",
    },
  });
}
