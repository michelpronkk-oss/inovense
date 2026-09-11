import { NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getTrialEligibility } from "@/lib/billing/trials";

export async function GET() {
  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await resolveActiveWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "Workspace unavailable" }, { status: 404 });
  try {
    await requireWorkspaceAdmin(user.id, workspaceId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const trial = await getTrialEligibility({ supabase: createSupabaseAdmin(), workspaceId, ownerUserId: user.id });
  if (trial.reason === "history_unavailable") {
    return NextResponse.json({ eligible: false, status: "unavailable", reason: trial.reason, matchedBy: null }, { status: 503 });
  }
  return NextResponse.json({ eligible: trial.eligible, status: trial.entitlement?.trialStatus ?? "eligible", reason: trial.reason, matchedBy: trial.matchedBy });
}
