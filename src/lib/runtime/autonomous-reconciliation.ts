import "server-only";

import { createWebsiteCrawlRun, reconcileStaleWebsiteRuns } from "@/lib/connectors/website-sync";
import { dispatchWebsiteCrawlRun } from "@/lib/connectors/website-dispatch";
import { dispatchGrowthRun } from "@/lib/operators/growth/dispatch";
import { queueGrowthScanForWebsiteRun, reconcileStaleGrowthRuns } from "@/lib/operators/growth/runtime";
import { getOperatorActivationState } from "@/lib/operators/activation";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

function safeCode(error: unknown): string {
  const raw = error instanceof Error ? error.name || error.message : "reconciliation_failed";
  return raw.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").slice(0, 80) || "reconciliation_failed";
}

/**
 * The single shared tenant fanout. It is intentionally one global Trigger
 * schedule, not a schedule per workspace or source. Durable database rows are
 * the handoff/outbox: a provider outage leaves a retryable row for this pass.
 */
export async function runAutonomousReconciliation(input: { supabase?: SupabaseAdmin; now?: Date }): Promise<Record<string, unknown>> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  let staleWebsite = 0;
  let staleGrowth = 0;
  let websiteRequested = 0;
  let websiteAccepted = 0;
  let websiteDispatchFailed = 0;
  let growthHandoffs = 0;
  let growthRequested = 0;
  let growthAccepted = 0;
  let growthDispatchFailed = 0;
  const errors: Array<{ scope: string; id: string; errorCode: string }> = [];

  // Each domain pass is isolated in its own try/catch: an unexpected
  // exception in Website reconciliation must not prevent Growth
  // reconciliation from running in the same pass, and vice versa.
  try {
    staleWebsite = await reconcileStaleWebsiteRuns({ supabase, now });
  } catch (error) {
    errors.push({ scope: "website-stale-recovery", id: "global", errorCode: safeCode(error) });
  }

  try {
    const due = await supabase.from("os_website_sources")
      .select("id,workspace_id")
      .eq("sync_enabled", true)
      .eq("verification_status", "verified")
      .is("disconnected_at", null)
      .not("next_sync_at", "is", null)
      .lte("next_sync_at", nowIso)
      .order("next_sync_at", { ascending: true })
      .limit(100);
    if (!due.error) {
      for (const source of due.data ?? []) {
        try {
          const run = await createWebsiteCrawlRun({ workspaceId: String(source.workspace_id), sourceId: String(source.id), triggerType: "scheduled", supabase });
          websiteRequested += run.reused ? 0 : 1;
          const dispatched = await dispatchWebsiteCrawlRun({ runId: run.runId, supabase });
          if (dispatched.accepted) websiteAccepted += 1;
          else { websiteDispatchFailed += 1; errors.push({ scope: "website", id: run.runId, errorCode: dispatched.errorCode ?? dispatched.dispatchStatus }); }
        } catch (error) {
          errors.push({ scope: "website", id: String(source.id), errorCode: safeCode(error) });
        }
      }
    } else {
      errors.push({ scope: "website-discovery", id: "global", errorCode: "source_storage_unavailable" });
    }
  } catch (error) {
    errors.push({ scope: "website-discovery", id: "global", errorCode: safeCode(error) });
  }

  try {
    staleGrowth = await reconcileStaleGrowthRuns({ supabase, now });
  } catch (error) {
    errors.push({ scope: "growth-stale-recovery", id: "global", errorCode: safeCode(error) });
  }

  // Completion rows are the durable Website -> Growth outbox. The same
  // website run id is the idempotency key, so retries cannot duplicate scans.
  try {
    // Oldest-activated-first so a workspace beyond the batch cap on one pass
    // is guaranteed to be the front of the next pass rather than being
    // starved by a stable "first N" ordering.
    const activations = await supabase.from("os_operator_triggers").select("workspace_id").eq("operator_key", "growth").eq("trigger_type", "operator_activation").eq("enabled", true).order("updated_at", { ascending: true }).limit(500);
    if (!activations.error) {
      for (const activation of activations.data ?? []) {
        const workspaceId = String(activation.workspace_id);
        // Oldest-completed-first: a self-draining scan of any handoff
        // backlog. Each row is idempotency-keyed by website run id
        // (queueGrowthScanForWebsiteRun), so an already-handed-off run is a
        // cheap no-op read here and naturally rotates out of the next pass's
        // window once its handoff exists; newest-first would instead let a
        // steady stream of new completions permanently starve an older,
        // never-handed-off run out of this bounded window.
        const completed = await supabase.from("os_website_crawl_runs").select("id,source_id,observation_count").eq("workspace_id", workspaceId).in("state", ["completed", "partial", "review_ready"]).gt("observation_count", 0).order("completed_at", { ascending: true }).limit(10);
        if (completed.error) { errors.push({ scope: "growth-handoff-discovery", id: workspaceId, errorCode: "website_run_storage_unavailable" }); continue; }
        for (const run of completed.data ?? []) {
          try {
            const handoff = await queueGrowthScanForWebsiteRun({ workspaceId, sourceId: String(run.source_id), websiteRunId: String(run.id), observationCount: Number(run.observation_count ?? 0), supabase });
            if (handoff.requested) growthHandoffs += handoff.reused ? 0 : 1;
          } catch (error) { errors.push({ scope: "growth-handoff", id: String(run.id), errorCode: safeCode(error) }); }
        }
      }
    } else {
      errors.push({ scope: "growth-activation-discovery", id: "global", errorCode: "activation_storage_unavailable" });
    }
  } catch (error) {
    errors.push({ scope: "growth-activation-discovery", id: "global", errorCode: safeCode(error) });
  }

  try {
    const pendingGrowth = await supabase.from("os_operator_runs").select("id,workspace_id,input").eq("operator_key", "growth").eq("status", "pending").in("dispatch_status", ["requested", "dispatch_failed", "recoverable"]).or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`).order("created_at", { ascending: true }).limit(100);
    if (!pendingGrowth.error) {
      for (const run of pendingGrowth.data ?? []) {
        try {
          const runInput = run.input && typeof run.input === "object" ? run.input as Record<string, unknown> : {};
          if (runInput.sourceMode === "website_completion") {
            const activation = await getOperatorActivationState({ workspaceId: String(run.workspace_id), operatorKey: "growth", supabase });
            if (!activation?.activated) continue;
          }
          const dispatched = await dispatchGrowthRun({ runId: String(run.id), supabase });
          if (dispatched.accepted) growthAccepted += 1;
          else { growthDispatchFailed += 1; errors.push({ scope: "growth", id: String(run.id), errorCode: dispatched.errorCode ?? dispatched.dispatchStatus }); }
          growthRequested += 1;
        } catch (error) { errors.push({ scope: "growth", id: String(run.id), errorCode: safeCode(error) }); }
      }
    } else {
      errors.push({ scope: "growth-discovery", id: "global", errorCode: "operator_run_storage_unavailable" });
    }
  } catch (error) {
    errors.push({ scope: "growth-discovery", id: "global", errorCode: safeCode(error) });
  }

  return { staleWebsite, staleGrowth, websiteRequested, websiteAccepted, websiteDispatchFailed, growthHandoffs, growthRequested, growthAccepted, growthDispatchFailed, errors };
}
