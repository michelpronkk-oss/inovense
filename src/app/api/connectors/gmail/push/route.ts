import { NextRequest, NextResponse } from "next/server";
import { idempotencyKeys } from "@trigger.dev/sdk/v3";
import { gmailPushProcess } from "@/trigger/gmail-push-process";
import { readGmailPushConfig, parseGmailPubSubEnvelope, safeAccountHash } from "@/lib/connectors/gmail-push-protocol";
import { verifyPubSubPushAuthorization } from "@/lib/connectors/gmail-push-auth";
import { findWorkspaceForGmailAccount } from "@/lib/connectors/gmail-monitoring";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { hashProviderAccountId } from "@/lib/provider-events/types";
import { ingestProviderEvent } from "@/lib/provider-events/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function response(status: number) {
  return new NextResponse(null, { status });
}

export async function POST(request: NextRequest) {
  let config;
  try { config = readGmailPushConfig(); } catch (error) {
    console.warn(JSON.stringify({ event: "gmail_push_configuration_invalid", errorCode: error instanceof Error ? error.message : "gmail_push_configuration_invalid" }));
    return response(503);
  }
  if (request.headers.get("content-type")?.toLowerCase().split(";")[0] !== "application/json") return response(415);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return response(413);

  const authenticated = await verifyPubSubPushAuthorization(request.headers.get("authorization"), config);
  if (!authenticated) return response(401);

  let text = "";
  try {
    const reader = request.body?.getReader();
    if (!reader) return response(400);
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      totalBytes += next.value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return response(413);
      }
      chunks.push(next.value);
    }
    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch { return response(400); }
  let envelope: unknown;
  try { envelope = JSON.parse(text); } catch { return response(400); }
  let parsed;
  try { parsed = parseGmailPubSubEnvelope(envelope, config.subscription); } catch (error) {
    console.warn(JSON.stringify({ event: "gmail_push_payload_rejected", errorCode: error instanceof Error ? error.message : "gmail_push_payload_invalid" }));
    return response(400);
  }

  let mapping;
  try {
    mapping = await findWorkspaceForGmailAccount({ emailAddress: parsed.notification.emailAddress, supabase: createSupabaseAdmin() });
  } catch {
    return response(503);
  }
  if (!mapping) {
    // A valid, authenticated event that does not map uniquely to a connected
    // account is permanent from Pub/Sub's perspective; acknowledge it without
    // allowing sender-supplied tenant identifiers into the queue.
    console.warn(JSON.stringify({ event: "gmail_push_account_unmapped", accountHash: safeAccountHash(parsed.notification.emailAddress) }));
    return response(204);
  }

  try {
    const supabase = createSupabaseAdmin();
    const { event, created } = await ingestProviderEvent({
      workspaceId: mapping.workspaceId,
      connectorKey: "gmail",
      provider: "gmail",
      providerAccountId: hashProviderAccountId("gmail", parsed.notification.emailAddress),
      externalEventId: `${config.subscription}:${parsed.messageId}`,
      eventType: "gmail.history.changed",
      entityType: "mailbox",
      entityId: hashProviderAccountId("gmail", parsed.notification.emailAddress),
      sourceMode: "push",
      metadata: { historyId: parsed.notification.historyId },
    }, supabase);
    const idempotencyKey = await idempotencyKeys.create(`provider-event:${event.id}:attempt:${event.attempt_count}`, { scope: "global" });
    await gmailPushProcess.trigger({ providerEventId: event.id }, {
      idempotencyKey,
      idempotencyKeyTTL: "30d",
      concurrencyKey: event.connector_id,
    });
    console.info(JSON.stringify({ event: created ? "provider_event_enqueued" : "provider_event_deduped", workspaceId: mapping.workspaceId, connectorId: event.connector_id, provider: "gmail", providerEventId: event.id, sourceMode: "push" }));
    return response(204);
  } catch {
    // Non-2xx asks Pub/Sub to retry intake. Trigger idempotency makes retries
    // safe if the enqueue succeeded but this process lost its response.
    return response(503);
  }
}
