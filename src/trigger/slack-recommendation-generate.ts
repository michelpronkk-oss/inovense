import { task } from "@trigger.dev/sdk/v3";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { runInternalRecommendationGeneration } from "@/lib/workflows/recommendation-service";
import { triggerSlackLifecycleUpdate } from "@/lib/connectors/slack-acknowledgement";

/**
 * Dedicated worker for internal-recommendation generation (OpenAI or the
 * deterministic fallback - see recommendation-service.ts). Dispatched from
 * materialize.ts's dispatchInternalRecommendationGeneration once a
 * prepare_internal_recommendation step, its workflow, its candidate, and
 * its canonical signal are already durably persisted - never from the
 * Slack webhook route or the provider-event processor, so a slow or
 * unavailable OpenAI call never blocks Slack ingestion.
 *
 * A tight maxDuration and its own queue keep this isolated from the
 * higher-volume slack-events queue, mirroring slack-mention-acknowledge.ts's
 * per-task override of the global retry/duration defaults.
 */
export const slackRecommendationGenerate = task({
  id: "slack-recommendation-generate",
  retry: { maxAttempts: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 20_000, factor: 2, randomize: true },
  queue: { name: "slack-recommendations", concurrencyLimit: 5 },
  maxDuration: 120,
  run: async (payload: { workspaceId: string; workflowId: string; stepId: string }) => {
    if (!payload?.workspaceId?.trim() || !payload.workflowId?.trim() || !payload.stepId?.trim()) throw new Error("slack_recommendation_payload_invalid");
    const supabase = createSupabaseAdmin();

    const result = await runInternalRecommendationGeneration({ workspaceId: payload.workspaceId, workflowId: payload.workflowId, stepId: payload.stepId, supabase });

    if (result.status === "insufficient_evidence") {
      // A truthful, bounded non-completion - never a false "completed" with
      // empty content. Nothing further to do; the step is left as-is.
      return { status: result.status };
    }

    // The acknowledgement claim is deliberately reused as the one final
    // Slack reply for internal recommendations. A pending initial
    // acknowledgement deferred without claiming; this update happens only
    // after the validated artifact is durably persisted.
    await triggerSlackLifecycleUpdate({ workflowId: payload.workflowId, workspaceId: payload.workspaceId, updateType: "acknowledgement" });

    return { status: result.status, generator: result.status === "completed" ? result.generator : undefined };
  },
});
