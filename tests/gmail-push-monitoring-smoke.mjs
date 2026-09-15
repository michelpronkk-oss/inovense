import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import esbuild from "esbuild";

const require = createRequire(import.meta.url);

async function loadTypeScript(path, aliases = {}) {
  const source = fs.readFileSync(path, "utf8");
  const compiled = await esbuild.transform(source, { loader: "ts", format: "cjs", target: "node22" });
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.hasOwn(aliases, specifier)) return aliases[specifier];
    return require(specifier);
  };
  new Function("require", "module", "exports", compiled.code)(localRequire, module, module.exports);
  return module.exports;
}

const history = await loadTypeScript("src/lib/connectors/gmail-history.ts");
const protocol = await loadTypeScript("src/lib/connectors/gmail-push-protocol.ts", {
  "@/lib/connectors/gmail-history": history,
});

const encoded = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const officialNotification = '{"emailAddress":"michelpronkk@gmail.com","historyId":"17643800"}';
const officialEnvelope = {
  subscription: "projects/inovense/subscriptions/auterim-gmail-push-sub",
  message: { messageId: "official-pubsub-message-1", data: Buffer.from(officialNotification, "utf8").toString("base64") },
};
const officialParsed = protocol.parseGmailPubSubEnvelope(officialEnvelope, officialEnvelope.subscription);
assert.deepEqual(officialParsed.notification, { emailAddress: "michelpronkk@gmail.com", historyId: "17643800" }, "official Gmail notification envelope parses exactly");
assert.equal(officialParsed.diagnostics.decodedByteLength, Buffer.byteLength(officialNotification, "utf8"));
const goodEnvelope = {
  subscription: "projects/test-project/subscriptions/mailbox-push",
  message: { messageId: "pubsub-123", data: encoded({ emailAddress: "Founder@Example.com", historyId: "120" }) },
};
const parsed = protocol.parseGmailPubSubEnvelope(goodEnvelope, goodEnvelope.subscription);
assert.equal(parsed.notification.emailAddress, "founder@example.com");
assert.equal(parsed.notification.historyId, "120");
const standardBase64Envelope = structuredClone(goodEnvelope);
standardBase64Envelope.message.data = Buffer.from(JSON.stringify({ emailAddress: "founder@example.com", historyId: "121" })).toString("base64");
assert.equal(protocol.parseGmailPubSubEnvelope(standardBase64Envelope, goodEnvelope.subscription).notification.historyId, "121", "standard Pub/Sub Base64 is accepted alongside Base64URL");
assert.throws(() => protocol.parseGmailPubSubEnvelope(goodEnvelope, "projects/other/subscriptions/mailbox-push"), /gmail_push_subscription_invalid/);
assert.throws(() => protocol.parseGmailPubSubEnvelope({ ...goodEnvelope, message: { ...goodEnvelope.message, data: "%%%" } }, goodEnvelope.subscription), /gmail_push_base64_invalid/);
assert.throws(() => protocol.parseGmailPubSubEnvelope({ ...goodEnvelope, message: { ...goodEnvelope.message, data: Buffer.from("not json", "utf8").toString("base64") } }, goodEnvelope.subscription), /gmail_push_json_invalid/);
assert.throws(() => protocol.parseGmailPubSubEnvelope({ ...goodEnvelope, message: { ...goodEnvelope.message, data: encoded({ emailAddress: "bad", historyId: "1e5" }) } }, goodEnvelope.subscription), /gmail_push_email_invalid/);
assert.throws(() => protocol.parseGmailPubSubEnvelope({ ...goodEnvelope, message: { ...goodEnvelope.message, data: encoded({ emailAddress: "valid@example.com", historyId: true }) } }, goodEnvelope.subscription), /gmail_push_history_id_invalid/);
const parseHistory = (historyId, messageId) => protocol.parseGmailPubSubEnvelope({
  subscription: goodEnvelope.subscription,
  message: { messageId, data: encoded({ emailAddress: "valid@example.com", historyId }) },
}, goodEnvelope.subscription).notification.historyId;
assert.equal(parseHistory("17643800", "history-string"), "17643800", "decimal string historyId is accepted");
assert.equal(parseHistory(17643800, "history-number"), "17643800", "safe numeric historyId is normalized to a string");
assert.throws(() => parseHistory(Number.MAX_SAFE_INTEGER + 1, "history-unsafe"), /gmail_push_history_id_invalid/);
assert.throws(() => parseHistory(17643800.5, "history-fractional"), /gmail_push_history_id_invalid/);
assert.throws(() => parseHistory(-1, "history-negative"), /gmail_push_history_id_invalid/);

const configEnv = {
  GOOGLE_CLOUD_PROJECT_ID: "test-project",
  GMAIL_PUBSUB_TOPIC: "projects/test-project/topics/auterim-gmail",
  GMAIL_PUBSUB_SUBSCRIPTION: goodEnvelope.subscription,
  GMAIL_PUBSUB_PUSH_AUDIENCE: "https://app.auterim.com/api/connectors/gmail/push",
  GMAIL_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL: "gmail-push@test-project.iam.gserviceaccount.com",
};
assert.deepEqual(protocol.readGmailPushConfig(configEnv), {
  projectId: "test-project",
  topic: configEnv.GMAIL_PUBSUB_TOPIC,
  subscription: configEnv.GMAIL_PUBSUB_SUBSCRIPTION,
  audience: configEnv.GMAIL_PUBSUB_PUSH_AUDIENCE,
  serviceAccountEmail: configEnv.GMAIL_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL,
});
assert.throws(() => protocol.readGmailPushConfig({ ...configEnv, GMAIL_PUBSUB_TOPIC: "projects/other/topics/auterim-gmail" }), /gmail_push_project_mismatch/);
assert.equal(protocol.findUniqueWorkspaceForGmailAccount("founder@example.com", [
  { workspace_id: "ws-1", provider_email: "Founder@Example.com" },
  { workspace_id: "ws-2", provider_email: "other@example.com" },
]), "ws-1");
assert.equal(protocol.findUniqueWorkspaceForGmailAccount("founder@example.com", [
  { workspace_id: "ws-1", provider_email: "founder@example.com" },
  { workspace_id: "ws-2", provider_email: "Founder@Example.com" },
]), null, "ambiguous account mappings fail closed");
assert.equal(protocol.findUniqueWorkspaceForGmailAccount("founder@example.com", [
  { workspace_id: "ws-1", provider_email: "founderXexample.com" },
]), null, "account matching is exact, not wildcard-based");

const claimsConfig = { audience: configEnv.GMAIL_PUBSUB_PUSH_AUDIENCE, serviceAccountEmail: configEnv.GMAIL_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL };
const validClaims = { iss: "https://accounts.google.com", aud: claimsConfig.audience, email: claimsConfig.serviceAccountEmail, email_verified: true, exp: 1100, iat: 900 };
assert.equal(protocol.validatePubSubIdentityClaims(validClaims, claimsConfig, 1000), true);
assert.equal(protocol.validatePubSubIdentityClaims({ ...validClaims, email: "attacker@example.com" }, claimsConfig, 1000), false);
assert.equal(protocol.validatePubSubIdentityClaims({ ...validClaims, aud: "https://wrong.example" }, claimsConfig, 1000), false);
assert.equal(protocol.validatePubSubIdentityClaims({ ...validClaims, email_verified: false }, claimsConfig, 1000), false);
assert.equal(protocol.validatePubSubIdentityClaims({ ...validClaims, exp: 999 }, claimsConfig, 1000), false);

let pageCount = 0;
const range = await history.collectGmailHistoryRange({
  startHistoryId: "100",
  listPage: async (token) => {
    pageCount += 1;
    return token
      ? { historyId: "120", history: [{ labelsAdded: [{ message: { id: "inbox-returned" }, labelIds: ["INBOX"] }] }] }
      : { historyId: "110", nextPageToken: "next", history: [
        { messagesAdded: [{ message: { id: "message-1" } }, { message: { id: "message-1" } }] },
        { labelsAdded: [{ message: { id: "non-inbox" }, labelIds: ["STARRED"] }] },
      ] };
  },
});
assert.equal(pageCount, 2, "history pagination is followed");
assert.equal(range.latestHistoryId, "120");
assert.deepEqual(range.messageIds.sort(), ["inbox-returned", "message-1"], "duplicate history IDs collapse and only Inbox label additions are selected");
assert.equal(history.compareGmailHistoryIds("10000000000000000001", "10000000000000000000"), 1, "large history IDs compare numerically");

let processed = 0;
let advanced = 0;
const currentInboxMessage = { id: "message-1", labelIds: ["INBOX"], from: "lead@example.com", fromEmail: "lead@example.com", to: "founder@example.com", subject: "Pricing", date: "today", snippet: "pricing" };
const synced = await history.syncGmailHistoryEvent({
  checkpointHistoryId: "100", notificationHistoryId: "120",
  listPage: async () => ({ historyId: "120", history: [{ messagesAdded: [{ message: { id: "message-1" } }] }] }),
  getMessage: async () => currentInboxMessage,
  processMessages: async (messages) => { processed += messages.length; return true; },
  reconcileRecent: async () => true,
  getCurrentHistoryId: async () => "120",
  advanceCheckpoint: async (before, after) => { assert.equal(before, "100"); assert.equal(after, "120"); advanced += 1; return true; },
});
assert.equal(synced.status, "synced");
assert.equal(processed, 1);
assert.equal(advanced, 1);
let duplicateRead = false;
const duplicate = await history.syncGmailHistoryEvent({
  checkpointHistoryId: "120", notificationHistoryId: "119",
  listPage: async () => { duplicateRead = true; return {}; },
  getMessage: async () => null, processMessages: async () => true, reconcileRecent: async () => true,
  getCurrentHistoryId: async () => "120", advanceCheckpoint: async () => true,
});
assert.equal(duplicate.status, "duplicate");
assert.equal(duplicateRead, false, "duplicate and out-of-order events skip Gmail history reads");

const callOrder = [];
const recovered = await history.syncGmailHistoryEvent({
  checkpointHistoryId: "5", notificationHistoryId: "9",
  listPage: async () => { throw Object.assign(new Error("not found"), { status: 404 }); },
  getMessage: async () => null,
  processMessages: async () => true,
  reconcileRecent: async () => { callOrder.push("reconcile"); return true; },
  getCurrentHistoryId: async () => { callOrder.push("baseline"); return "10"; },
  advanceCheckpoint: async (before, after) => { callOrder.push("checkpoint"); assert.equal(before, "5"); assert.equal(after, "10"); return true; },
});
assert.equal(recovered.status, "recovered");
assert.deepEqual(callOrder, ["baseline", "reconcile", "checkpoint"], "expired history takes baseline before reconciliation and checkpoints only after success");
const recoveredBatches = [];
let recoveryPages = 0;
const fullRecentRecovery = await history.reconcileRecentGmailInbox({
  listPage: async (token) => {
    recoveryPages += 1;
    return token
      ? { messages: [{ id: "message-2" }, { id: "message-1" }] }
      : { messages: [{ id: "message-1" }, { id: "message-archive" }], nextPageToken: "page-2" };
  },
  getMessage: async (id) => id === "message-archive" ? { ...currentInboxMessage, id, labelIds: ["ARCHIVE"] } : { ...currentInboxMessage, id },
  processMessages: async (messages) => { recoveredBatches.push(messages.map((message) => message.id)); return true; },
  batchSize: 1,
});
assert.equal(recoveryPages, 2);
assert.equal(fullRecentRecovery.messagesProcessed, 2, "expired history fallback enumerates all pages, dedupes message IDs, and processes only current Inbox messages");
assert.deepEqual(recoveredBatches, [["message-1"], ["message-2"]]);
await assert.rejects(() => history.syncGmailHistoryEvent({
  checkpointHistoryId: "5", notificationHistoryId: "9", listPage: async () => ({ historyId: "9", history: [{ messagesAdded: [{ message: { id: "message-1" } }] }] }),
  getMessage: async () => currentInboxMessage, processMessages: async () => false, reconcileRecent: async () => true,
  getCurrentHistoryId: async () => "9", advanceCheckpoint: async () => { throw new Error("must not advance"); },
}), /gmail_revenue_processing_failed/);

const gmailSource = fs.readFileSync("src/lib/connectors/gmail.ts", "utf8");
const gmailMonitoring = fs.readFileSync("src/lib/connectors/gmail-monitoring.ts", "utf8");
const scanner = fs.readFileSync("src/lib/operators/revenue/scan.ts", "utf8");
const taskSource = fs.readFileSync("src/trigger/gmail-push-process.ts", "utf8");
const webhook = fs.readFileSync("src/app/api/connectors/gmail/push/route.ts", "utf8");
const renewal = fs.readFileSync("src/trigger/gmail-watch-renewal.ts", "utf8");
const statusRoute = fs.readFileSync("src/app/api/operators/revenue/status/route.ts", "utf8");
const revenuePage = fs.readFileSync("src/app/app/agents/revenue/page.tsx", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260913_gmail_push_monitoring.sql", "utf8");
assert.match(gmailSource, /labelIds:\s*\["INBOX"\]/);
assert.match(gmailSource, /labelFilterBehavior:\s*"INCLUDE"/);
assert.match(gmailSource, /export async function getStoredGmailCredential/);
assert.match(gmailMonitoring, /findUniqueWorkspaceForGmailAccount/);
assert.doesNotMatch(gmailMonitoring, /from\("os_connector_credentials"\)[\s\S]*?\.update\(\{\s*status:/);
assert.match(taskSource, /scanRevenueOpportunities\(\{ workspaceId, sourceMode: "push"/);
assert.match(scanner, /input\.gmailMessages\s*\?/);
assert.match(scanner, /sourceMode !== "push"/);
assert.match(webhook, /verifyPubSubPushAuthorization/);
assert.match(webhook, /idempotencyKeyTTL:\s*"30d"/);
assert.match(webhook, /concurrencyKey:/);
assert.match(taskSource, /claimSignalSyncLease/);
assert.match(migration, /persist_gmail_history_checkpoint/);
assert.match(migration, /p_next_history_id::numeric >=/);
assert.match(renewal, /id:\s*"gmail-watch-renewal"/);
assert.match(renewal, /pattern:\s*"20 3 \* \* \*"/);
assert.match(renewal, /ensureGmailWatch/);
assert.match(statusRoute, /watchExpiresAt/);
assert.match(revenuePage, /Last Gmail event/);
assert.match(revenuePage, /Hourly fallback/);
assert.doesNotMatch(taskSource, /sendGmailMessage|sendGmailDraft|createGmailDraft/);
assert.match(fs.readFileSync("src/app/api/connectors/gmail/callback/route.ts", "utf8"), /credentialSave\.error/);
assert.match(fs.readFileSync("src/app/api/connectors/gmail/callback/route.ts", "utf8"), /watchResult && !watchResult\.ok/);
assert.match(fs.readFileSync("src/lib/operators/revenue/workflow.ts", "utf8"), /approval/);

console.log("Gmail push monitoring smoke: authenticated-contract helpers, payload mapping, Inbox filtering, paginated/deduplicated history, checkpoint recovery, canonical Revenue routing, watch renewal, status UI, and no-auto-send guard verified.");
