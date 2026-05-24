import type { Connector, ExecutionLog } from "@/lib/os/types";

// A connector is real only when authenticated via native OAuth or Nango.
// Seed and preview sources are demo — never real production state.
export function isRealConnector(connector: Connector): boolean {
  return connector.source === "native" || connector.source === "nango";
}

export function isDemoConnector(connector: Connector): boolean {
  return !isRealConnector(connector);
}

export function getRealConnectedConnectors(connectors: Connector[]): Connector[] {
  return connectors.filter((c) => c.isConnected && isRealConnector(c));
}

export function getDemoConnectedConnectors(connectors: Connector[]): Connector[] {
  return connectors.filter((c) => c.isConnected && isDemoConnector(c));
}

export function getRealConnectedCount(connectors: Connector[]): number {
  return getRealConnectedConnectors(connectors).length;
}

// A log is real if it did not originate from seed fixtures.
// Seed logs use runIds prefixed "run-seed-" or "log-seed-".
export function isRealLog(log: ExecutionLog): boolean {
  return (
    !log.id.startsWith("log-00") &&
    !log.runId.startsWith("run-seed-") &&
    !log.runId.startsWith("log-seed-")
  );
}

export function isDemoLog(log: ExecutionLog): boolean {
  return !isRealLog(log);
}

// Capitalised plan label from tier string.
export function getPlanLabel(planTier: string): string {
  const t = planTier.toLowerCase();
  if (t === "starter") return "Starter";
  if (t === "growth") return "Growth";
  if (t === "operator") return "Operator";
  if (t === "enterprise") return "Enterprise";
  return "Preview";
}
