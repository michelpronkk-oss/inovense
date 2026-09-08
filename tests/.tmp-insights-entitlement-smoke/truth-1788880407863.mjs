function isRealConnector(connector) {
  return connector.source === "native";
}
function isDemoConnector(connector) {
  return !isRealConnector(connector);
}
function getRealConnectedConnectors(connectors) {
  return connectors.filter((c) => c.isConnected && isRealConnector(c));
}
function getDemoConnectedConnectors(connectors) {
  return connectors.filter((c) => c.isConnected && isDemoConnector(c));
}
function getRealConnectedCount(connectors) {
  return getRealConnectedConnectors(connectors).length;
}
function isRealConnectedConnector(connector) {
  return connector.isConnected && isRealConnector(connector);
}
function isRealLog(log) {
  return !log.id.startsWith("log-00") && !log.runId.startsWith("run-seed-") && !log.runId.startsWith("log-seed-");
}
function isDemoLog(log) {
  return !isRealLog(log);
}
function getPlanLabel(planTier) {
  const t = planTier.toLowerCase();
  if (t === "starter" || t === "foundation") return "Foundation";
  if (t === "growth" || t === "workforce") return "Workforce";
  if (t === "scale") return "Scale";
  if (t === "operator" || t === "enterprise") return "Scale";
  return "Preview";
}
export {
  getDemoConnectedConnectors,
  getPlanLabel,
  getRealConnectedConnectors,
  getRealConnectedCount,
  isDemoConnector,
  isDemoLog,
  isRealConnectedConnector,
  isRealConnector,
  isRealLog
};
