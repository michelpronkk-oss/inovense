import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createDodoCustomerPortalSession } from "@/lib/billing/dodo";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server configuration missing.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

type PortalBody = {
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
};

function resolveReturnUrl(req: NextRequest): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  return `${siteUrl}/app/settings?billing=returned`;
}

async function resolveWorkspaceCustomerId(input: PortalBody): Promise<{ customerId?: string; error?: string }> {
  if (!input.workspaceId) {
    return { error: "workspaceId is required." };
  }
  if (!input.userId && !input.userEmail) {
    return { error: "User identity is required." };
  }

  const supabase = createSupabaseAdmin();

  const membership = await supabase
    .from("os_workspace_members")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .or(input.userId ? `user_id.eq.${input.userId},email.eq.${input.userEmail ?? ""}` : `email.eq.${input.userEmail ?? ""}`)
    .limit(1)
    .maybeSingle();

  if (membership.error || !membership.data) {
    return { error: "Workspace membership not found." };
  }

  const workspace = await supabase
    .from("os_workspaces")
    .select("dodo_customer_id")
    .eq("id", input.workspaceId)
    .maybeSingle();

  if (workspace.error) {
    return { error: workspace.error.message };
  }
  if (!workspace.data?.dodo_customer_id) {
    return { error: "No active billing profile found. Activate a plan first." };
  }

  return { customerId: workspace.data.dodo_customer_id as string };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PortalBody;
    const result = await resolveWorkspaceCustomerId(body);
    if (result.error) {
      const status = result.error === "No active billing profile found. Activate a plan first." ? 400 : 403;
      return NextResponse.json({ error: result.error }, { status });
    }

    const { portalUrl } = await createDodoCustomerPortalSession(result.customerId as string, resolveReturnUrl(req));
    return NextResponse.json({ portalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? undefined;
  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
  const userEmail = req.nextUrl.searchParams.get("userEmail") ?? undefined;
  const result = await resolveWorkspaceCustomerId({ workspaceId, userId, userEmail });
  if (result.error) {
    const status = result.error === "No active billing profile found. Activate a plan first." ? 400 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }
  try {
    const { portalUrl } = await createDodoCustomerPortalSession(result.customerId as string, resolveReturnUrl(req));
    return NextResponse.redirect(portalUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

