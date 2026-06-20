import { NextRequest, NextResponse } from "next/server";
import { GMAIL_READONLY_SCOPE } from "@/lib/connectors/gmail";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type ScanSummaryOutput = {
  type?: string;
  status?: string;
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
    scanned: typeof record.scanned === "number" ? record.scanned : undefined,
    opportunitiesFound: typeof record.opportunitiesFound === "number" ? record.opportunitiesFound : undefined,
    approvalsCreated: typeof record.approvalsCreated === "number" ? record.approvalsCreated : undefined,
    skippedCount: typeof record.skippedCount === "number" ? record.skippedCount : undefined,
    routedItemCount: typeof record.routedItemCount === "number" ? record.routedItemCount : undefined,
    completedAt: typeof record.completedAt === "string" ? record.completedAt : undefined,
  };
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

  const [readiness, connectorTruth, runs, pendingApprovals] = await Promise.all([
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
  ]);

  if (runs.error) {
    return NextResponse.json({ error: runs.error.message }, { status: 500 });
  }
  if (pendingApprovals.error) {
    return NextResponse.json({ error: pendingApprovals.error.message }, { status: 500 });
  }

  const gmail = connectorTruth.find((connector) => connector.connectorKey === "gmail") ?? null;
  const gmailScopes = gmail?.scopes ?? [];
  const reconnectRequired = Boolean(gmail && !gmailScopes.includes(GMAIL_READONLY_SCOPE));
  const latestScanRow = (runs.data ?? []).find((run) => asScanSummary(run.output));
  const latestScan = latestScanRow ? asScanSummary(latestScanRow.output) : null;
  const hasScan = Boolean(latestScanRow && latestScan);
  const monitoringStatus = reconnectRequired
    ? "reconnect_required"
    : hasScan
      ? latestScanRow?.status ?? latestScan?.status ?? "completed"
      : "idle";

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
    monitoring: {
      status: monitoringStatus,
      message: hasScan ? "Latest scan loaded from operator run history." : "No scan has run yet.",
      lastScanTime: latestScan?.completedAt ?? latestScanRow?.completed_at ?? latestScanRow?.created_at ?? null,
      lastScannedCount: latestScan?.scanned ?? 0,
      opportunitiesFound: latestScan?.opportunitiesFound ?? 0,
      approvalsCreated: latestScan?.approvalsCreated ?? 0,
      skippedSafelyCount: latestScan?.skippedCount ?? 0,
      routedItemCount: latestScan?.routedItemCount ?? null,
      recentPendingApprovals: (pendingApprovals.data ?? []).map((row) => mapPendingApproval(row as Record<string, unknown>)),
      reconnectRequired,
      nextScanLabel: "Daily scan ready",
    },
  });
}
