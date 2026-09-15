import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ack = read("src/lib/connectors/slack-acknowledgement.ts");
const copy = read("src/lib/connectors/slack-acknowledgement-copy.ts");
const ledger = read("supabase/migrations/20260915_slack_thread_updates.sql");
const process = read("src/trigger/slack-event-process.ts");
const lifecycle = read("src/lib/workflows/lifecycle.ts");
const webhook = read("src/app/api/connectors/slack/events/route.ts");
const signalEngine = read("src/lib/signals/engine.ts");
const workflowEngine = read("src/lib/workflows/engine.ts");
const signalStore = read("src/lib/signals/store.ts");

assert.match(ledger, /os_slack_thread_updates/);
assert.match(ledger, /unique \(workspace_id, channel_id, source_message_ts, update_type\)/);
assert.match(ledger, /claim_os_slack_thread_update/);
assert.match(ack, /workspaceId\}:slack:\$\{input\.channelId\}:\$\{input\.messageTs\}:\$\{input\.updateType\}/);
assert.match(ack, /chat\.postMessage/);
assert.match(ack, /thread_ts: threadTs/);
assert.match(ack, /unfurl_links: false/);
assert.match(ack, /unfurl_media: false/);
assert.match(ack, /slack\.acknowledgement_sent/);
assert.match(ack, /lastAcknowledgementAt/);
assert.match(ack, /lastAcknowledgedMessageTs/);
assert.match(ack, /lastAcknowledgementStatus/);
assert.match(ack, /details\.status === 429/);
assert.doesNotMatch(ack, /sendSlackApprovalNotification/);
assert.match(ack, /threadTs = text\(metadata\.threadTs, 80\) \?\? messageTs/);
assert.match(process, /slackAppMentioned/);
assert.match(process, /slackOrigin/);
assert.match(process, /dispatchMentionAcknowledgement/);
assert.match(webhook, /slackEventProcess\.trigger/);
assert.doesNotMatch(webhook, /chat\.postMessage|sendSlack/);
assert.match(lifecycle, /approval_requested/);
assert.match(lifecycle, /execution_succeeded/);
assert.match(lifecycle, /triggerSlackLifecycleUpdate/);
assert.match(copy, /Revenue Operator/);
assert.match(copy, /Client Flow Operator/);
assert.match(copy, /Operations Operator/);
assert.match(copy, /Support Operator/);
assert.match(copy, /No external action has been taken/);
assert.match(copy, /Er is nog geen externe actie uitgevoerd/);
assert.match(signalEngine, /stripSlackMentionMarkup/);

// Decoupling: acknowledgement dispatch must be unconditional on isMention,
// not nested inside any workflow/candidate-materialization branch. Assert
// the dispatch call sits directly in the `if (isMention)` block together
// with the message-pair correlation update, and never inside a conditional
// on `result.workflowCandidates`/`candidates.length`/similar.
const mentionBlockMatch = process.match(/if \(isMention\) \{[\s\S]*?\n {6}\}/);
assert.ok(mentionBlockMatch, "an unconditional isMention block must exist");
assert.match(mentionBlockMatch[0], /dispatchMentionAcknowledgement/);
assert.doesNotMatch(mentionBlockMatch[0], /workflowCandidates|candidatesProduced/, "acknowledgement dispatch must not be gated on workflow/candidate materialization results");
// Only the direct app_mentioned delivery ever calls dispatch - the passive
// message.channels delivery (isMention === false) never reaches it, so a
// message.channels + app_mention pair produces exactly one claim.
assert.match(process, /const isMention = event\.event_type === "slack\.app_mentioned"/);
assert.match(process, /await dispatchMentionAcknowledgement\(event\.id\)/);
// Idempotency: the Trigger dispatch itself is deduped per provider event,
// and the DB claim is deduped per (workspace, channel, message, updateType)
// - together these guarantee retries and message-pair races reduce to one
// claimed row and one reply, never two.
assert.match(process, /idempotencyKeys\.create\(`slack-acknowledgement:\$\{providerEventId\}`/);
assert.match(ledger, /on conflict \(dedupe_key\) do nothing/);
assert.match(ledger, /current_row\.status = 'processing' and current_row\.lease_until is not null/);

// Explicit direct-mention instruction elevation must exist and stay scoped
// to app mentions, never to passive channel chatter or to email/Microsoft.
assert.match(signalEngine, /hasExplicitSlackInstruction/);
assert.match(signalEngine, /event\.metadata\?\.slackAppMentioned === true/);
assert.match(signalEngine, /event\.eventType === "slack\.app_mentioned"/);
assert.match(signalEngine, /export function isDirectSlackMention/);
assert.match(signalEngine, /slack:explicit_instruction/);
assert.match(signalStore, /persistCanonicalSignal/);
assert.match(signalStore, /event_type: identity && mention \? "slack\.app_mentioned"/);
assert.match(signalStore, /slackAppMentioned: mention/);
assert.match(signalStore, /persistCandidateMonotonic/);
assert.match(signalStore, /Math\.max\(candidatePriority\(existing\?\.priority\)/);
assert.match(signalStore, /new Set\(\[/);
assert.match(signalEngine, /metadata\.teamId/);
assert.match(signalEngine, /metadata\.channelId/);
assert.match(signalEngine, /metadata\.messageTs/);

// The Slack-sourced revenue candidate must get its own internal-task
// template and must never fall through to the email follow-up template
// (which would target a Slack message timestamp as an email address).
assert.match(workflowEngine, /candidate\.source === "slack"/);
assert.match(workflowEngine, /"Prepare recommended next step for Slack request"/);
assert.match(workflowEngine, /candidate\.source !== "slack"/, "the pre-existing email follow-up template must explicitly exclude Slack-sourced candidates");

// loadFacts must distinguish a genuinely-persisted internal recommendation
// from connector-executed completion, and must never read the recommendation
// text from anywhere but durable evidence (result_evidence).
assert.match(ack, /result_evidence/, "the workflow query must select the durable result_evidence column");
assert.match(ack, /internalRecommendationStep/);
assert.match(ack, /internalRecommendationStep\.status === "completed" && recommendedNextStepText/, "recommendation_ready must require both a completed step AND actual persisted text");
assert.match(ack, /\["blocked", "failed", "rejected", "skipped"\]\.includes\(String\(internalRecommendationStep\.status\)\)/, "a blocked/failed internal step must never read as in-progress preparation");
assert.doesNotMatch(ack.slice(ack.indexOf("internalRecommendationStep = "), ack.indexOf("internalRecommendationStep = ") + 1200), /execution_succeeded/, "an internal recommendation must never be reported through the execution_succeeded connector-completion path");

console.log("Slack acknowledgement smoke contracts passed.");
