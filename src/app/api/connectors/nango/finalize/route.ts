import { NextRequest, NextResponse } from "next/server";
import { HUBSPOT_PROVIDER_CONFIG_KEY, getNangoProviderConfigKey } from "@/lib/integrations/nango";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type FinalizeBody = {
  workspaceId?: string;
  connectorKey?: string;
  userId?: string;
  userEmail?: string;
  providerConfigKey?: string;
  nangoConnectionId?: string;
  providerEmail?: string | null;
  providerAccountId?: string | null;
  provider?: string | null;
  raw?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readPayloadField(payload: unknown, ...keys: string[]): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return "";
}

function ts(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as FinalizeBody;
  const workspaceId = asString(body.workspaceId);
  const connectorKey = asString(body.connectorKey);
  const userId = asString(body.userId);
  const userEmail = asString(body.userEmail).toLowerCase();
  const providerConfigKey = asString(body.providerConfigKey)
    || readPayloadField(body.raw, "providerConfigKey", "provider_config_key")
    || getNangoProviderConfigKey(connectorKey)
    || HUBSPOT_PROVIDER_CONFIG_KEY;
  const nangoConnectionId = asString(body.nangoConnectionId)
    || readPayloadField(body.raw, "connectionId", "connection_id");
  const providerEmail = asString(body.providerEmail)
    || readPayloadField(body.raw, "email", "provider_email", "providerEmail")
    || userEmail
    || null;
  const providerAccountId = asString(body.providerAccountId)
    || readPayloadField(body.raw, "endUserId", "end_user_id", "id")
    || userId
    || userEmail
    || null;

  if (!workspaceId || connectorKey !== "hubspot") {
    return NextResponse.json({ error: "workspaceId and connectorKey=hubspot are required.", code: "invalid_params" }, { status: 400 });
  }
  if (!nangoConnectionId) {
    return NextResponse.json({
      error: "missing_nango_connection_id",
      message: "Nango OAuth completed, but no connection id was returned to persist.",
    }, { status: 400 });
  }
  if (!providerConfigKey) {
    return NextResponse.json({ error: "missing_provider_config_key" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const nowIso = new Date().toISOString();
  const existing = await supabase
    .from("os_connectors")
    .select("id")
    .eq("workspace_id", context.workspaceId)
    .eq("connector_key", "hubspot")
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json({ error: "hubspot_lookup_failed", message: existing.error.message }, { status: 500 });
  }
  const connectorRowId = existing.data?.id ?? `${context.workspaceId}:hubspot`;
  const upsert = await supabase.from("os_connectors").upsert({
    id: connectorRowId,
    workspace_id: context.workspaceId,
    connector_key: "hubspot",
    name: "HubSpot",
    letter: "Hs",
    color: "#FF7A59",
    category: "CRM and sales",
    status: "connected",
    connected: true,
    provider_config_key: providerConfigKey,
    nango_connection_id: nangoConnectionId,
    provider_account_id: providerAccountId,
    provider_email: providerEmail,
    connected_at: nowIso,
    last_sync_at: nowIso,
    last_sync: "just now",
    sync_freq: "Managed",
    permissions: ["read", "write"],
    records: providerEmail ? `Real account connected: ${providerEmail}` : "Real account connected",
    metadata: {
      source: "nango",
      provider: body.provider || "hubspot",
      providerConfigKey,
      finalizedBy: context.userEmail || context.userId,
      finalizedAt: nowIso,
    },
  }, { onConflict: "id" });

  if (upsert.error) {
    return NextResponse.json({
      error: "hubspot_persist_failed",
      message: upsert.error.message,
    }, { status: 500 });
  }

  await supabase.from("os_execution_logs").insert({
    id: `log-hubspot-finalized-${Date.now()}`,
    ts: ts(),
    run_id: "connector",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "connector.nango.finalized",
    message: `HubSpot account connected${providerEmail ? ` (${providerEmail})` : ""}`,
    duration: "-",
    status: "ok",
  });

  return NextResponse.json({
    ok: true,
    status: "connected",
    provider_config_key: providerConfigKey,
    nango_connection_id: nangoConnectionId,
    provider_email: providerEmail,
    connected_at: nowIso,
  });
}
