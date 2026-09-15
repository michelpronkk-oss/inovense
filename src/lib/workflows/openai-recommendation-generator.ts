import "server-only";

import OpenAI from "openai";
import { createHash } from "node:crypto";
import { AI_MAX_RETRIES, AI_REQUEST_TIMEOUT_MS } from "@/lib/runtime/ai-limits";
import { buildRecommendationSystemPrompt, buildRecommendationUserPrompt, RECOMMENDATION_PROMPT_VERSION } from "@/lib/workflows/recommendation-prompt";
import { GENERATED_RECOMMENDATION_JSON_SCHEMA } from "@/lib/workflows/recommendation-schema";
import { validateGeneratedRecommendation, type InternalRecommendationGenerationResult, type InternalRecommendationGenerator, type InternalRecommendationInput } from "@/lib/workflows/recommendation-generator";

const DEFAULT_MODEL = "gpt-5.6-luna";

function resolveModel(): string | null {
  const configured = process.env.OPENAI_RECOMMENDATION_MODEL?.trim();
  if (!configured) return DEFAULT_MODEL;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(configured) ? configured : null;
}

/** Deterministic per-request idempotency key: identical evidence for the
 * same workspace/operator/intent/message never triggers a second distinct
 * generation, matching the "at most one successful generation per claimed
 * step" requirement at the transport layer, on top of the durable step-status
 * check the caller (recommendation-service.ts) already performs first. */
function buildIdempotencyKey(input: InternalRecommendationInput): string {
  const material = [input.workspaceId, input.operatorKey, input.primaryIntent, input.source.messageTs ?? "", input.sourceMessage].join(":");
  return `slack-recommendation:${createHash("sha256").update(material).digest("hex").slice(0, 48)}`;
}

function classifyOpenAIError(error: unknown): string {
  if (error instanceof OpenAI.RateLimitError) return "openai_rate_limited";
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "openai_timeout";
  if (error instanceof OpenAI.APIConnectionError) return "openai_connection_error";
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) return "openai_rate_limited";
    if (typeof error.status === "number" && error.status >= 500) return "openai_server_error";
    if (error.status === 408) return "openai_timeout";
    return `openai_api_error_${error.status ?? "unknown"}`;
  }
  if (error instanceof Error && /timeout/i.test(error.message)) return "openai_timeout";
  return "openai_request_failed";
}

/** The minimal surface this module actually calls - lets tests inject a
 * fake client (see recommendation-generator's dependency-injection guidance)
 * without a real network call or SDK-level module mocking. */
export type OpenAIResponsesClient = Pick<OpenAI, "responses">;

/**
 * Factory so tests can inject a fake client. Production code uses the
 * default-exported singleton below, which lazily constructs a real OpenAI
 * client per call (never at module load, so importing this file with no
 * API key configured is always safe).
 */
export function createOpenAIRecommendationGenerator(clientFactory?: (apiKey: string) => OpenAIResponsesClient): InternalRecommendationGenerator {
  const buildClient = clientFactory ?? ((apiKey: string) => new OpenAI({ apiKey, timeout: AI_REQUEST_TIMEOUT_MS, maxRetries: AI_MAX_RETRIES }));
  return {
    async generate(input): Promise<InternalRecommendationGenerationResult> {
      if (process.env.OPENAI_RECOMMENDATIONS_ENABLED !== "true") return { ok: false, reason: "openai_recommendations_disabled" };
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) return { ok: false, reason: "openai_api_key_missing" };
      const model = resolveModel();
      if (!model) return { ok: false, reason: "openai_model_invalid" };

      let response: Awaited<ReturnType<OpenAI["responses"]["create"]>>;
      try {
        const client = buildClient(apiKey);
        response = await client.responses.create(
          {
            model,
            input: [
              { role: "system", content: buildRecommendationSystemPrompt() },
              { role: "user", content: buildRecommendationUserPrompt(input) },
            ],
            max_output_tokens: 1200,
            store: false,
            text: { verbosity: "low", format: { type: "json_schema", name: "internal_recommendation", strict: true, schema: GENERATED_RECOMMENDATION_JSON_SCHEMA } },
            reasoning: { effort: "low" },
            // No tools/browsing/file search/code execution/function calling -
            // omitting `tools` entirely keeps this a pure text-generation call.
          },
          { idempotencyKey: buildIdempotencyKey(input) },
        );
      } catch (error) {
        return { ok: false, reason: classifyOpenAIError(error) };
      }

      if (response.status === "incomplete") {
        const reason = response.incomplete_details?.reason;
        return { ok: false, reason: reason === "content_filter" ? "openai_refused" : `openai_incomplete_${reason ?? "unknown"}` };
      }
      if (!response.output_text?.trim()) return { ok: false, reason: "openai_empty_response" };

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.output_text);
      } catch {
        return { ok: false, reason: "openai_invalid_json" };
      }

      const validated = validateGeneratedRecommendation(parsed, input);
      if (!validated.ok) return { ok: false, reason: validated.reason };

      return {
        ok: true,
        // Force the policy invariants in application code regardless of what
        // the model returned - schema/validation already checked them, but
        // this makes the guarantee unconditional rather than trusting a
        // single upstream check.
        recommendation: { ...validated.recommendation, approvalRequiredForNextAction: true, externalActionTaken: false },
        provenance: {
          generator: "openai",
          model,
          promptVersion: RECOMMENDATION_PROMPT_VERSION,
          responseId: response.id ?? null,
          usage: {
            inputTokens: response.usage?.input_tokens ?? null,
            outputTokens: response.usage?.output_tokens ?? null,
          },
        },
      };
    },
  };
}

export const openAIRecommendationGenerator: InternalRecommendationGenerator = createOpenAIRecommendationGenerator();
