import assert from "node:assert/strict";
import { buildRevenueInternalRecommendation } from "../src/lib/workflows/recommendation.ts";

const baseCandidate = {
  operatorKey: "revenue",
  signalType: "sales_opportunity",
  confidence: "high",
  reasonCodes: ["term:pricing", "signal:seat_count"],
  evidence: {
    primaryIntent: "PRICING_REQUEST",
    revenueSignals: ["pricing", "seat_count"],
    slackOrigin: { teamId: "T-AUTERIM", channelId: "C05LD12LR5H", messageTs: "1789489622.919069", threadTs: null },
  },
};
const baseSignal = { contentPreview: "We have a high-intent 50-seat prospect requesting pricing. Please prepare the recommended next step." };

// Substantive output for the exact reported production message.
const artifact = buildRevenueInternalRecommendation({ candidate: baseCandidate, signal: baseSignal, now: "2026-09-15T16:30:00.000Z" });
assert.ok(artifact, "a recommendation must be produced when evidence is present");
assert.equal(artifact.operatorKey, "revenue", "owning Operator must be present");
assert.equal(artifact.primaryIntent, "PRICING_REQUEST", "detected intent must be present");
assert.equal(artifact.intentLabel, "pricing opportunity");
assert.ok(artifact.problemSummary.length > 0, "detected problem must be present");
assert.equal(
  artifact.recommendedNextStep.en,
  "Review the prospect's 50-seat scope, prepare the applicable pricing and onboarding options, and route any customer-facing response for approval.",
  "the exact bounded recommendation for this exact message"
);
assert.ok(artifact.reasonCodes.length > 0, "reason/evidence references must be present");
assert.ok(artifact.evidenceRefs.length > 0);
assert.equal(artifact.approvalRequiredForNextAction, true, "must explicitly state approval is required for any subsequent action");
assert.equal(artifact.externalActionTaken, false, "must explicitly state no external action has occurred");
assert.deepEqual(artifact.source, { provider: "slack", channelId: "C05LD12LR5H", messageTs: "1789489622.919069", threadTs: null }, "source Slack thread correlation must be present");

// No invented pricing, customer identity, deadlines, or completed actions.
const allEnglishText = `${artifact.problemSummary} ${artifact.recommendedNextStep.en}`;
assert.doesNotMatch(allEnglishText, /\$\d|\bUSD\b|\beuro?s?\b\s*\d/i, "no invented price must appear");
assert.doesNotMatch(allEnglishText, /\bsent\b|\bcreated\b|\bsigned\b|\bclosed\b/i, "no completed-action language must appear");
assert.doesNotMatch(allEnglishText, /\bby (monday|tuesday|wednesday|thursday|friday|\d{1,2}\/\d{1,2})\b/i, "no invented deadline must appear");

// Dutch equivalent.
assert.equal(
  artifact.recommendedNextStep.nl,
  "Bekijk de omvang van de prospect (50 stoelen), bereid de toepasselijke prijzen en onboardingopties voor, en stuur elke klantgerichte reactie door voor goedkeuring.",
  "the exact bounded Dutch recommendation for this exact message"
);

// A prospect mention without an explicit seat count must never fabricate one.
const noSeatCount = buildRevenueInternalRecommendation({
  candidate: baseCandidate,
  signal: { contentPreview: "A prospect is asking about pricing for our platform. Please prepare the recommended next step." },
});
assert.equal(noSeatCount?.recommendedNextStep.en, "Review the prospect's stated scope, prepare the applicable pricing and onboarding options, and route any customer-facing response for approval.");
assert.doesNotMatch(noSeatCount?.recommendedNextStep.en ?? "", /\d/, "no fabricated number may appear when none was stated");

// Empty/insufficient evidence must never produce an artifact - callers must
// treat null as "not ready", never mark anything completed on it.
assert.equal(buildRevenueInternalRecommendation({ candidate: { ...baseCandidate, evidence: {} }, signal: baseSignal }), null, "missing primaryIntent must fail closed");
assert.equal(buildRevenueInternalRecommendation({ candidate: { ...baseCandidate, evidence: { primaryIntent: "PRICING_REQUEST" } }, signal: baseSignal }), null, "missing Slack thread correlation must fail closed");

// Missing message content still yields a genuinely substantive (if less
// specific) recommendation, since intent and Slack correlation are enough -
// it must never be empty, and must never fabricate a scope it wasn't told.
const noSignal = buildRevenueInternalRecommendation({ candidate: baseCandidate, signal: null });
assert.ok(noSignal, "candidate + Slack correlation evidence alone is sufficient to prepare a recommendation");
assert.ok(noSignal.recommendedNextStep.en.length > 0);
assert.doesNotMatch(noSignal.recommendedNextStep.en, /\d/, "no fabricated scope number without source text");

console.log("Internal recommendation runtime smoke: substantive bounded output, English/Dutch equivalence, no invented pricing/deadlines/execution claims, and fail-closed empty evidence verified.");
