import { NextRequest, NextResponse } from "next/server";
import { getStoredZendeskCredential, normalizeZendeskSubdomain } from "@/lib/connectors/zendesk";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const credential = await getStoredZendeskCredential(context.workspaceId, supabase);
  if (!credential) return NextResponse.json({ error: "Zendesk is not connected." }, { status: 404 });
  const subdomain = typeof credential.metadata?.subdomain === "string" ? credential.metadata.subdomain : null;
  if (!subdomain) return NextResponse.json({ error: "Zendesk workspace identity is missing." }, { status: 409 });
  const normalized = normalizeZendeskSubdomain(subdomain);
  return NextResponse.json({ subdomain: normalized.subdomain, baseUrl: normalized.baseUrl, siteUrl: normalized.baseUrl, syncCursor: credential.metadata?.syncCursor ?? null });
}
