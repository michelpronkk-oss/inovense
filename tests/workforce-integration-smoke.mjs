import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const temp = path.join(root, "tests", ".tmp-workforce-integration-smoke");
fs.mkdirSync(temp, { recursive: true });

async function loadOwnership() {
  const source = fs.readFileSync(path.join(root, "src/lib/workforce/ownership.ts"), "utf8")
    .replace('import type { SignalDecision } from "@/lib/signals/engine";\n', "")
    .replace('import type { SignalEvent } from "@/lib/signals/types";\n', "");
  const { code } = await esbuild.transform(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(temp, "ownership.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

try {
  const { arbitrateOwnership, externalCommunicationAllowed, workforceState } = await loadOwnership();
  const support = arbitrateOwnership({ sourceType: "support_ticket", connectorKey: "zendesk", category: "blocked_work", subject: "Product bug", snippet: "The bug blocks our delivery and we need support." });
  assert.equal(support.primaryOperator, "support");
  assert.deepEqual(support.supportingOperators, ["operations", "client_flow"]);
  assert.equal(support.externalCommunicationOwner, "support");

  const revenue = arbitrateOwnership({ sourceType: "email", connectorKey: "gmail", category: "commercial_intent", subject: "Pricing and delivery", snippet: "We need a quote, but delivery timing is unclear." });
  assert.equal(revenue.primaryOperator, "revenue");
  assert.deepEqual(revenue.supportingOperators, ["operations"]);

  const client = arbitrateOwnership({ sourceType: "email", connectorKey: "gmail", category: "customer_request", subject: "Delivery change", snippet: "Please change the delivery date." });
  assert.equal(client.primaryOperator, "client_flow");
  assert.deepEqual(client.supportingOperators, ["operations"]);
  assert.equal(externalCommunicationAllowed({ operator: "operations", primaryOperator: "client_flow" }), false);
  assert.equal(externalCommunicationAllowed({ operator: "client_flow", primaryOperator: "client_flow", explicitTransfer: true }), true);
  assert.equal(workforceState({ status: "planned", dependencyState: "waiting_on_supporting_work" }), "waiting_on_supporting_work");
  assert.equal(workforceState({ status: "awaiting_approval", dependencyState: "ready_to_continue" }), "waiting_on_approval");
  console.log("Workforce integration smoke: deterministic primary ownership, bounded supporting roles, external communication lock, and derived states verified.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
