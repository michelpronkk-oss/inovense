import { schedules } from "@trigger.dev/sdk/v3";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { sendTrialLifecycleEmail } from "@/lib/billing/trial-notifications";

type TrialRow = { id: string; workspace_id: string; trial_plan: "starter" | "growth" | "scale"; trial_ends_at: string | null };

function rows(value: unknown): TrialRow[] {
  return Array.isArray(value) ? value.filter((row): row is TrialRow => Boolean(row) && typeof row === "object" && typeof (row as TrialRow).id === "string") : [];
}

export const trialLifecycle = schedules.task({
  id: "trial-lifecycle",
  cron: { pattern: "5 * * * *", timezone: "UTC" },
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 8_000, randomize: true },
  queue: { name: "billing-lifecycle", concurrencyLimit: 1 },
  run: async () => {
    const supabase = createSupabaseAdmin();
    const result = await supabase.from("os_trial_entitlements").select("id,workspace_id,trial_plan,trial_ends_at").eq("trial_status", "active").not("trial_ends_at", "is", null).limit(1000);
    if (result.error) throw new Error(`Could not load active trials: ${result.error.message}`);

    const now = Date.now();
    let reminders = 0;
    let expired = 0;
    for (const trial of rows(result.data)) {
      const end = trial.trial_ends_at ? new Date(trial.trial_ends_at).getTime() : NaN;
      if (!Number.isFinite(end)) continue;
      if (end <= now) {
        const update = await supabase.from("os_trial_entitlements").update({ trial_status: "expired" }).eq("id", trial.id).eq("trial_status", "active");
        if (update.error) continue;
        await supabase.from("os_workspaces").update({ billing_status: "canceled", billing_updated_at: new Date().toISOString() }).eq("id", trial.workspace_id).eq("billing_status", "trialing");
        await sendTrialLifecycleEmail({ supabase, workspaceId: trial.workspace_id, eventKey: `trial-expired:${trial.id}`, type: "trial_expired", plan: trial.trial_plan });
        expired += 1;
      } else if (end - now <= 25 * 60 * 60 * 1000 && end - now >= 23 * 60 * 60 * 1000) {
        await sendTrialLifecycleEmail({ supabase, workspaceId: trial.workspace_id, eventKey: `trial-ending:${trial.id}:${trial.trial_ends_at}`, type: "trial_ending", plan: trial.trial_plan, trialEndsAt: trial.trial_ends_at ?? undefined });
        reminders += 1;
      }
    }
    return { activeTrials: rows(result.data).length, reminders, expired };
  },
});
