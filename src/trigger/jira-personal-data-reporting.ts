import { schedules } from "@trigger.dev/sdk/v3";
import { reportPersistedJiraPersonalData } from "@/lib/connectors/jira-personal-data";

/**
 * Atlassian's default reporting cycle is seven days. Running this bounded,
 * idempotent sweep daily keeps the maximum staleness below that cycle without
 * putting OAuth tokens in a Trigger payload. Per-account next_report_at state
 * prevents reports from being sent more frequently than Atlassian permits.
 */
export const jiraPersonalDataReporting = schedules.task({
  id: "jira-personal-data-reporting",
  cron: { pattern: "17 3 * * *", timezone: "UTC" },
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1_000, maxTimeoutInMs: 8_000, randomize: true },
  queue: { name: "jira-personal-data-reporting", concurrencyLimit: 1 },
  maxDuration: 300,
  run: async () => reportPersistedJiraPersonalData(),
});

