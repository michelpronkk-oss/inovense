import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { verifyNangoWebhook } from "@/lib/integrations/nango";

type NangoWebhookPayload = {
  type?: string;
  connectionId?: string;
  connection_id?: string;
  providerConfigKey?: string;
  provider_config_key?: string;
  provider?: string;
  success?: boolean;
  error?: unknown;
  endUser?: { id?: string; email?: string; tags?: Record<string, string> };
  end_user?: { id?: string; email?: string; tags?: Record<string, string> };
  tags?: Record<string, string>;
};

function ts(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const headers: Record<string, unknown> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const valid = verifyNangoWebhook(rawBody, headers);
  if (!valid) {
    return NextResponse.json({ error: "Invalid Nango webhook signature." }, { status: 401 });
  }

  let payload: NangoWebhookPayload = {};
  try {
    payload = JSON.parse(rawBody) as NangoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const connectionId = payload.connectionId || payload.connection_id || "";
  const providerConfigKey = payload.providerConfigKey || payload.provider_config_key || "";
  const provider = payload.provider || "";
  const mergedTags = {
    ...(payload.tags || {}),
    ...(payload.endUser?.tags || {}),
    ...(payload.end_user?.tags || {}),
  };
  const workspaceId = mergedTags.workspace_id || "";
  const connectorKey = mergedTags.connector_key || "";
  const providerEmail = payload.endUser?.email || payload.end_user?.email || mergedTags.end_user_email || null;
  const providerAccountId = payload.endUser?.id || payload.end_user?.id || mergedTags.end_user_id || null;
  const eventType = payload.type || "";

  if (!workspaceId || connectorKey !== "hubspot" || !connectionId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const isSuccess = payload.success === true
    || eventType.includes("auth.success")
    || eventType.includes("connection.created")
    || eventType.includes("connected");
  const isFailure = payload.success === false
    || Boolean(payload.error)
    || eventType.includes("auth.error")
    || eventType.includes("auth.failed")
    || eventType.includes("connection.failed");

  const status = isFailure ? "error" : isSuccess ? "connected" : "pending";
  const nowIso = new Date().toISOString();

  const supabase = createSupabaseAdmin();
  const existing = await supabase
    .from("os_connectors")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", connectorKey)
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }
  const connectorRowId = existing.data?.id ?? `${workspaceId}:${connectorKey}`;
  const upsert = await supabase
    .from("os_connectors")
    .upsert({
      id: connectorRowId,
      workspace_id: workspaceId,
      connector_key: connectorKey,
      name: "HubSpot",
      letter: "Hs",
      color: "#FF7A59",
      category: "CRM and sales",
      status,
      connected: status === "connected",
      provider_config_key: providerConfigKey || "hubspot",
      nango_connection_id: connectionId,
      provider_account_id: providerAccountId,
      provider_email: providerEmail,
      connected_at: status === "connected" ? nowIso : null,
      last_sync_at: nowIso,
      last_sync: status === "connected" ? "just now" : "error",
      sync_freq: "Managed",
      permissions: ["read", "write"],
      records: status === "connected" ? `Real account connected${providerEmail ? `: ${providerEmail}` : ""}` : "Connection failed",
      metadata: {
        source: "nango",
        provider,
        providerConfigKey,
        eventType,
        error: payload.error || null,
        tags: mergedTags,
      },
    }, { onConflict: "id" });

  if (upsert.error) {
    return NextResponse.json({ error: upsert.error.message }, { status: 500 });
  }

  const logEvent = status === "connected" ? "connector.nango.connected" : "connector.nango.failed";
  const logStatus = status === "connected" ? "ok" : "error";
  const logMessage = status === "connected"
    ? `HubSpot account connected${providerEmail ? ` (${providerEmail})` : ""}`
    : `HubSpot connection failed${eventType ? ` (${eventType})` : ""}`;

  await supabase.from("os_execution_logs").insert({
    id: `log-${connectorKey}-${Date.now()}`,
    ts: ts(),
    run_id: "connector",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: logEvent,
    message: logMessage,
    duration: "-",
    status: logStatus,
  });

  return NextResponse.json({ ok: true });
}
