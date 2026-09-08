import type { Connector, ExecutionLog } from "@/lib/os/types";

// A connector is real only when authenticated through a direct provider OAuth
// credential. Legacy managed-auth state remains representable for migration,
// but it must never count as an executable connection.
export function isRealConnector(connector: Connector): boolean {
  return connector.source === "native";
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

// A connector is "real connected" only when it is both connected and backed by
// a direct provider credential. Preview and legacy managed state do not count.
export function isRealConnectedConnector(connector: Connector): boolean {
  return connector.isConnected && isRealConnector(connector);
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
  if (t === "starter" || t === "foundation") return "Foundation";
  if (t === "growth" || t === "workforce") return "Workforce";
  if (t === "scale") return "Scale";
  // `operator` and `enterprise` are retained as compatibility keys only.
  // They must never reappear as customer-facing plan names.
  if (t === "operator" || t === "enterprise") return "Scale";
  return "Preview";
}
