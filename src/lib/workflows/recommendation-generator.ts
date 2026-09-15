import "server-only";

import { buildRevenueInternalRecommendation } from "@/lib/workflows/recommendation";
import {
  GeneratedInternalRecommendationSchema,
  RECOMMENDATION_BOUNDS,
  type GeneratedInternalRecommendation,
  type InternalRecommendationSource,
  type PersistedInternalRecommendation,
} from "@/lib/workflows/recommendation-schema";

export type InternalRecommendationInput = {
  workspaceId: string;
  operatorKey: string;
  operatorDisplayName: string;
  primaryIntent: string;
  problemSummary: string;
  /** Slack mention markup already stripped, bounded to a few hundred
   * characters - never the full channel history, never unrelated content. */
  sourceMessage: string;
  seatCount: number | null;
  confidence: "low" | "medium" | "high" | null;
  reasonCodes: string[];
  /** The exact, closed set of reference strings a generator is allowed to
   * echo back in evidenceRefs. Nothing outside this set is legitimate. */
  evidenceRefs: string[];
  language: "en" | "nl";
  source: InternalRecommendationSource;
};

export type RecommendationProvenance = {
  generator: "openai" | "deterministic_fallback";
  model: string | null;
  promptVersion: string;
  responseId: string | null;
  fallbackReason: string | null;
  usage?: { inputTokens: number | null; outputTokens: number | null };
};

export type InternalRecommendationGenerationResult =
  | { ok: true; recommendation: GeneratedInternalRecommendation; provenance: Omit<RecommendationProvenance, "fallbackReason"> }
  | { ok: false; reason: string };

export interface InternalRecommendationGenerator {
  generate(input: InternalRecommendationInput): Promise<InternalRecommendationGenerationResult>;
}

/** Language priority: detected message language -> workspace preference -> English. */
export function resolveRecommendationLanguage(input: { detectedLanguage: "en" | "nl" | null; workspacePreference: "en" | "nl" | null }): "en" | "nl" {
  return input.detectedLanguage ?? input.workspacePreference ?? "en";
}

const COMPLETED_ACTION_PATTERNS: RegExp[] = [
  /\b(i |we )?(have |has )?(already )?sent\b/i,
  /\bemail (was|has been|is) sent\b/i,
  /\bhubspot (was|has been|is) updated\b/i,
  /\b(quote|proposal) (has been|was|is) (created|sent|prepared and sent)\b/i,
  /\bcustomer (was|has been) contacted\b/i,
  /\b(this|it) (has been|was|is) approved\b/i,
  /\balready (approved|sent|created|executed|updated|contacted)\b/i,
  /\btask (was|has been) created\b/i,
  /\bjira (issue|ticket) (was|has been) created\b/i,
];

const PRICE_OR_DISCOUNT_PATTERN = /[$\u20AC\u00A3]\s?\d|\b\d+(?:[.,]\d+)?\s?(?:usd|eur|gbp|dollars?|euros?)\b|\b\d+%\s*(?:off|discount|korting)\b/i;
const DEADLINE_PATTERN = /\b(?:by|before|voor)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;
const SECRET_LIKE_PATTERN = /\bapi[_-]?key\b|\bsk-[a-zA-Z0-9]{10,}\b|\bbearer\s+[a-zA-Z0-9._-]{10,}\b|\bpassword\s*[:=]/i;
const PLAN_CLAIM_PATTERN = /\b(?:foundation|workforce|scale|starter|growth|professional|business|enterprise|team|pro)\s+(?:plan|tier)\b/i;

function textContains(haystack: string, pattern: RegExp): boolean {
  return pattern.test(haystack);
}

/**
 * Application-level truthfulness and policy validation. This runs
 * regardless of what OpenAI's Structured Outputs already enforced - schema
 * shape alone is never treated as sufficient. Every check here is
 * deterministic and evidence-bounded: nothing is trusted from the model
 * that cannot be traced back to input.evidenceRefs/sourceMessage/problemSummary.
 */
export function validateGeneratedRecommendation(raw: unknown, input: InternalRecommendationInput): { ok: true; recommendation: GeneratedInternalRecommendation } | { ok: false; reason: string } {
  const parsed = GeneratedInternalRecommendationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "schema_validation_failed" };
  const recommendation = parsed.data;

  if (recommendation.language !== input.language) return { ok: false, reason: "language_mismatch" };
  if (recommendation.operatorKey !== input.operatorKey) return { ok: false, reason: "operator_mismatch" };
  if (recommendation.primaryIntent !== input.primaryIntent) return { ok: false, reason: "intent_mismatch" };
  if (recommendation.approvalRequiredForNextAction !== true) return { ok: false, reason: "approval_bypass_claimed" };
  if (recommendation.externalActionTaken !== false) return { ok: false, reason: "external_action_claimed" };

  const allowedEvidence = new Set(input.evidenceRefs);
  if (!recommendation.evidenceRefs.every((ref) => allowedEvidence.has(ref))) return { ok: false, reason: "evidence_ref_not_supplied" };

  const combinedText = `${recommendation.problemSummary}\n${recommendation.recommendedNextStep}\n${recommendation.rationale}\n${recommendation.missingInformation.join("\n")}`;
  if (COMPLETED_ACTION_PATTERNS.some((pattern) => textContains(combinedText, pattern))) return { ok: false, reason: "external_action_claim_in_text" };
  if (SECRET_LIKE_PATTERN.test(combinedText)) return { ok: false, reason: "secret_like_output" };

  // A price/discount or specific deadline is only legitimate if it was
  // already present in the verified source text - otherwise it was invented.
  const sourceHasPrice = PRICE_OR_DISCOUNT_PATTERN.test(input.sourceMessage) || PRICE_OR_DISCOUNT_PATTERN.test(input.problemSummary);
  if (!sourceHasPrice && PRICE_OR_DISCOUNT_PATTERN.test(combinedText)) return { ok: false, reason: "invented_price_or_discount" };
  const sourceHasDeadline = DEADLINE_PATTERN.test(input.sourceMessage) || DEADLINE_PATTERN.test(input.problemSummary);
  if (!sourceHasDeadline && DEADLINE_PATTERN.test(combinedText)) return { ok: false, reason: "invented_deadline" };

  const sourceFacts = `${input.sourceMessage}\n${input.problemSummary}`;
  if (PLAN_CLAIM_PATTERN.test(combinedText) && !PLAN_CLAIM_PATTERN.test(sourceFacts)) return { ok: false, reason: "invented_plan" };

  if (recommendation.recommendedNextStep.trim().length < 20) return { ok: false, reason: "recommendation_not_specific_enough" };

  return { ok: true, recommendation };
}

/**
 * Wraps the existing deterministic template builder (recommendation.ts,
 * unchanged) in the shared InternalRecommendationGenerator contract. This
 * is always available and is the required fallback for every OpenAI failure mode.
 */
export const deterministicRecommendationGenerator: InternalRecommendationGenerator = {
  async generate(input) {
    const artifact = buildRevenueInternalRecommendation({
      candidate: {
        operatorKey: input.operatorKey,
        signalType: "sales_opportunity",
        confidence: input.confidence,
        reasonCodes: input.reasonCodes,
        evidence: { primaryIntent: input.primaryIntent, revenueSignals: [], slackOrigin: input.source },
      },
      signal: { contentPreview: input.sourceMessage },
    });
    if (!artifact) return { ok: false, reason: "deterministic_evidence_unavailable" };
    const recommendedNextStep = artifact.recommendedNextStep[input.language];
    const rationale = input.language === "nl"
      ? "Gebaseerd op de gedetecteerde intentie en het bewijs uit het bericht."
      : "Based on the detected intent and evidence from the message.";
    const recommendation: GeneratedInternalRecommendation = {
      language: input.language,
      operatorKey: input.operatorKey,
      primaryIntent: input.primaryIntent,
      problemSummary: artifact.problemSummary.slice(0, RECOMMENDATION_BOUNDS.problemSummaryMax),
      recommendedNextStep: recommendedNextStep.slice(0, RECOMMENDATION_BOUNDS.recommendedNextStepMax),
      rationale: rationale.slice(0, RECOMMENDATION_BOUNDS.rationaleMax),
      missingInformation: [],
      evidenceRefs: artifact.evidenceRefs.slice(0, RECOMMENDATION_BOUNDS.evidenceRefsMaxItems),
      approvalRequiredForNextAction: true,
      externalActionTaken: false,
    };
    return { ok: true, recommendation, provenance: { generator: "deterministic_fallback", model: null, promptVersion: "deterministic-v1", responseId: null } };
  },
};

/**
 * Resolves and calls the configured generator, always falling back to the
 * deterministic builder on any failure - missing config, disabled flag,
 * timeout, rate limit, refusal, invalid structured output, or failed
 * application-level validation. Returns null only when even the deterministic
 * fallback cannot produce a substantive artifact.
 */
export async function generateInternalRecommendation(input: InternalRecommendationInput): Promise<{ recommendation: GeneratedInternalRecommendation; provenance: RecommendationProvenance } | null> {
  const featureEnabled = process.env.OPENAI_RECOMMENDATIONS_ENABLED === "true";
  const apiKeyPresent = Boolean(process.env.OPENAI_API_KEY?.trim());
  const openAIEnabled = featureEnabled && apiKeyPresent;
  let fallbackReason: string | null = !featureEnabled
    ? "openai_recommendations_disabled"
    : !apiKeyPresent
      ? "openai_api_key_missing"
      : null;

  if (openAIEnabled) {
    // Deferred import keeps the OpenAI SDK out of callers that never need it
    // and ensures missing configuration never breaks ingestion.
    try {
      const { openAIRecommendationGenerator } = await import("@/lib/workflows/openai-recommendation-generator");
      const result = await openAIRecommendationGenerator.generate(input);
      if (result.ok) return { recommendation: result.recommendation, provenance: { ...result.provenance, fallbackReason: null } };
      fallbackReason = result.reason;
    } catch {
      // Optional AI infrastructure must never break the durable workflow.
      fallbackReason = "openai_generator_failed";
    }
  }

  const fallback = await deterministicRecommendationGenerator.generate(input);
  if (!fallback.ok) return null;
  return { recommendation: fallback.recommendation, provenance: { ...fallback.provenance, fallbackReason } };
}

export type { PersistedInternalRecommendation, InternalRecommendationSource };
