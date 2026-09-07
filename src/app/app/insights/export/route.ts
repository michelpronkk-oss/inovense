import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InsightsReportDocument } from "@/lib/insights-pdf";
import type { InsightsReportData } from "@/lib/insights-pdf";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireWorkspaceMember, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { canAccessInsights } from "@/lib/os/entitlements";
import type { Workspace } from "@/lib/os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InsightsExportBody = Partial<InsightsReportData> & { workspaceId?: string };

export async function POST(request: NextRequest) {
  let body: InsightsExportBody;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Invalid request body", { status: 400 });
  }

  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdmin();
  const requestedWorkspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
  const workspaceId = requestedWorkspaceId || await resolveActiveWorkspaceId(user.id, supabase);
  if (!workspaceId) return NextResponse.json({ error: "Workspace unavailable" }, { status: 404 });

  try {
    await requireWorkspaceMember(user.id, workspaceId, supabase);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workspaceResult = await supabase
    .from("os_workspaces")
    .select("id,name,environment,region,plan,plan_tier,billing_status,trial_ends_at")
    .eq("id", workspaceId)
    .maybeSingle();
  if (workspaceResult.error || !workspaceResult.data) {
    return NextResponse.json({ error: "Workspace unavailable" }, { status: 404 });
  }
  const row = workspaceResult.data as Record<string, unknown>;
  const workspace: Workspace = {
    id: String(row.id),
    name: String(row.name ?? "Workspace"),
    environment: String(row.environment ?? "production"),
    region: String(row.region ?? ""),
    plan: String(row.plan ?? row.plan_tier ?? "preview"),
    planTier: typeof row.plan_tier === "string" ? row.plan_tier as Workspace["planTier"] : undefined,
    billingStatus: typeof row.billing_status === "string" ? row.billing_status as Workspace["billingStatus"] : undefined,
    trialEndsAt: typeof row.trial_ends_at === "string" ? row.trial_ends_at : undefined,
  };
  if (!canAccessInsights(workspace)) {
    return NextResponse.json({ error: "Insights requires the Workforce plan or above." }, { status: 403 });
  }

  const data: InsightsReportData = {
    workspace: workspace.name,
    periodLabel: String(body.periodLabel ?? "Current period"),
    generatedAt: String(body.generatedAt ?? new Date().toISOString()),
    kpis: Array.isArray(body.kpis) ? body.kpis : [],
    weeklyActions: Array.isArray(body.weeklyActions) ? body.weeklyActions : [],
    weeklyHoursSaved: Array.isArray(body.weeklyHoursSaved) ? body.weeklyHoursSaved : [],
    operators: Array.isArray(body.operators) ? body.operators : [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(React.createElement(InsightsReportDocument, { data }) as any);
  const slug = data.workspace.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filename = `auterim-insights-${slug || "workspace"}.pdf`;

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
