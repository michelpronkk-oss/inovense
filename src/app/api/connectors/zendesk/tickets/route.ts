import { NextRequest, NextResponse } from "next/server";
import { getStoredZendeskCredential, listZendeskTickets, normalizeZendeskTicket, resolveZendeskAccessToken } from "@/lib/connectors/zendesk";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const credential = await getStoredZendeskCredential(context.workspaceId, supabase);
  const subdomain = typeof credential?.metadata?.subdomain === "string" ? credential.metadata.subdomain : null;
  if (!credential || !subdomain) return NextResponse.json({ error: "Zendesk is not connected." }, { status: 404 });
  try {
    const token = await resolveZendeskAccessToken({ workspaceId: context.workspaceId, credential, supabase });
    const result = await listZendeskTickets(token, subdomain, { updatedSince: req.nextUrl.searchParams.get("updatedSince"), cursor: req.nextUrl.searchParams.get("cursor"), maxResults: 100 });
    return NextResponse.json({ tickets: result.tickets.map((ticket) => normalizeZendeskTicket(ticket, subdomain)), nextCursor: result.nextCursor });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load Zendesk tickets." }, { status: 502 }); }
}
