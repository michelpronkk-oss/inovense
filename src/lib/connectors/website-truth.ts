import "server-only";

import { getWebsiteSummary } from "./website-sync";
import type { SafeConnectorTruth, ConnectorTruthStatus } from "./truth";

type SupabaseAdmin = Parameters<typeof getWebsiteSummary>[0]["supabase"];

export async function getWebsiteConnectorTruth(input: { workspaceId: string; supabase?: SupabaseAdmin }): Promise<SafeConnectorTruth> {
  const summary = await getWebsiteSummary(input);
  const source = summary.source;
  const status: ConnectorTruthStatus = summary.errorCode
    ? "error"
    : !source
      ? "not_configured"
      : source.verificationStatus !== "verified"
        ? "configuration_required"
        : source.healthStatus === "reconnect_required"
          ? "reconnect_required"
          : source.healthStatus === "blocked_by_robots"
            ? "permission_required"
            : source.healthStatus === "failed" || source.healthStatus === "degraded"
              ? "error"
              : source.healthStatus === "healthy"
                ? "healthy"
                : source.syncEnabled ? "connected" : "disabled";
  return {
    connectorKey: "website",
    displayName: "Website",
    authType: "native",
    status,
    accountEmail: source?.hostname ?? null,
    connectedAt: source?.verifiedAt ?? null,
    scopes: source ? ["verified public website", "sitemap-first discovery", "observed Memory context"] : [],
    reconnectRequired: status === "reconnect_required" || status === "permission_required",
    executable: status === "healthy",
    statusMessage: summary.errorCode
      ? "Website sync storage needs attention."
      : !source
        ? "Configure one public company website to enable observed business context."
        : status === "configuration_required"
          ? "Verify the configured domain before website synchronization can run."
          : source.healthStatus === "paused" || !source.syncEnabled
            ? "Website is verified but synchronization is paused."
            : source.healthStatus === "healthy"
              ? `Verified ${source.hostname}. ${summary.pendingObservations} Memory review item${summary.pendingObservations === 1 ? "" : "s"} pending.`
              : `Website sync status: ${source.healthStatus}.`,
    source: source ? "native" : undefined,
  };
}
