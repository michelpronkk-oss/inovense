import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmp = path.join(root, "tests", ".tmp-client-flow-context");
fs.mkdirSync(tmp, { recursive: true });
try {
  const source = fs.readFileSync(path.join(root, "src/lib/operators/client-flow/context.ts"), "utf8").replace(/import type[^\n]+\n/g, "");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmp, "context.mjs"); fs.writeFileSync(file, code, "utf8");
  const { buildClientFlowContext } = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  const context = buildClientFlowContext({ provider: "gmail", messageId: "m1", threadId: "t1", customerEmail: "person@example.com", customerName: "Person Example", subject: "Can we change the delivery date?", request: "Can we change the delivery date? We are waiting on the project update.", receivedAt: null, signalType: "change_request", matchedSignals: ["change request", "delivery"], confidence: "medium", supportingOperators: ["operations"], delivery: { projectId: "board-1", projectName: "Client launch", handoffStatus: "project_context_available" } });
  assert.equal(context.preparationState, "needs_operations_work");
  assert.ok(context.priority >= 65);
  assert.ok(context.priorityReasons.some((reason) => /delivery|internal/i.test(reason)));
  assert.equal(context.customer.reliability, "observed");
  assert.equal(context.delivery.reliability, "observed");
  assert.equal(context.businessContext.task.type.value, "change_request");

  const missing = buildClientFlowContext({ provider: "microsoft", messageId: "m2", subject: "", request: "", signalType: "next_step_request", confidence: "low" });
  assert.equal(missing.preparationState, "needs_clarification");
  assert.equal(missing.customer.reliability, "missing");
  assert.equal(missing.delivery.reliability, "missing");
  console.log("Client Flow context smoke: customer continuity context, preparation states, priorities, provenance, and no-fabrication behavior verified.");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
