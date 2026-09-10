import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const temp = path.join(root, "tests", `.tmp-support-context-${process.pid}`);
fs.mkdirSync(temp, { recursive: true });
try {
  const source = fs.readFileSync(path.join(root, "src/lib/operators/support/context.ts"), "utf8")
    .replace('import type { PolicyBusinessContext, PolicyContextValue } from "@/lib/policies/types";\n', "");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(temp, "context.mjs");
  fs.writeFileSync(file, code, "utf8");
  const context = await import(pathToFileURL(path.resolve(file)).href + `?t=${Date.now()}`);

  const escalation = context.buildSupportContext({
    provider: "zendesk",
    sourceId: "ticket-7",
    customerName: "Ada",
    company: "Example Co",
    status: "open",
    providerPriority: "urgent",
    subject: "Integration is blocked",
    request: "The integration is broken and we cannot proceed.",
    ageHours: 72,
    priorReplies: ["We already tried reconnecting."],
  });
  assert.equal(escalation.preparationState, "needs_escalation");
  assert.ok(escalation.priority >= 85);
  assert.equal(escalation.businessContext.customer.sla_priority?.reliability, "missing");
  const prepared = context.prepareSupportReply(escalation);
  assert.match(prepared.body, /priority review/i);
  assert.doesNotMatch(prepared.body, /your account is|the fix is|we changed/i);

  const clarification = context.buildSupportContext({
    provider: "gmail",
    sourceId: "message-1",
    customerEmail: "customer@example.com",
    subject: "Question about setup",
    request: "Can you help?",
  });
  assert.equal(clarification.preparationState, "needs_clarification");
  assert.match(context.prepareSupportReply(clarification).body, /what you expected/i);

  const publicContext = context.publicSupportContext(escalation);
  assert.equal(publicContext.customer.company, "Example Co");
  assert.equal(publicContext.ticket.status, "open");
  assert.ok(publicContext.service.priorReplies.length <= 5);
  console.log("support-context-smoke: deterministic priority, preparation states, bounded context, and no-fabrication reply contracts passed.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
