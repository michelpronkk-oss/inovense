import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const page = read("src/app/app/connectors/page.tsx");
const truth = read("src/lib/connectors/truth.ts");
const reconciliation = read("src/lib/connectors/reconciliation.ts");
const appProvider = read("src/lib/os/app-provider.tsx");
const callback = read("src/app/api/connectors/gmail/callback/route.ts");
const driveSettings = read("src/app/api/connectors/google-drive/settings/route.ts");
const disconnect = read("src/app/api/connectors/disconnect/route.ts");
const unlock = read("src/lib/operators/unlock-copy.ts");

assert.match(reconciliation, /export async function reconcileConnectorState/);
assert.match(reconciliation, /getConnectorTruth/);
assert.match(reconciliation, /getWorkspaceOperatorReadiness/);
assert.match(callback, /reconcileConnectorState/);
assert.match(driveSettings, /reconcileConnectorState/);
assert.match(disconnect, /reconcileConnectorState/);
assert.match(truth, /truth\.status === "configuration_required"[\s\S]{0,220}isConnected: truth\.status === "healthy" \|\| truth\.status === "configuration_required"/);
assert.doesNotMatch(page, /Refresh operator access/);
assert.match(page, /advancedOpen && isRealConnectedConnector\(drawerConnector\)/);
assert.match(page, /drawerConnector\.records\.includes\("Grant Drive access"\)/);
assert.doesNotMatch(page, /: "Not verified"/);
assert.doesNotMatch(appProvider, /updateConnectorPermissions/);
assert.match(unlock, /isLiveOperator\(operator\.key\)/);

console.log("connector-readiness-reconciliation-smoke: automatic readiness propagation and state-driven connector UX passed.");
