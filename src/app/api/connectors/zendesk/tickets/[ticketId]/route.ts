import { NextRequest, NextResponse } from "next/server";
import { getStoredZendeskCredential, getZendeskTicketDetail, resolveZendeskAccessToken } from "@/lib/connectors/zendesk";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";

export async function GET(req: NextRequest, ctx: { params: Promise<{ ticketId: string }> }) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { ticketId } = await ctx.params;
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const credential = await getStoredZendeskCredential(context.workspaceId, supabase);
  const subdomain = typeof credential?.metadata?.subdomain === "string" ? credential.metadata.subdomain : null;
  if (!credential || !subdomain) return NextResponse.json({ error: "Zendesk is not connected." }, { status: 404 });
  try { const token = await resolveZendeskAccessToken({ workspaceId: context.workspaceId, credential, supabase }); return NextResponse.json({ ticket: await getZendeskTicketDetail(token, subdomain, ticketId) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load Zendesk ticket." }, { status: 502 }); }
}
