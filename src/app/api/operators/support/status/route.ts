import { NextRequest, NextResponse } from "next/server";
import { getConnectorTruth } from "@/lib/connectors/truth";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { getOperatorReadiness } from "@/lib/operators/readiness";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function stringValue(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }
function nextDaily(last: string | null) { return last ? new Date(new Date(last).getTime() + 86_400_000).toISOString() : null; }

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId: req.nextUrl.searchParams.get("userId") || "", userEmail: (req.nextUrl.searchParams.get("userEmail") || "").toLowerCase(), supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  const [readiness, truth, runs, approvals, trigger] = await Promise.all([
    getOperatorReadiness({ workspaceId: context.workspaceId, operatorKey: "support" }),
    getConnectorTruth({ workspaceId: context.workspaceId, supabase }),
    supabase.from("os_operator_runs").select("id,status,output,created_at,completed_at").eq("workspace_id", context.workspaceId).eq("operator_key", "support").order("created_at", { ascending: false }).limit(25),
    supabase.from("os_approvals").select("id,title,run_id,created_at,continuation_payload").eq("workspace_id", context.workspaceId).eq("agent_id", "support").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
    supabase.from("os_operator_triggers").select("enabled,config").eq("workspace_id", context.workspaceId).eq("operator_key", "support").eq("trigger_type", "scheduled_monitoring").maybeSingle(),
  ]);
  if (runs.error) return NextResponse.json({ error: runs.error.message }, { status: 500 });
  if (approvals.error) return NextResponse.json({ error: approvals.error.message }, { status: 500 });
  const latest = (runs.data ?? []).find((row) => record(row.output).type === "support_scan_summary");
  const summary = latest ? record(latest.output) : {};
  const config = record(trigger.data?.config);
  const lastRunAt = stringValue(config.lastRunAt) ?? stringValue(summary.completedAt) ?? stringValue(latest?.completed_at) ?? stringValue(latest?.created_at);
  const core = truth.filter((item) => ["zendesk", "intercom", "gmail", "microsoft"].includes(item.connectorKey) && (item.status === "healthy" || item.status === "connected"));
  return NextResponse.json({
    readiness,
    connectors: core.map((item) => ({ connectorKey: item.connectorKey, displayName: item.displayName, status: item.status, executable: item.executable === true })),
    setup: { state: readiness?.status === "missing_connector" ? "needs_setup" : readiness?.canRunManual ? "ready" : "setup_incomplete", coreReady: Boolean(readiness?.canRunManual) },
    monitoring: { status: trigger.data?.enabled === false ? "paused" : "monitoring_active", cadence: "daily", lastRunAt, nextRunAt: stringValue(config.nextRunAt) ?? nextDaily(lastRunAt), lastRunStatus: stringValue(config.lastRunStatus) ?? latest?.status ?? null, scanned: typeof summary.scanned === "number" ? summary.scanned : 0, signalsFound: typeof summary.signalsFound === "number" ? summary.signalsFound : 0, approvalsCreated: typeof summary.approvalsCreated === "number" ? summary.approvalsCreated : 0, skippedCount: typeof summary.skippedCount === "number" ? summary.skippedCount : 0, nextScanLabel: "Daily support check", recentPendingApprovals: (approvals.data ?? []).map((row) => ({ id: String(row.id), title: typeof row.title === "string" ? row.title : "Support review", run_id: row.run_id ?? null, created_at: row.created_at ?? null })) },
  });
}
