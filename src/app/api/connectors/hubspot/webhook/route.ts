import { idempotencyKeys } from "@trigger.dev/sdk/v3";
import { NextRequest, NextResponse } from "next/server";
import { HUBSPOT_WEBHOOK_MAX_BODY_BYTES, HUBSPOT_WEBHOOK_URL, hashHubSpotIdentifier, isHubSpotWebhookTimestampFresh, parseHubSpotWebhookBatch, selectUniqueHubSpotWorkspace, stableHubSpotExternalEventId, verifyHubSpotWebhookSignature } from "@/lib/connectors/hubspot-webhook";
import { ingestProviderEvent } from "@/lib/provider-events/store";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { hubspotWebhookProcess } from "@/trigger/hubspot-webhook-process";

const SIGNATURE_HEADER = "x-hubspot-signature-v3";
const TIMESTAMP_HEADER = "x-hubspot-request-timestamp";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

async function readRawBody(request: NextRequest): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > HUBSPOT_WEBHOOK_MAX_BODY_BYTES) return null;
  try {
    const body = await request.text();
    return new TextEncoder().encode(body).byteLength <= HUBSPOT_WEBHOOK_MAX_BODY_BYTES ? body : null;
  } catch {
    return null;
  }
}

async function resolveWorkspace(portalId: string, supabase: ReturnType<typeof createSupabaseAdmin>): Promise<string | null> {
  const result = await supabase.from("os_connector_credentials")
    .select("workspace_id,provider_account_id,status")
    .eq("connector_key", "hubspot")
    .eq("provider_account_id", portalId);
  if (result.error) throw new Error("hubspot_webhook_mapping_failed");
  return selectUniqueHubSpotWorkspace(result.data ?? [], portalId);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/.test(contentType)) return json({ error: "hubspot_webhook_content_type_invalid" }, 415);
  const rawBody = await readRawBody(request);
  if (rawBody === null) return json({ error: "hubspot_webhook_body_too_large" }, 413);

  const timestamp = request.headers.get(TIMESTAMP_HEADER);
  if (!isHubSpotWebhookTimestampFresh(timestamp)) return json({ error: "hubspot_webhook_timestamp_invalid" }, 401);
  if (!verifyHubSpotWebhookSignature({
    rawBody,
    method: request.method,
    uri: HUBSPOT_WEBHOOK_URL,
    timestamp,
    signature: request.headers.get(SIGNATURE_HEADER),
  })) return json({ error: "hubspot_webhook_signature_invalid" }, 401);

  let batch;
  try { batch = parseHubSpotWebhookBatch(rawBody); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "hubspot_webhook_payload_invalid" }, 400); }

  const supabase = createSupabaseAdmin();
  const mappingCache = new Map<string, string | null>();
  let enqueued = 0;
  let unmapped = 0;
  for (const event of batch.supported) {
    let workspaceId: string | null;
    if (mappingCache.has(event.portalId)) workspaceId = mappingCache.get(event.portalId) ?? null;
    else {
      workspaceId = await resolveWorkspace(event.portalId, supabase);
      mappingCache.set(event.portalId, workspaceId);
    }
    if (!workspaceId) {
      unmapped += 1;
      continue;
    }
    const { event: providerEvent } = await ingestProviderEvent({
      workspaceId,
      connectorKey: "hubspot",
      provider: "hubspot",
      providerAccountId: hashProviderAccountId("hubspot", event.portalId),
      externalEventId: stableHubSpotExternalEventId(event),
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.objectId,
      occurredAt: event.occurredAt,
      sourceMode: "webhook",
      metadata: {
        portalId: event.portalId,
        subscriptionType: event.subscriptionType,
        propertyName: event.propertyName,
        propertyValue: event.propertyValue,
        changeSource: event.changeSource,
        changeFlag: event.changeFlag,
        appId: event.appId,
        objectIdHash: hashHubSpotIdentifier(event.objectId),
      },
    }, supabase);
    const idempotencyKey = await idempotencyKeys.create(`provider-event:${providerEvent.id}:attempt:${providerEvent.attempt_count}`, { scope: "global" });
    await hubspotWebhookProcess.trigger({ providerEventId: providerEvent.id }, {
      idempotencyKey,
      idempotencyKeyTTL: "30d",
      concurrencyKey: providerEvent.connector_id,
    });
    enqueued += 1;
  }

  if (batch.unsupported.length > 0 || unmapped > 0) {
    console.info(JSON.stringify({
      event: "hubspot_webhook_partially_accepted",
      supported: batch.supported.length,
      unsupported: batch.unsupported.length,
      unmapped,
      portalHashes: [...mappingCache.keys()].slice(0, 20).map(hashHubSpotIdentifier),
    }));
  }
  return json({ received: batch.supported.length + batch.unsupported.length, enqueued, unsupported: batch.unsupported.length, unmapped });
}
