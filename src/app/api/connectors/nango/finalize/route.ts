import { NextRequest, NextResponse } from "next/server";
import { getNangoProviderConfigKey, verifyNangoConnection } from "@/lib/integrations/nango";
import { getConnectorDefinition, isSupportedNangoConnector } from "@/lib/connectors/registry";
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
    || getNangoProviderConfigKey(connectorKey);
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

  if (!workspaceId || !isSupportedNangoConnector(connectorKey)) {
    return NextResponse.json({ error: "workspaceId and a supported Nango connectorKey are required.", code: "invalid_params" }, { status: 400 });
  }
  const connectorDef = getConnectorDefinition(connectorKey);
  if (!nangoConnectionId) {
    return NextResponse.json({
      error: "missing_nango_connection_id",
      message: "Nango OAuth completed, but no connection id was returned to persist.",
    }, { status: 400 });
  }
  if (!providerConfigKey) {
    return NextResponse.json({ error: "missing_provider_config_key" }, { status: 400 });
  }
  if (!connectorDef?.providerConfigKey || providerConfigKey !== connectorDef.providerConfigKey) {
    return NextResponse.json({
      error: "provider_config_mismatch",
      message: "The Nango provider config does not match the registry entry for this connector.",
    }, { status: 400 });
  }

  const verification = await verifyNangoConnection({ connectorKey, providerConfigKey, connectionId: nangoConnectionId });
  if (!verification.ok) {
    return NextResponse.json({
      error: "connection_verification_failed",
      status: "reconnect_required",
      message: `${connectorDef?.displayName ?? connectorKey} authorization was not completed or could not be verified. Try reconnecting.`,
    }, { status: 409 });
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
    .eq("connector_key", connectorKey)
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json({ error: "connector_lookup_failed", message: existing.error.message }, { status: 500 });
  }
  const connectorRowId = existing.data?.id ?? `${context.workspaceId}:${connectorKey}`;
  const upsert = await supabase.from("os_connectors").upsert({
    id: connectorRowId,
    workspace_id: context.workspaceId,
    connector_key: connectorKey,
    name: connectorDef?.displayName ?? connectorKey,
    letter: connectorDef?.letter ?? connectorKey.slice(0, 2).toUpperCase(),
    color: connectorDef?.color ?? "#4DE8E1",
    category: connectorDef?.category ?? "custom_api",
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
      provider: body.provider || connectorKey,
      providerConfigKey,
      finalizedBy: context.userEmail || context.userId,
      finalizedAt: nowIso,
    },
  }, { onConflict: "id" });

  if (upsert.error) {
    return NextResponse.json({
      error: "connector_persist_failed",
      message: upsert.error.message,
    }, { status: 500 });
  }

  await supabase.from("os_execution_logs").insert({
    id: `log-${connectorKey}-finalized-${Date.now()}`,
    ts: ts(),
    run_id: "connector",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "connector.nango.finalized",
    message: `${connectorDef?.displayName ?? connectorKey} account connected${providerEmail ? ` (${providerEmail})` : ""}`,
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
