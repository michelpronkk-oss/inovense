import { NextRequest, NextResponse } from "next/server";
import { getStoredIntercomCredential, normalizeIntercomRegion } from "@/lib/connectors/intercom";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }); const supabase = createSupabaseAdmin(); const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase }); if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status }); const credential = await getStoredIntercomCredential(context.workspaceId, supabase); if (!credential) return NextResponse.json({ error: "Intercom is not connected." }, { status: 404 });
  try { const region = normalizeIntercomRegion(typeof credential.metadata?.region === "string" ? credential.metadata.region : null); return NextResponse.json({ region, accountId: credential.provider_account_id ?? null, accountEmail: credential.provider_email ?? null, syncCursor: credential.metadata?.syncCursor ?? null }); } catch { return NextResponse.json({ error: "Intercom region identity is missing." }, { status: 409 }); }
}
