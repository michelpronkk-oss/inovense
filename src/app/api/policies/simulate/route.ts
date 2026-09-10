import { NextRequest, NextResponse } from "next/server";
import { destinationTypeForAction } from "@/lib/policies/defaults";
import { normalizeBusinessContext } from "@/lib/policies/context";
import { evaluatePolicy } from "@/lib/policies/evaluate";
import { loadPolicyWorkspaceSettings } from "@/lib/policies/workspace-policy";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import type { PolicyRiskLevel } from "@/lib/policies/types";

type SimulationBody = {
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
  operatorKey?: string;
  connectorKey?: string;
  actionType?: string;
  subjectType?: string;
  subjectId?: string;
  riskLevel?: string;
  destinationType?: string;
  businessContext?: unknown;
};

function riskLevel(value: unknown): PolicyRiskLevel {
  return value === "low" || value === "high" ? value : "medium";
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({})) as SimulationBody;
  const workspaceId = body.workspaceId?.trim() || "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId: body.userId?.trim(), userEmail: body.userEmail?.trim().toLowerCase(), supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  const actionType = body.actionType?.trim();
  const connectorKey = body.connectorKey?.trim();
  if (!actionType || !connectorKey) return NextResponse.json({ error: "connectorKey and actionType are required." }, { status: 400 });

  const policy = await loadPolicyWorkspaceSettings({ supabase, workspaceId: context.workspaceId });
  const policyInput = {
    workspaceId: context.workspaceId,
    operatorKey: body.operatorKey?.trim() || "revenue",
    actionType,
    connectorKey,
    destinationType: (body.destinationType?.trim() || destinationTypeForAction(actionType)) as "internal" | "external" | "customer" | "crm" | "project_tool" | "system",
    riskLevel: riskLevel(body.riskLevel),
    subjectType: body.subjectType?.trim() || undefined,
    subjectId: body.subjectId?.trim() || undefined,
    businessContext: normalizeBusinessContext(body.businessContext),
    source: "policy-simulation",
  };
  const decision = evaluatePolicy(policyInput, policy, { canRunRealActions: false, billingStatus: "simulation" });
  return NextResponse.json({ simulation: { decision, policyInput: { ...policyInput, workspaceId: context.workspaceId }, executed: false } });
}
