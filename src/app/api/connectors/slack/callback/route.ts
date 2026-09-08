import { NextRequest, NextResponse } from "next/server";
import {
  SLACK_CONNECTOR_KEY,
  exchangeSlackCode,
  getSlackConfigStatus,
  toStoredSlackCredential,
  verifySlackConnection,
} from "@/lib/connectors/slack";
import { clearLegacyNangoConnection } from "@/lib/connectors/legacy-nango";
import { parseProviderOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppRoute, getAppUrl } from "@/lib/urls";

function redirect(params: string): NextResponse {
  return NextResponse.redirect(new URL(getAppRoute(`/connectors?${params}`), getAppUrl()));
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig() || !getSlackConfigStatus().configured) return redirect("slack=not_configured");
  if (req.nextUrl.searchParams.get("error")) return redirect("slack=oauth_denied");

  try {
    // Workspace binding comes only from the signed state, never a query param.
    const state = parseProviderOAuthState("slack", req.nextUrl.searchParams.get("state"));
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return redirect("slack=missing_code");

    const token = await exchangeSlackCode(code);
    // Slack is only recorded as connected after a real provider call proves the
    // bot token works, never on the OAuth redirect alone.
    const identity = await verifySlackConnection(token.access_token as string);

    const supabase = createSupabaseAdmin();
    const existing = await supabase
      .from("os_connector_credentials")
      .select("metadata")
      .eq("workspace_id", state.workspaceId)
      .eq("connector_key", SLACK_CONNECTOR_KEY)
      .maybeSingle();

    const credential = toStoredSlackCredential({ workspaceId: state.workspaceId, token, identity });
    credential.metadata = {
      ...((existing.data?.metadata ?? {}) as Record<string, unknown>),
      ...(credential.metadata ?? {}),
    };

    const stored = await supabase
      .from("os_connector_credentials")
      .upsert(credential, { onConflict: "workspace_id,connector_key" });
    if (stored.error) throw new Error(stored.error.message);

    // A direct credential now exists, so the pre-migration Nango row is dead
    // state. Removing it leaves exactly one connection record for Slack.
    await clearLegacyNangoConnection({ workspaceId: state.workspaceId, connectorKey: SLACK_CONNECTOR_KEY, supabase });

    await supabase.from("os_execution_logs").insert({
      id: `log-slack-connect-${Date.now()}`,
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      run_id: "connector",
      agent_id: "system",
      agent_mark: "OS",
      agent_color: "#4DE8E1",
      event: "connector.slack.connected",
      message: `Connected Slack workspace${identity.teamName ? ` (${identity.teamName})` : ""}`,
      duration: "-",
      status: "ok",
    });

    return redirect("connected=slack");
  } catch {
    return redirect("slack=error");
  }
}
