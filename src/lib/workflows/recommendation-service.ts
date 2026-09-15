import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { detectSlackMessageLanguage, slackOperatorName } from "@/lib/connectors/slack-acknowledgement-copy";
import { languageFromSettings } from "@/lib/connectors/slack-acknowledgement";
import { extractSeatCount, intentLabelFor } from "@/lib/workflows/recommendation";
import { generateInternalRecommendation, resolveRecommendationLanguage, validateGeneratedRecommendation, type InternalRecommendationInput, type RecommendationProvenance } from "@/lib/workflows/recommendation-generator";
import type { GeneratedInternalRecommendation, PersistedInternalRecommendation } from "@/lib/workflows/recommendation-schema";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type RecommendationServiceResult =
  | { status: "already_completed" }
  | { status: "completed"; generator: "openai" | "deterministic_fallback" }
  | { status: "insufficient_evidence" };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, max = 600): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function stringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().slice(0, maxLength)).slice(0, maxItems)
    : [];
}

/**
 * Accepts both the current v2 artifact and the original deterministic v1
 * shape. This keeps retries and Slack reads compatible with recommendations
 * created before the OpenAI generator existed, while still validating every
 * field against the current request evidence before reuse.
 */
function reusableRecommendationArtifact(value: unknown, input: InternalRecommendationInput): { artifact: PersistedInternalRecommendation; upgradeLegacy: boolean } | null {
  const raw = record(value);
  const legacyNextStep = record(raw.recommendedNextStep);
  const recommendedNextStep = stringValue(raw.recommendedNextStep, 600) ?? stringValue(legacyNextStep[input.language], 600);
  if (!recommendedNextStep) return null;
  const candidate: GeneratedInternalRecommendation = {
    language: input.language,
    operatorKey: stringValue(raw.operatorKey, 80) ?? input.operatorKey,
    primaryIntent: stringValue(raw.primaryIntent, 80) ?? input.primaryIntent,
    problemSummary: stringValue(raw.problemSummary, 300) ?? input.problemSummary.slice(0, 300),
    recommendedNextStep,
    rationale: stringValue(raw.rationale, 300) ?? (input.language === "nl" ? "Gebaseerd op het beschikbare bewijs." : "Based on the available evidence."),
    missingInformation: stringArray(raw.missingInformation, 5, 160),
    evidenceRefs: stringArray(raw.evidenceRefs, 20, 160),
    approvalRequiredForNextAction: true,
    externalActionTaken: false,
  };
  const validated = validateGeneratedRecommendation(candidate, input);
  if (!validated.ok) return null;

  const generator = raw.generator === "openai" || raw.generator === "deterministic_fallback" ? raw.generator : "deterministic_fallback";
  const model = generator === "openai" ? stringValue(raw.model, 120) : null;
  const generatedAt = stringValue(raw.generatedAt, 80) ?? new Date().toISOString();
  const usageRaw = record(raw.usage);
  const usage = typeof usageRaw.inputTokens === "number" || typeof usageRaw.outputTokens === "number"
    ? { inputTokens: typeof usageRaw.inputTokens === "number" ? usageRaw.inputTokens : null, outputTokens: typeof usageRaw.outputTokens === "number" ? usageRaw.outputTokens : null }
    : undefined;
  return {
    artifact: {
      ...validated.recommendation,
      version: 2,
      intentLabel: intentLabelFor(validated.recommendation.primaryIntent),
      reasonCodes: stringArray(raw.reasonCodes, 12, 160).length ? stringArray(raw.reasonCodes, 12, 160) : input.reasonCodes,
      confidence: input.confidence,
      source: input.source,
      generator,
      model,
      promptVersion: stringValue(raw.promptVersion, 120) ?? (generator === "openai" ? "openai-recommendation-unknown" : "deterministic-v1"),
      responseId: stringValue(raw.responseId, 180),
      fallbackReason: stringValue(raw.fallbackReason, 120),
      generatedAt,
      ...(usage ? { usage } : {}),
    },
    upgradeLegacy: raw.version !== 2 || typeof raw.recommendedNextStep !== "string",
  };
}

/**
 * The full generation-to-persistence pipeline for one prepare_internal_
 * recommendation step. Called from the dedicated slack-recommendation-generate
 * Trigger task (never from the provider-event processor). Idempotent: a
 * step already "completed" is a no-op that never re-invokes a generator,
 * and every write here is safe to repeat with the same inputs.
 */
export async function runInternalRecommendationGeneration(input: { workspaceId: string; workflowId: string; stepId: string; supabase?: SupabaseAdmin }): Promise<RecommendationServiceResult> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const [workflowResult, stepResult] = await Promise.all([
    supabase.from("os_workflow_runs").select("id,operator_key,originating_signal_id,status,result_evidence").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle(),
    supabase.from("os_workflow_steps").select("id,status,action_type").eq("id", input.stepId).eq("workflow_id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle(),
  ]);
  if (workflowResult.error) throw new Error(`Workflow lookup failed: ${workflowResult.error.message}`);
  if (stepResult.error) throw new Error(`Step lookup failed: ${stepResult.error.message}`);
  if (!workflowResult.data || !stepResult.data) throw new Error("Internal recommendation workflow/step not found.");
  if (stepResult.data.action_type !== "prepare_internal_recommendation") throw new Error("Step is not an internal recommendation step.");

  const signalId = String(workflowResult.data.originating_signal_id || "");
  const [signalResult, candidateResult, settings] = await Promise.all([
    signalId
      ? supabase.from("os_signal_events").select("content_preview").eq("id", signalId).eq("workspace_id", input.workspaceId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("os_signal_candidates").select("operator_key,confidence,reason_codes,evidence").eq("workspace_id", input.workspaceId).eq("signal_id", signalId).eq("operator_key", String(workflowResult.data.operator_key)).order("priority", { ascending: false }).limit(1).maybeSingle(),
    loadWorkspacePolicySettings({ workspaceId: input.workspaceId, supabase }),
  ]);
  if (signalResult.error) throw new Error(`Signal evidence lookup failed: ${signalResult.error.message}`);
  if (candidateResult.error) throw new Error(`Candidate evidence lookup failed: ${candidateResult.error.message}`);
  if (!candidateResult.data) return { status: "insufficient_evidence" };

  const evidence = record(candidateResult.data.evidence);
  const primaryIntent = typeof evidence.primaryIntent === "string" ? evidence.primaryIntent.trim() : "";
  const slackOriginRaw = record(evidence.slackOrigin);
  const channelId = typeof slackOriginRaw.channelId === "string" ? slackOriginRaw.channelId : null;
  const messageTs = typeof slackOriginRaw.messageTs === "string" ? slackOriginRaw.messageTs : null;
  const threadTs = typeof slackOriginRaw.threadTs === "string" ? slackOriginRaw.threadTs : null;
  // Every persisted recommendation must remain correlated to the original
  // workspace/channel/message - without that correlation there is nothing
  // safe to generate or reply into.
  if (!primaryIntent || !channelId || !messageTs) return { status: "insufficient_evidence" };

  const sourceMessage = (typeof signalResult.data?.content_preview === "string" ? signalResult.data.content_preview : "").slice(0, 600);
  const detectedLanguage = detectSlackMessageLanguage(sourceMessage);
  const workspaceLanguage = languageFromSettings(settings);
  const language = resolveRecommendationLanguage({ detectedLanguage, workspacePreference: workspaceLanguage });
  const operatorKey = String(candidateResult.data.operator_key);
  const reasonCodes = Array.isArray(candidateResult.data.reason_codes) ? candidateResult.data.reason_codes.filter((code): code is string => typeof code === "string").slice(0, 12) : [];
  const revenueSignals = Array.isArray(evidence.revenueSignals) ? evidence.revenueSignals.filter((s): s is string => typeof s === "string").slice(0, 10) : [];
  const evidenceRefs = [...reasonCodes, ...revenueSignals].slice(0, 20);
  const confidence = candidateResult.data.confidence === "high" || candidateResult.data.confidence === "medium" || candidateResult.data.confidence === "low" ? candidateResult.data.confidence : null;

  const generationInput: InternalRecommendationInput = {
    workspaceId: input.workspaceId,
    operatorKey,
    operatorDisplayName: slackOperatorName(operatorKey),
    primaryIntent,
    problemSummary: sourceMessage.slice(0, 320) || intentLabelFor(primaryIntent),
    sourceMessage,
    seatCount: extractSeatCount(sourceMessage),
    confidence,
    reasonCodes,
    evidenceRefs,
    language,
    source: { provider: "slack", channelId, messageTs, threadTs },
  };

  // A crash after artifact persistence but before step/workflow finalization
  // must reuse the artifact and complete the durable lifecycle without a new
  // model call. Legacy v1 deterministic artifacts are upgraded compatibly.
  const existingRecommendation = reusableRecommendationArtifact(record(workflowResult.data.result_evidence).internalRecommendation, generationInput);
  if (existingRecommendation) {
    if (existingRecommendation.upgradeLegacy) {
      await persistRecommendationArtifact({ supabase, workspaceId: input.workspaceId, workflowId: input.workflowId, artifact: existingRecommendation.artifact });
    }
    if (stepResult.data.status === "completed") return { status: "already_completed" };
    await completePersistedRecommendation({ supabase, workspaceId: input.workspaceId, workflowId: input.workflowId, stepId: input.stepId, signalId, artifact: existingRecommendation.artifact });
    return { status: "already_completed" };
  }
  // A completed step without a valid artifact is an inconsistent state. Do
  // not call OpenAI or claim completion; the existing recovery path can flag
  // it for bounded human review.
  if (stepResult.data.status === "completed") return { status: "insufficient_evidence" };

  const generationStartedAt = Date.now();
  const generated = await generateInternalRecommendation(generationInput);
  if (!generated) return { status: "insufficient_evidence" };

  console.info("[recommendation-service] generation completed", {
    workflowId: input.workflowId,
    stepId: input.stepId,
    status: "completed",
    generator: generated.provenance.generator,
    model: generated.provenance.model,
    promptVersion: generated.provenance.promptVersion,
    responseId: generated.provenance.responseId,
    latencyMs: Date.now() - generationStartedAt,
    fallbackCategory: generated.provenance.fallbackReason,
    validationFailureCategory: generated.provenance.fallbackReason && /validation|mismatch|invented|claim|secret|specific/.test(generated.provenance.fallbackReason)
      ? generated.provenance.fallbackReason
      : null,
    inputTokens: generated.provenance.usage?.inputTokens ?? null,
    outputTokens: generated.provenance.usage?.outputTokens ?? null,
  });

  await persistInternalRecommendation({
    supabase,
    workspaceId: input.workspaceId,
    workflowId: input.workflowId,
    stepId: input.stepId,
    signalId,
    recommendation: generated.recommendation,
    provenance: generated.provenance,
    source: generationInput.source,
    reasonCodes,
    confidence,
  });

  return { status: "completed", generator: generated.provenance.generator };
}

async function persistInternalRecommendation(input: {
  supabase: SupabaseAdmin;
  workspaceId: string;
  workflowId: string;
  stepId: string;
  signalId: string;
  recommendation: GeneratedInternalRecommendation;
  provenance: RecommendationProvenance;
  source: InternalRecommendationInput["source"];
  reasonCodes: string[];
  confidence: "low" | "medium" | "high" | null;
}): Promise<void> {
  const artifact: PersistedInternalRecommendation = {
    ...input.recommendation,
    version: 2,
    intentLabel: intentLabelFor(input.recommendation.primaryIntent),
    reasonCodes: input.reasonCodes,
    confidence: input.confidence,
    source: input.source,
    generator: input.provenance.generator,
    model: input.provenance.model,
    promptVersion: input.provenance.promptVersion,
    responseId: input.provenance.responseId,
    fallbackReason: input.provenance.fallbackReason,
    generatedAt: new Date().toISOString(),
    ...(input.provenance.usage ? { usage: input.provenance.usage } : {}),
  };

  await persistRecommendationArtifact({ supabase: input.supabase, workspaceId: input.workspaceId, workflowId: input.workflowId, artifact });
  await completePersistedRecommendation({ supabase: input.supabase, workspaceId: input.workspaceId, workflowId: input.workflowId, stepId: input.stepId, signalId: input.signalId, artifact });
}

async function persistRecommendationArtifact(input: { supabase: SupabaseAdmin; workspaceId: string; workflowId: string; artifact: PersistedInternalRecommendation }): Promise<void> {
  const evidenceLookup = await input.supabase.from("os_workflow_runs").select("result_evidence").eq("id", input.workflowId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (evidenceLookup.error) throw new Error(`Workflow result evidence lookup failed: ${evidenceLookup.error.message}`);
  const existingEvidence = record(evidenceLookup.data?.result_evidence);
  const persistEvidence = await input.supabase.from("os_workflow_runs").update({ result_evidence: { ...existingEvidence, internalRecommendation: input.artifact } }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (persistEvidence.error) throw new Error(`Recommendation could not be durably persisted: ${persistEvidence.error.message}`);
}

async function completePersistedRecommendation(input: { supabase: SupabaseAdmin; workspaceId: string; workflowId: string; stepId: string; signalId: string; artifact: PersistedInternalRecommendation }): Promise<void> {
  // Auditable outcome record, best-effort: the artifact above is already
  // durably persisted and authoritative, so a transient failure here must
  // not leave a genuinely-produced recommendation stuck retrying forever.
  try {
    const outcomeId = `internal-recommendation:${input.workflowId}:${input.stepId}`.replace(/[^a-zA-Z0-9_:-]+/g, "-").slice(0, 200);
    await input.supabase.from("os_workflow_outcomes").upsert({
      id: outcomeId,
      workspace_id: input.workspaceId,
      operator_key: input.artifact.operatorKey,
      workflow_id: input.workflowId,
      signal_id: input.signalId || null,
      outcome_type: "revenue_internal_recommendation_prepared",
      attribution_level: "observed",
      confidence: input.artifact.confidence ?? "medium",
      evidence_refs: [...input.artifact.evidenceRefs, `generator:${input.artifact.generator}`].slice(0, 20),
      observed_at: input.artifact.generatedAt,
    });
  } catch (error) {
    console.warn("[recommendation-service] outcome recording skipped", { workspaceId: input.workspaceId, workflowId: input.workflowId, stepId: input.stepId, error: error instanceof Error ? error.message : "Unknown outcome recording error" });
  }

  const stepUpdate = await input.supabase.from("os_workflow_steps").update({ status: "completed", block_reason: null, result_ref: `workflow:${input.workflowId}:result_evidence:internalRecommendation` }).eq("id", input.stepId).eq("workspace_id", input.workspaceId);
  if (stepUpdate.error) throw new Error(`Internal recommendation step could not be recorded: ${stepUpdate.error.message}`);
  // The recommendation is the entire deliverable of this workflow: once its
  // one step is durably done, the workflow itself is done.
  const workflowUpdate = await input.supabase.from("os_workflow_runs").update({ status: "completed" }).eq("id", input.workflowId).eq("workspace_id", input.workspaceId);
  if (workflowUpdate.error) throw new Error(`Workflow could not be finalized: ${workflowUpdate.error.message}`);
}
