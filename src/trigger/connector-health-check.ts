import { task } from "@trigger.dev/sdk/v3";
import { getConnectorTruth, type SafeConnectorTruth } from "@/lib/connectors/truth";
import { loadWorkspacePolicySettings } from "@/lib/settings/workspace-policy";
import { listSlackChannels } from "@/lib/operators/executors/slack";
import { listTrelloBoards } from "@/lib/operators/executors/trello";
import { getHubSpotConnection } from "@/lib/operators/executors/hubspot";
import { recordSystemTaskRun } from "@/lib/operators/runtime/system-task";

type ConnectorHealthPayload = {
  workspaceId?: string;
};

const DEFAULT_WORKSPACE_ID = "ws-atlas";

type ConnectorHealth = {
  connectorKey: string;
  displayName: string;
  connected: boolean;
  healthy: boolean;
  status: string;
  detail: string;
  recommendedFix: string | null;
};

function nangoConnected(truth: SafeConnectorTruth | undefined): boolean {
  return Boolean(truth && truth.status === "connected" && truth.providerConfigKey && truth.nangoConnectionId);
}

function safeErrorMessage(error: unknown): string {
  // Connector executors throw typed errors with safe messages. Never surface
  // tokens or raw responses here.
  return error instanceof Error ? error.message : "Unknown error";
}

export const connectorHealthCheck = task({
  id: "connector-health-check",
  run: async (payload: ConnectorHealthPayload) => {
    const workspaceId = payload.workspaceId?.trim() || DEFAULT_WORKSPACE_ID;

    const [truth, policy] = await Promise.all([
      getConnectorTruth({ workspaceId }),
      loadWorkspacePolicySettings({ workspaceId }),
    ]);
    const byKey = new Map(truth.map((row) => [row.connectorKey, row]));
    const results: ConnectorHealth[] = [];

    // Gmail (native): rely on scope/readiness truth, no extra API call needed.
    const gmail = byKey.get("gmail");
    {
      const connected = Boolean(gmail && gmail.status !== "missing" && gmail.status !== "not_connected" && gmail.status !== "error");
      const healthy = Boolean(gmail?.executable);
      results.push({
        connectorKey: "gmail",
        displayName: "Gmail",
        connected,
        healthy,
        status: gmail?.status ?? "missing",
        detail: gmail?.statusMessage ?? "Not connected",
        recommendedFix: !connected
          ? "Connect Gmail with real OAuth."
          : !healthy
            ? "Reconnect Gmail to grant the required scopes."
            : null,
      });
    }

    // HubSpot (Nango): connection-level check via existing safe DB helper.
    {
      const hubspot = byKey.get("hubspot");
      const connected = nangoConnected(hubspot);
      let healthy = false;
      let detail = "Not connected";
      let recommendedFix: string | null = "Connect HubSpot through Nango.";
      if (connected) {
        try {
          const connection = await getHubSpotConnection(workspaceId);
          healthy = Boolean(connection);
          detail = healthy ? "Connected through Nango." : "Connection record incomplete.";
          recommendedFix = healthy ? null : "Reconnect HubSpot through Nango.";
        } catch (error) {
          detail = `HubSpot check failed: ${safeErrorMessage(error)}`;
          recommendedFix = "Reconnect HubSpot through Nango.";
        }
      }
      results.push({ connectorKey: "hubspot", displayName: "HubSpot", connected, healthy, status: hubspot?.status ?? "not_connected", detail, recommendedFix });
    }

    // Slack (Nango): lightweight live read (list channels) if connected.
    {
      const slack = byKey.get("slack");
      const connected = nangoConnected(slack);
      let healthy = false;
      let detail = "Not connected";
      let recommendedFix: string | null = "Connect Slack through Nango.";
      if (connected) {
        try {
          const channels = await listSlackChannels(workspaceId);
          healthy = true;
          const channelSelected = Boolean(policy.slack.slackDefaultChannelId);
          detail = `Connected. ${channels.length} channel(s) visible.`;
          recommendedFix = channelSelected ? null : "Select a default Slack channel to enable internal alerts.";
        } catch (error) {
          detail = `Slack check failed: ${safeErrorMessage(error)}`;
          recommendedFix = "Reconnect Slack or review Slack scopes.";
        }
      }
      results.push({ connectorKey: "slack", displayName: "Slack", connected, healthy, status: slack?.status ?? "not_connected", detail, recommendedFix });
    }

    // Trello (Nango): lightweight live read (list boards) if connected.
    {
      const trello = byKey.get("trello");
      const connected = nangoConnected(trello);
      let healthy = false;
      let detail = "Not connected";
      let recommendedFix: string | null = "Connect Trello through Nango.";
      if (connected) {
        try {
          const boards = await listTrelloBoards(workspaceId);
          healthy = true;
          const destinationSet = Boolean(policy.trello.defaultBoardId && policy.trello.defaultListId);
          detail = `Connected. ${boards.length} board(s) visible.`;
          recommendedFix = destinationSet ? null : "Select a default Trello board and list for task execution.";
        } catch (error) {
          detail = `Trello check failed: ${safeErrorMessage(error)}`;
          recommendedFix = "Reconnect Trello or review Trello access.";
        }
      }
      results.push({ connectorKey: "trello", displayName: "Trello", connected, healthy, status: trello?.status ?? "not_connected", detail, recommendedFix });
    }

    const total = results.length;
    const healthyCount = results.filter((r) => r.healthy).length;
    const unhealthyCount = total - healthyCount;

    const summary = {
      total,
      healthyCount,
      unhealthyCount,
      connectors: results,
    };

    await recordSystemTaskRun({
      workspaceId,
      operatorKey: "connector_health",
      taskId: "connector-health-check",
      taskType: "manual",
      sourceMode: "manual",
      status: unhealthyCount === 0 ? "all_healthy" : "issues_found",
      eventType: "connector_health_checked",
      message: `Connector health: ${healthyCount}/${total} healthy.`,
      summary,
    });

    return { workspaceId, ...summary };
  },
});
