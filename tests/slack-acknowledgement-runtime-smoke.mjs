import assert from "node:assert/strict";
import {
  composeSlackReply,
  detectSlackMessageLanguage,
  normalizeSlackReplyLanguage,
} from "../src/lib/connectors/slack-acknowledgement-copy.ts";

assert.equal(detectSlackMessageLanguage("Please prepare the pricing quote and next action this week."), "en");
assert.equal(detectSlackMessageLanguage("Graag een offerte voorbereiden voor de volgende stap."), "nl");
assert.equal(normalizeSlackReplyLanguage("nl-NL"), "nl");
assert.equal(normalizeSlackReplyLanguage("en-US"), "en");

const english = composeSlackReply({ state: "approval_required", language: "en", operatorName: "Revenue Operator", intentLabel: "pricing opportunity", confidence: "high", approvalUrl: "https://app.auterim.com/app/approvals#approval-review-a1" });
assert.match(english, /Revenue Operator/);
assert.match(english, /awaiting human approval/);
assert.match(english, /No external action has been taken/);
assert.doesNotMatch(english, /sent|executed/i);

const dutch = composeSlackReply({ state: "workflow_created", language: "nl", operatorName: "Revenue Operator", intentLabel: "pricing opportunity", confidence: "high", workflowUrl: "https://app.auterim.com/app/workflows#workflow-w1" });
assert.match(dutch, /doorgestuurd/);
assert.match(dutch, /werkitem/);
assert.match(dutch, /app\.auterim\.com/);

assert.match(composeSlackReply({ state: "non_actionable", language: "en" }), /couldn’t identify actionable work/);
assert.match(composeSlackReply({ state: "processing_failure", language: "nl" }), /bewaard voor een nieuwe poging/);

console.log("Slack acknowledgement copy runtime smoke passed.");
