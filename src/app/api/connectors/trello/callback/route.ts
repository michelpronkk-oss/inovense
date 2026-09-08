import { NextRequest, NextResponse } from "next/server";
import { decryptToken } from "@/lib/connectors/crypto";
import {
  TRELLO_CONNECTOR_KEY,
  TRELLO_OAUTH_COOKIE,
  exchangeTrelloAccessToken,
  getTrelloConfigStatus,
  parseTrelloHandoff,
  toStoredTrelloCredential,
  verifyTrelloConnection,
} from "@/lib/connectors/trello";
import { clearLegacyNangoConnection } from "@/lib/connectors/legacy-nango";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { getAppRoute, getAppUrl } from "@/lib/urls";

function redirect(params: string): NextResponse {
  const response = NextResponse.redirect(new URL(getAppRoute(`/connectors?${params}`), getAppUrl()));
  // The handoff cookie is single-use in every outcome, including failures.
  response.cookies.set({ name: TRELLO_OAUTH_COOKIE, value: "", path: "/api/connectors/trello", maxAge: 0 });
  return response;
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig() || !getTrelloConfigStatus().configured) return redirect("trello=not_configured");
  if (req.nextUrl.searchParams.get("error") || req.nextUrl.searchParams.get("denied")) return redirect("trello=oauth_denied");

  try {
    const handoff = parseTrelloHandoff(req.cookies.get(TRELLO_OAUTH_COOKIE)?.value);
    const oauthToken = req.nextUrl.searchParams.get("oauth_token");
    const verifier = req.nextUrl.searchParams.get("oauth_verifier");
    if (!oauthToken || !verifier) return redirect("trello=missing_verifier");
    // The returned request token must be the exact one this browser session
    // started, so a callback cannot be replayed with someone else's token.
    if (oauthToken !== handoff.requestToken) return redirect("trello=state_mismatch");

    const { accessToken } = await exchangeTrelloAccessToken({
      requestToken: handoff.requestToken,
      requestTokenSecret: decryptToken(handoff.requestTokenSecret),
      verifier,
    });

    // Trello is only recorded as connected after a real Trello API call proves
    // the access token works.
    const identity = await verifyTrelloConnection(accessToken);

    const supabase = createSupabaseAdmin();
    const existing = await supabase
      .from("os_connector_credentials")
      .select("metadata")
      .eq("workspace_id", handoff.workspaceId)
      .eq("connector_key", TRELLO_CONNECTOR_KEY)
      .maybeSingle();

    const credential = toStoredTrelloCredential({ workspaceId: handoff.workspaceId, accessToken, identity });
    credential.metadata = {
      ...((existing.data?.metadata ?? {}) as Record<string, unknown>),
      ...(credential.metadata ?? {}),
    };

    const stored = await supabase
      .from("os_connector_credentials")
      .upsert(credential, { onConflict: "workspace_id,connector_key" });
    if (stored.error) throw new Error(stored.error.message);

    await clearLegacyNangoConnection({ workspaceId: handoff.workspaceId, connectorKey: TRELLO_CONNECTOR_KEY, supabase });

    await supabase.from("os_execution_logs").insert({
      id: `log-trello-connect-${Date.now()}`,
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      run_id: "connector",
      agent_id: "system",
      agent_mark: "OS",
      agent_color: "#4DE8E1",
      event: "connector.trello.connected",
      message: `Connected Trello${identity.username ? ` (${identity.username})` : ""}`,
      duration: "-",
      status: "ok",
    });

    return redirect("connected=trello");
  } catch {
    return redirect("trello=error");
  }
}
