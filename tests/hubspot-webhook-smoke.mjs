import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const temp = path.join(root, "tests", `.tmp-hubspot-webhook-${process.pid}`);
fs.mkdirSync(temp, { recursive: true });
const source = fs.readFileSync("src/lib/connectors/hubspot-webhook.ts", "utf8").replace(/^import type[^\n]+\n/gm, "");
const compiled = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" }).code;
const file = path.join(temp, "hubspot-webhook.mjs");
fs.writeFileSync(file, compiled, "utf8");
const protocol = await import(pathToFileURL(file).href + `?t=${Date.now()}`);

const now = Date.now();
const secret = "hubspot-test-secret";
const body = JSON.stringify([
  { eventId: 101, portalId: 12345, subscriptionType: "contact.creation", objectId: 9001, occurredAt: now, appId: 77 },
  { eventId: 102, portalId: 12345, subscriptionType: "deal.propertyChange", propertyName: "dealstage", propertyValue: "closedwon", objectId: 8001, occurredAt: now, changeSource: "CRM", changeFlag: "NEW_VALUE", appId: 77 },
  { eventId: 103, portalId: 12345, subscriptionType: "contact.propertyChange", propertyName: "unsupported_property", objectId: 9002, occurredAt: now, appId: 77 },
]);
const timestamp = String(now);
const signature = crypto.createHmac("sha256", secret).update(`POST${protocol.HUBSPOT_WEBHOOK_URL}${body}${timestamp}`, "utf8").digest("base64");
assert.equal(protocol.isHubSpotWebhookTimestampFresh(timestamp, now), true);
assert.equal(protocol.verifyHubSpotWebhookSignature({ rawBody: body, method: "POST", timestamp, signature, clientSecret: secret, nowMs: now }), true, "valid v3 signature is accepted");
assert.equal(protocol.verifyHubSpotWebhookSignature({ rawBody: body, method: "POST", timestamp, signature: `${signature}x`, clientSecret: secret, nowMs: now }), false, "invalid signature is rejected");
assert.equal(protocol.isHubSpotWebhookTimestampFresh(String(now - 6 * 60 * 1000), now), false, "stale timestamp is rejected");
assert.throws(() => protocol.parseHubSpotWebhookBatch("not json"), /hubspot_webhook_json_invalid/);
assert.throws(() => protocol.parseHubSpotWebhookBatch(JSON.stringify(Array.from({ length: 101 }, () => ({})))), /hubspot_webhook_batch_invalid/);

const parsed = protocol.parseHubSpotWebhookBatch(body);
assert.equal(parsed.supported.length, 2, "supported contact and deal notifications are parsed");
assert.equal(parsed.unsupported.length, 1, "unknown property notifications are acknowledged as unsupported");
assert.equal(parsed.supported[0].eventType, "hubspot.contact.created");
assert.equal(parsed.supported[1].eventType, "hubspot.deal.stage_changed");
assert.equal(protocol.stableHubSpotExternalEventId(parsed.supported[0]), "hubspot:12345:101");
const duplicateBatch = protocol.parseHubSpotWebhookBatch(JSON.stringify([JSON.parse(body)[0], JSON.parse(body)[0]]));
assert.equal(protocol.stableHubSpotExternalEventId(duplicateBatch.supported[0]), protocol.stableHubSpotExternalEventId(duplicateBatch.supported[1]), "duplicate deliveries have a stable event id");
assert.equal(protocol.selectUniqueHubSpotWorkspace([{ workspace_id: "ws-1", provider_account_id: "12345", status: "connected" }], "12345"), "ws-1");
assert.equal(protocol.selectUniqueHubSpotWorkspace([{ workspace_id: "ws-1", provider_account_id: "12345", status: "connected" }, { workspace_id: "ws-2", provider_account_id: "12345", status: "connected" }], "12345"), null, "ambiguous portal mappings fail closed");
assert.equal(protocol.selectUniqueHubSpotWorkspace([], "12345"), null, "unmapped portal fails closed");
assert.equal(protocol.isHubSpotSelfWriteEcho({ changeSource: "INTEGRATION", appId: "77" }), true, "self-write echoes are identified");

const contactSignal = protocol.normalizeHubSpotSnapshot({ workspaceId: "ws-1", providerEventId: "pev_contact", event: parsed.supported[0], snapshot: { id: "9001", properties: { firstname: "Alex", lastname: "Buyer", lifecyclestage: "lead" } } });
assert.equal(contactSignal.eventType, "hubspot.contact.created");
assert.equal(contactSignal.sourceType, "crm");
assert.equal(contactSignal.metadata.hubspotObjectIdHash, protocol.hashHubSpotIdentifier("9001"));
const dealSignal = protocol.normalizeHubSpotSnapshot({ workspaceId: "ws-1", providerEventId: "pev_deal", event: parsed.supported[1], snapshot: { id: "8001", properties: { dealname: "Expansion", dealstage: "closedwon", amount: "25000" } } });
assert.equal(dealSignal.eventType, "hubspot.deal.closed_won", "the canonical audit trail must name the business transition, not the raw property webhook");
assert.equal(dealSignal.metadata.hubspotClosedWon, true);

// A concurrent, non-stage property webhook (e.g. closedate) that arrives for
// a deal already in the closed-won stage must classify identically to the
// dealstage webhook itself - the authoritative snapshot is the source of
// truth, not which property changed in this specific delivery.
const closedateBody = JSON.stringify([
  { eventId: 201, portalId: 12345, subscriptionType: "deal.propertyChange", propertyName: "closedate", propertyValue: "1700000000000", objectId: 8001, occurredAt: now, changeSource: "CRM", changeFlag: "NEW_VALUE", appId: 77 },
]);
const closedateParsed = protocol.parseHubSpotWebhookBatch(closedateBody);
assert.equal(closedateParsed.supported[0].eventType, "hubspot.deal.updated", "a closedate property change is a deal.updated event, not stage_changed");
const closedateSignal = protocol.normalizeHubSpotSnapshot({ workspaceId: "ws-1", providerEventId: "pev_deal_closedate", event: closedateParsed.supported[0], snapshot: { id: "8001", properties: { dealname: "Expansion", dealstage: "closedwon", amount: "25000" } } });
assert.equal(closedateSignal.eventType, "hubspot.deal.closed_won", "closed-won state must be derived from the snapshot regardless of which property webhook triggered the fetch");
assert.equal(closedateSignal.metadata.hubspotClosedWon, true);

// A normal, non-closed-won stage change must not be misclassified as a
// closed-won handoff.
const openStageBody = JSON.stringify([
  { eventId: 301, portalId: 12345, subscriptionType: "deal.propertyChange", propertyName: "dealstage", propertyValue: "presentationscheduled", objectId: 8002, occurredAt: now, changeSource: "CRM", changeFlag: "NEW_VALUE", appId: 77 },
]);
const openStageParsed = protocol.parseHubSpotWebhookBatch(openStageBody);
const openStageSignal = protocol.normalizeHubSpotSnapshot({ workspaceId: "ws-1", providerEventId: "pev_deal_open", event: openStageParsed.supported[0], snapshot: { id: "8002", properties: { dealname: "New deal", dealstage: "presentationscheduled" } } });
assert.equal(openStageSignal.eventType, "hubspot.deal.stage_changed");
assert.equal(openStageSignal.metadata.hubspotClosedWon, false);

const ownershipSource = fs.readFileSync("src/lib/workforce/ownership.ts", "utf8").replace(/^import type[^\n]+\n/gm, "");
const ownershipCode = esbuild.transformSync(ownershipSource, { loader: "ts", format: "esm", target: "node18" }).code;
const ownershipFile = path.join(temp, "ownership.mjs");
fs.writeFileSync(ownershipFile, ownershipCode, "utf8");
const ownership = await import(pathToFileURL(ownershipFile).href + `?t=${Date.now()}`);
assert.equal(ownership.arbitrateOwnership({ sourceType: "crm", connectorKey: "hubspot", category: "crm_change", metadata: contactSignal.metadata }).primaryOperator, "revenue");
assert.equal(ownership.arbitrateOwnership({ sourceType: "crm", connectorKey: "hubspot", category: "customer_request", metadata: dealSignal.metadata }).primaryOperator, "client_flow");
assert.equal(ownership.arbitrateOwnership({ sourceType: "crm", connectorKey: "hubspot", category: "customer_request", metadata: closedateSignal.metadata }).primaryOperator, "client_flow", "the closedate-only delivery must route to Client Flow just like the stage_changed delivery");
assert.equal(ownership.arbitrateOwnership({ sourceType: "crm", connectorKey: "hubspot", category: "sales_opportunity", metadata: openStageSignal.metadata }).primaryOperator, "revenue", "a deal that is not yet closed-won must remain Revenue-owned");

const route = fs.readFileSync("src/app/api/connectors/hubspot/webhook/route.ts", "utf8");
const helper = fs.readFileSync("src/lib/connectors/hubspot-webhook.ts", "utf8");
const processor = fs.readFileSync("src/trigger/hubspot-webhook-process.ts", "utf8");
const recovery = fs.readFileSync("src/trigger/provider-event-recovery.ts", "utf8");
const engine = fs.readFileSync("src/lib/signals/engine.ts", "utf8");
assert.match(route, /request\.text\(\)/);
assert.match(route, /content-type/);
assert.match(route, /HUBSPOT_WEBHOOK_MAX_BODY_BYTES/);
assert.match(route, /hubspot_webhook_body_too_large/);
assert.match(helper, /hubspot_webhook_json_invalid/);
assert.match(route, /verifyHubSpotWebhookSignature/);
assert.match(helper, /HUBSPOT_CLIENT_SECRET/);
assert.match(route, /selectUniqueHubSpotWorkspace/);
assert.match(route, /ingestProviderEvent/);
assert.doesNotMatch(route, /workspaceId.*payload/);
assert.match(processor, /id: "hubspot-webhook-process"/);
assert.match(processor, /claimProviderEvent/);
assert.match(processor, /hashProviderAccountId\("hubspot"/);
assert.match(processor, /hubSpotApiRequest/);
assert.match(processor, /ingestSignalBatch/);
assert.match(processor, /materializeWorkflows: false/);
assert.match(processor, /hubspot_self_write_echo/);
assert.match(recovery, /hubspotWebhookProcess/);
assert.match(recovery, /event\.provider === "hubspot"/);
assert.match(engine, /if \(hubspotClosedWon\)/, "closed-won classification must not be gated on which property webhook triggered the fetch");
assert.doesNotMatch(engine, /event\.eventType === "hubspot\.deal\.stage_changed" && hubspotClosedWon/, "the stage_changed-only gate that caused concurrent property webhooks to misclassify must be removed");
assert.match(engine, /hubspot:deal_closed_won/);
assert.match(engine, /export function connectorCandidateDedupeKey/, "the candidate dedupe key builder must be reusable for cross-operator supersession lookups");

// Materialization: a routed Client Flow HubSpot candidate must become a
// visible, idempotent current-work item, and the superseded Revenue
// candidate for the same deal must resolve.
const handoff = fs.readFileSync("src/lib/operators/client-flow/hubspot-handoff.ts", "utf8");
assert.match(processor, /materializeClientFlowHandoff/, "the processor must attempt handoff materialization after ingestion");
assert.match(processor, /signal\.metadata\?\.hubspotClosedWon === true/, "handoff materialization must only run for confirmed closed-won deals");
assert.match(processor, /ensureHubSpotClientFlowHandoff/);
assert.match(processor, /resolveSupersededHubSpotRevenueCandidate/);
assert.match(handoff, /oprun-clientflow-hubspot-\$\{input\.workspaceId\}-\$\{input\.dealId\}/, "the handoff run id must be deterministic per workspace and deal for idempotent replay/concurrency handling");
assert.match(handoff, /insert\.error\.code === "23505"/, "a concurrent duplicate insert (racing dealstage/closedate webhooks) must not be treated as a failure");
assert.match(handoff, /status: "resolved"/, "the superseded Revenue candidate must use the existing os_signal_candidates lifecycle status, not a new invented value");
assert.match(handoff, /\.eq\("status", "routed"\)/, "supersession must only touch a still-active Revenue candidate");
console.log("HubSpot webhook smoke: signatures, freshness, safe batch parsing, tenant mapping, canonical normalization, self-write guard, processor wiring, recovery dispatch, Client Flow handoff materialization, Revenue supersession, and CRM routing verified.");
