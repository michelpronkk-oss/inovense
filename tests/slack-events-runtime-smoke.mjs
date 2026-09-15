import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { isSlackRequestTimestampFresh, parseSlackEventPayload, verifySlackRequestSignature } from "../src/lib/connectors/slack-events.ts";

const timestamp = String(Math.floor(Date.now() / 1000));
const rawBody = JSON.stringify({ type: "url_verification", challenge: "challenge-123" });
const signature = `v0=${createHmac("sha256", "test-signing-secret").update(`v0:${timestamp}:${rawBody}`, "utf8").digest("hex")}`;

assert.equal(isSlackRequestTimestampFresh(timestamp), true);
assert.equal(isSlackRequestTimestampFresh(String(Number(timestamp) - 301)), false);
assert.equal(verifySlackRequestSignature({ rawBody, timestamp, signature, signingSecret: "test-signing-secret" }), true);
assert.equal(verifySlackRequestSignature({ rawBody: `${rawBody} `, timestamp, signature, signingSecret: "test-signing-secret" }), false);
assert.equal(verifySlackRequestSignature({ rawBody, timestamp: String(Number(timestamp) - 301), signature, signingSecret: "test-signing-secret" }), false);

assert.deepEqual(parseSlackEventPayload(rawBody), { kind: "url_verification", payload: { type: "url_verification", challenge: "challenge-123" } });
const mention = parseSlackEventPayload(JSON.stringify({ type: "event_callback", event_id: "Ev-1", team_id: "T-1", event: { type: "app_mention", channel: "C-1", ts: "1.000", user: "U-1", text: "please help with pricing" } }));
assert.equal(mention.eventType, "slack.app_mentioned");
const channelMessage = parseSlackEventPayload(JSON.stringify({ type: "event_callback", event_id: "Ev-2", team_id: "T-1", event: { type: "message", channel_type: "channel", channel: "C-1", ts: "2.000", thread_ts: "1.000", user: "U-1", text: "blocked on the rollout" } }));
assert.equal(channelMessage.eventType, "slack.message.received");
assert.throws(() => parseSlackEventPayload(JSON.stringify({ type: "event_callback", event_id: "Ev-3", team_id: "T-1", event: { type: "message", subtype: "message_changed", channel_type: "channel", channel: "C-1", ts: "3.000", text: "changed" } })), /slack_event_type_unsupported/);

console.log("Slack signature and event parser runtime smoke passed.");
