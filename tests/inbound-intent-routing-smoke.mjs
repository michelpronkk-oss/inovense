import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", `.tmp-inbound-intent-routing-${process.pid}`);
fs.mkdirSync(tmpDir, { recursive: true });

async function loadEngine() {
  const inbound = fs.readFileSync(path.join(root, "src/lib/signals/inbound.ts"), "utf8").replace('import type { SignalEvent } from "@/lib/signals/types";\n', "");
  const engine = fs.readFileSync(path.join(root, "src/lib/signals/engine.ts"), "utf8").replace('import { classifyInboundSignalEvent, type InboundActionability, type InboundClassification, type InboundOperatorKey } from "@/lib/signals/inbound";\n', `${inbound}\n`);
  const { code } = esbuild.transformSync(engine, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, "engine.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

const email = (overrides = {}) => ({
  workspaceId: "ws-inbound",
  source: "gmail",
  provider: "gmail",
  connectorKey: "gmail",
  sourceType: "email",
  eventType: "email.received",
  sourceId: "message-1",
  threadId: "thread-1",
  receivedAt: "2026-09-09T08:00:00.000Z",
  from: "customer@example.com",
  subject: "Hello",
  snippet: "Hello, can you help?",
  ...overrides,
});

try {
  const { routeSignalEvent, normalizeSignalEvent } = await loadEngine();
  const route = (overrides) => routeSignalEvent(email(overrides));

  // 1. Explicit pricing request -> Revenue.
  let result = route({ subject: "Pricing for 25 additional seats", snippet: "Can you send pricing for 25 additional seats?" });
  assert.equal(result.decision.primaryIntent, "PRICING_REQUEST");
  assert.equal(result.decision.primaryOperator, "revenue");
  assert.equal(result.decision.actionability, "WORKFLOW_CANDIDATE");
  // 2. Customer question -> Client Flow.
  result = route({ subject: "A question about the rollout", snippet: "Can you explain what happens next?" });
  assert.equal(result.decision.primaryIntent, "CUSTOMER_QUESTION");
  assert.equal(result.candidates[0]?.operatorKey, "client_flow");
  // 3. Complaint -> Client Flow.
  result = route({ subject: "We are disappointed", snippet: "This is unacceptable and we are not satisfied." });
  assert.equal(result.decision.primaryIntent, "COMPLAINT");
  assert.equal(result.decision.primaryOperator, "client_flow");
  assert.equal(result.decision.priorityLevel, "high");
  // 4. Escalation carries Operations as context without competing ownership.
  result = route({ subject: "Escalation: rollout blocked", snippet: "This is the third time we have asked. The rollout is still blocked." });
  assert.equal(result.decision.primaryOperator, "client_flow");
  assert.deepEqual(result.decision.supportingOperators, ["operations"]);
  // 5. Internal blocker -> Operations.
  result = route({ from: "ops@example.com", subject: "Internal blocker", snippet: "The vendor dependency is stuck and the handoff is blocked." });
  assert.equal(result.decision.primaryOperator, "operations");
  assert.equal(result.decision.operationsSignal, true);
  // 6. Proposal request -> Revenue.
  result = route({ subject: "Proposal request", snippet: "Please send a proposal and scope for the expansion." });
  assert.equal(result.decision.primaryIntent, "PROPOSAL_REQUEST");
  assert.equal(result.decision.primaryOperator, "revenue");
  // 7. Newsletter ignored.
  result = route({ subject: "Weekly newsletter", snippet: "Read our digest. Unsubscribe here." });
  assert.equal(result.decision.primaryIntent, "NEWSLETTER");
  assert.equal(result.candidates.length, 0);
  // 8. Automated receipt ignored.
  result = route({ from: "noreply@vendor.example", subject: "Receipt", snippet: "Your payment receipt is attached." });
  assert.equal(result.decision.primaryIntent, "AUTOMATED_NOTIFICATION");
  assert.equal(result.candidates.length, 0);
  // 9. Resolved thank-you reply is observation only.
  result = route({ subject: "Re: issue", snippet: "Thanks, that solved it. All good now." });
  assert.equal(result.decision.actionability, "OBSERVE");
  assert.equal(result.candidates.length, 0);
  // 10. Multi-intent customer message keeps one primary owner.
  result = route({ subject: "Implementation and pricing", snippet: "We are still waiting for implementation and also want pricing for another region." });
  assert.equal(result.decision.primaryOperator, "client_flow");
  assert.ok(result.decision.supportingOperators.includes("revenue"));
  // 11. Supporting context never becomes a second candidate.
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].supportingOperators, ["operations", "revenue"]);
  // 12. Same provider/thread/intent dedupes deterministically.
  const first = route({ subject: "Pricing", snippet: "Please send pricing." });
  const second = route({ subject: "Pricing", snippet: "Please send pricing.", sourceId: "message-2" });
  assert.equal(first.candidates[0]?.dedupeKey, second.candidates[0]?.dedupeKey);
  // 13. Repeated unresolved follow-up raises priority.
  result = route({ subject: "Re: implementation", snippet: "Still waiting for an answer.", metadata: { threadMessageCount: 3, threadUnresolved: true } });
  assert.equal(result.decision.priorityLevel, "high");
  assert.equal(result.decision.actionability, "WORKFLOW_CANDIDATE");
  // 14. Unknown low-confidence content never creates a workflow candidate.
  result = route({ subject: "Hello", snippet: "A short note with no request or business context." });
  assert.equal(result.decision.confidence, "low");
  assert.equal(result.candidates.length, 0);
  // 15. Customer-facing candidates remain bounded signals; routing never sends.
  result = route({ subject: "Pricing request", snippet: "Can you send a quote?" });
  assert.equal(result.decision.customerFacing, true);
  assert.equal(result.candidates[0]?.actionability, "WORKFLOW_CANDIDATE");
  // 16. Existing provider dedupe remains stable and workspace-scoped.
  const normalized = normalizeSignalEvent(email({ sourceId: "same-message" }));
  assert.equal(normalized.dedupeKey, normalizeSignalEvent(email({ sourceId: "same-message" })).dedupeKey);
  assert.notEqual(normalized.dedupeKey, normalizeSignalEvent(email({ workspaceId: "other-workspace", sourceId: "same-message" })).dedupeKey);
  // 17. Support question is not commercial intent.
  result = route({ subject: "Support question", snippet: "The integration is not working. Can you help?" });
  assert.equal(result.decision.commercialSignal, false);
  assert.equal(result.decision.primaryOperator, "client_flow");
  // 18. Bounded thread context is honored without storing a body.
  result = route({ metadata: { threadMessageCount: 999, threadUnresolved: true }, snippet: "Still waiting on delivery." });
  assert.equal(result.decision.primaryOperator, "client_flow");
  // 19. Malformed provider data is safe.
  result = route({ sourceId: "", from: null, subject: null, snippet: null, metadata: null });
  assert.ok(result.decision.primaryIntent);
  // 20. Classifier failure-safe unknown path does not throw or route.
  result = route({ sourceId: "unknown", subject: "", snippet: "", metadata: { senderKind: "unknown" } });
  assert.equal(result.candidates.length, 0);
  // 21. Raw body never appears in normalized provider event or candidate evidence.
  const bodyResult = route({ metadata: { body: "secret customer body", token: "secret-token" }, snippet: "Please send pricing." });
  assert.doesNotMatch(JSON.stringify(bodyResult), /secret customer body|secret-token/);
  // 22. Only the three live operators can be emitted.
  for (const candidate of first.candidates) assert.ok(["revenue", "client_flow", "operations"].includes(candidate.operatorKey));

  console.log("inbound-intent-routing-smoke: 22 generalized inbound routing scenarios passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
