import { z } from "zod";

/**
 * The strict, validated shape an internal recommendation generator (OpenAI
 * or the deterministic fallback) must produce. Mirrors the house convention
 * already used for LLM output (see src/lib/agents/proposal-angle/schema.ts):
 * a Zod schema is the single source of truth for both the runtime TS type
 * and application-level validation via .safeParse().
 */
export const RECOMMENDATION_BOUNDS = {
  problemSummaryMax: 300,
  recommendedNextStepMax: 600,
  rationaleMax: 300,
  missingInformationMaxItems: 5,
  missingInformationItemMax: 160,
  evidenceRefsMaxItems: 20,
  evidenceRefItemMax: 160,
} as const;

export const GeneratedInternalRecommendationSchema = z.object({
  language: z.enum(["en", "nl"]),
  operatorKey: z.string().min(1).max(80),
  primaryIntent: z.string().min(1).max(80),
  problemSummary: z.string().min(1).max(RECOMMENDATION_BOUNDS.problemSummaryMax),
  recommendedNextStep: z.string().min(1).max(RECOMMENDATION_BOUNDS.recommendedNextStepMax),
  rationale: z.string().min(1).max(RECOMMENDATION_BOUNDS.rationaleMax),
  missingInformation: z.array(z.string().max(RECOMMENDATION_BOUNDS.missingInformationItemMax)).max(RECOMMENDATION_BOUNDS.missingInformationMaxItems),
  evidenceRefs: z.array(z.string().max(RECOMMENDATION_BOUNDS.evidenceRefItemMax)).max(RECOMMENDATION_BOUNDS.evidenceRefsMaxItems),
  approvalRequiredForNextAction: z.literal(true),
  externalActionTaken: z.literal(false),
}).strict();

export type GeneratedInternalRecommendation = z.infer<typeof GeneratedInternalRecommendationSchema>;

/**
 * The raw JSON Schema handed to OpenAI's Structured Outputs (`text.format`,
 * `strict: true`). Hand-written rather than derived from the Zod schema
 * above: OpenAI's strict mode only supports a bounded subset of JSON
 * Schema, and this is small and stable enough that an explicit, reviewable
 * object is safer than trusting an automatic zod-to-json-schema conversion
 * to stay within that subset. The two schemas describe the same shape by
 * construction; recommendation-generator.ts validates the parsed response
 * against the Zod schema regardless; keep them synchronized in review.
 */
export const GENERATED_RECOMMENDATION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    language: { type: "string", enum: ["en", "nl"] },
    operatorKey: { type: "string", minLength: 1, maxLength: 80 },
    primaryIntent: { type: "string", minLength: 1, maxLength: 80 },
    problemSummary: { type: "string", minLength: 1, maxLength: RECOMMENDATION_BOUNDS.problemSummaryMax },
    recommendedNextStep: { type: "string", minLength: 1, maxLength: RECOMMENDATION_BOUNDS.recommendedNextStepMax },
    rationale: { type: "string", minLength: 1, maxLength: RECOMMENDATION_BOUNDS.rationaleMax },
    missingInformation: {
      type: "array",
      items: { type: "string", maxLength: RECOMMENDATION_BOUNDS.missingInformationItemMax },
      maxItems: RECOMMENDATION_BOUNDS.missingInformationMaxItems,
    },
    evidenceRefs: {
      type: "array",
      items: { type: "string", maxLength: RECOMMENDATION_BOUNDS.evidenceRefItemMax },
      maxItems: RECOMMENDATION_BOUNDS.evidenceRefsMaxItems,
    },
    // Booleans are intentionally not constrained by enum here - OpenAI
    // strict mode's boolean support is limited to plain {type:"boolean"}.
    // The true policy invariant is enforced in application code regardless
    // of what the model returns (see recommendation-generator.ts).
    approvalRequiredForNextAction: { type: "boolean" },
    externalActionTaken: { type: "boolean" },
  },
  required: [
    "language",
    "operatorKey",
    "primaryIntent",
    "problemSummary",
    "recommendedNextStep",
    "rationale",
    "missingInformation",
    "evidenceRefs",
    "approvalRequiredForNextAction",
    "externalActionTaken",
  ],
} as const;

export type InternalRecommendationSource = {
  provider: string;
  channelId: string | null;
  messageTs: string | null;
  threadTs: string | null;
};

/**
 * The durable artifact persisted at os_workflow_runs.result_evidence
 * .internalRecommendation. Extends GeneratedInternalRecommendation with
 * bounded provenance (which generator produced it, model, prompt version,
 * OpenAI response id, fallback reason) plus the pre-existing correlation
 * fields (intentLabel, reasonCodes, confidence, source) that
 * slack-acknowledgement.ts and any future reader already depend on.
 */
export type PersistedInternalRecommendation = GeneratedInternalRecommendation & {
  version: 2;
  intentLabel: string;
  reasonCodes: string[];
  confidence: "low" | "medium" | "high" | null;
  source: InternalRecommendationSource;
  generator: "openai" | "deterministic_fallback";
  model: string | null;
  promptVersion: string;
  responseId: string | null;
  fallbackReason: string | null;
  generatedAt: string;
  usage?: { inputTokens: number | null; outputTokens: number | null };
};
