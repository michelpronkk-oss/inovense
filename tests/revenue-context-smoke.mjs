import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const temp = path.join(root, "tests", `.tmp-revenue-context-${process.pid}`);
fs.mkdirSync(temp, { recursive: true });
try {
  const source = fs.readFileSync(path.join(root, "src/lib/operators/revenue/context.ts"), "utf8")
    .replace('import type { PolicyBusinessContext, PolicyContextReliability } from "@/lib/policies/types";\n', "")
    .replace('import type { RevenueCrmCompany, RevenueCrmOpportunity, RevenueCrmPerson } from "@/lib/operators/revenue/crm";\n', "")
    .replace('import { createSupabaseAdmin } from "@/lib/server/supabase-admin";\n', "")
    .replace(/type SupabaseAdmin =[^\n]+\n/, "")
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(temp, "context.mjs");
  fs.writeFileSync(file, code, "utf8");
  const context = await import(pathToFileURL(path.resolve(file)).href + `?t=${Date.now()}`);

  const commercial = context.buildRevenueContext({
    provider: "gmail",
    threadId: "thread-1",
    subject: "Proposal and pricing for expansion",
    body: "The active opportunity is ready for negotiation. Can we schedule a call?",
    receivedAt: "2026-09-08T10:00:00.000Z",
    person: { id: "p1", email: "buyer@example.com", firstName: "Buyer", lastName: "Person", companyName: "Acme", title: "VP", ownerName: null },
    company: { id: "a1", name: "Acme", website: null, industry: null, ownerId: null, ownerName: "Owner" },
    opportunity: { id: "d1", name: "Acme Expansion", stage: "Negotiation", isClosed: false, amount: 17500, currency: "EUR", closeDate: null, ownerId: null, ownerName: "Owner" },
    directSignals: ["pricing"],
    requestSignals: ["proposal"],
    contextSignals: ["expansion"],
  });
  assert.equal(commercial.deal.amount, 17500);
  assert.equal(commercial.businessContext.deal.currency.value, "EUR");
  assert.equal(commercial.businessContext.deal.amount.reliability, "verified");
  assert.equal(commercial.preparationState, "ready_to_follow_up");
  assert.ok(commercial.priorityReasons.length > 0);

  const missing = context.buildRevenueContext({ provider: "microsoft", subject: "Pricing request", body: "Please send pricing." });
  assert.equal(missing.preparationState, "needs_commercial_information");
  assert.equal(missing.businessContext.deal.amount.reliability, "missing");
  assert.equal(missing.businessContext.deal.currency.reliability, "missing");
  console.log("revenue-context-smoke: verified deal context, deterministic commercial priority, and conservative missing-value behavior passed.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
