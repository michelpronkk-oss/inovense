import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createDodoCustomerPortalSession } from "@/lib/billing/dodo";
import { getAppUrl } from "@/lib/urls";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";

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
};

function resolveReturnUrl(): string {
  const siteUrl = getAppUrl();
  return `${siteUrl}/app/settings?billing=returned`;
}

async function resolveWorkspaceCustomerId(input: PortalBody): Promise<{ customerId?: string; error?: string }> {
  if (!input.workspaceId) {
    return { error: "workspaceId is required." };
  }
  const supabase = createSupabaseAdmin();
  const user = await getVerifiedSupabaseUser();
  if (!user) return { error: "Sign in to manage billing." };
  try {
    await requireWorkspaceAdmin(user.id, input.workspaceId, supabase);
  } catch (error) {
    return { error: error instanceof AuthorizationError ? error.message : "Could not verify workspace membership." };
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

    const { portalUrl } = await createDodoCustomerPortalSession(result.customerId as string, resolveReturnUrl());
    return NextResponse.json({ portalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? undefined;
  const result = await resolveWorkspaceCustomerId({ workspaceId });
  if (result.error) {
    const status = result.error === "No active billing profile found. Activate a plan first." ? 400 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }
  try {
    const { portalUrl } = await createDodoCustomerPortalSession(result.customerId as string, resolveReturnUrl());
    return NextResponse.redirect(portalUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
