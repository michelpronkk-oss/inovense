import { NextRequest, NextResponse } from "next/server";
import { getOperatorProductState, getWorkspaceOperatorProductStates } from "@/lib/operators/product-state";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

// Read-only, workspace-scoped exposure of the shared operator product-state
// model (src/lib/operators/product-state.ts) for client components
// (/app/agents, /app/connectors, operator detail pages) - mirrors the same
// auth pattern as /api/operators/readiness. Never re-derives readiness,
// activation, or connector truth itself.
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  const operatorKey = (req.nextUrl.searchParams.get("operatorKey") || "").trim();

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  if (operatorKey) {
    const state = await getOperatorProductState({ workspaceId: context.workspaceId, operatorKey });
    if (!state) {
      return NextResponse.json({ error: "Unknown or unsupported operatorKey." }, { status: 404 });
    }
    return NextResponse.json({ state });
  }

  const states = await getWorkspaceOperatorProductStates({ workspaceId: context.workspaceId });
  return NextResponse.json({ states });
}
