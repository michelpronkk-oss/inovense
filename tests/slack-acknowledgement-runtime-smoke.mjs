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

// State A (routed, no workflow yet) must never overstate persisted state -
// only classification and routing are true facts at this point.
const routedEn = composeSlackReply({ state: "routed", language: "en", operatorName: "Revenue Operator", intentLabel: "pricing opportunity", confidence: "high" });
assert.match(routedEn, /Revenue Operator/);
assert.match(routedEn, /No external action has been taken/);
assert.doesNotMatch(routedEn, /being prepared|created a work item|preparing/i, "a routed-only candidate must not claim that preparation has started");

const routedNl = composeSlackReply({ state: "routed", language: "nl", operatorName: "Revenue Operator", intentLabel: "pricing opportunity", confidence: "high" });
assert.match(routedNl, /doorgestuurd/);
assert.match(routedNl, /Er is nog geen externe actie uitgevoerd/);
assert.doesNotMatch(routedNl, /wordt voorbereid|werkitem.*aangemaakt/i, "the Dutch routed-only reply must not claim that preparation has started");

// State B (workflow exists) is the only state allowed to say preparation
// has started, and it must say so.
const workflowCreatedEn = composeSlackReply({ state: "workflow_created", language: "en", operatorName: "Revenue Operator", intentLabel: "pricing opportunity", confidence: "high" });
assert.match(workflowCreatedEn, /The recommended next step is being prepared/, "workflow_created must state the persisted fact using the exact required phrasing");
assert.match(workflowCreatedEn, /No external action has been taken/);

const workflowCreatedNl = composeSlackReply({ state: "workflow_created", language: "nl", operatorName: "Revenue Operator", intentLabel: "pricing opportunity", confidence: "high" });
assert.match(workflowCreatedNl, /De aanbevolen vervolgstap wordt voorbereid/);
assert.match(workflowCreatedNl, /Er is nog geen externe actie uitgevoerd/);

// State: recommendation completed and durably persisted - the completed
// reply must quote the actual persisted recommendation, not a generic
// "being prepared" placeholder, and must not re-describe classification.
const recommendationText = "Review the prospect's 50-seat scope, prepare the applicable pricing and onboarding options, and route any customer-facing response for approval.";
const recommendationReady = composeSlackReply({ state: "recommendation_ready", language: "en", operatorName: "Revenue Operator", intentLabel: "pricing opportunity", confidence: "high", recommendedNextStepText: recommendationText });
assert.equal(recommendationReady, `Recommended next step: ${recommendationText} No external action has been taken.`, "must match the exact required completed-state wording");

const recommendationReadyNl = composeSlackReply({ state: "recommendation_ready", language: "nl", recommendedNextStepText: "Bekijk de omvang van de prospect (50 stoelen), bereid de toepasselijke prijzen en onboardingopties voor, en stuur elke klantgerichte reactie door voor goedkeuring." });
assert.match(recommendationReadyNl, /^Aanbevolen vervolgstap:/);
assert.match(recommendationReadyNl, /Er is nog geen externe actie uitgevoerd\.$/);

// Without a persisted recommendation, the "recommendation_ready" state must
// never fabricate one - it falls back to the safe, generic phrasing.
const recommendationReadyMissingText = composeSlackReply({ state: "recommendation_ready", language: "en", operatorName: "Revenue Operator", intentLabel: "pricing opportunity" });
assert.doesNotMatch(recommendationReadyMissingText, /^Recommended next step:/, "must never claim a recommendation that was not actually supplied");
assert.match(recommendationReadyMissingText, /No external action has been taken/);

console.log("Slack acknowledgement copy runtime smoke passed.");
