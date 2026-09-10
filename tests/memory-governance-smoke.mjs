import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-memory-governance-"));

async function loadModel() {
  const source = fs.readFileSync(path.join(root, "src/lib/memory/model.ts"), "utf8")
    .replace('import type { MemoryCategory, MemoryEntry, MemoryFreshness, MemorySourceType } from "@/lib/os/types";\n', "");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(temp, "model.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(`${pathToFileURL(file).href}?v=${Date.now()}`);
}

const row = (overrides = {}) => ({
  id: "memory-1",
  type: "process",
  label: "Operating profile",
  summary: "Owner context",
  content: "Industry: Software",
  tags: ["onboarding"],
  agent_scope: ["revenue", "support"],
  field_count: 1,
  updated_at: new Date().toISOString(),
  ...overrides,
});

try {
  const model = await loadModel();
  const owner = model.normalizeMemoryRow(row({ canonical_key: "business.industry", category: "business", source_type: "owner_confirmed", reliability: "verified", source_label: "Owner-confirmed onboarding", last_confirmed_at: new Date().toISOString() }));
  assert.equal(owner.sourceType, "owner_confirmed");
  assert.equal(owner.reliability, "verified");
  assert.equal(owner.sourceLabel, "Owner-confirmed onboarding");
  assert.deepEqual(owner.operatorRelevance, ["revenue", "support"]);

  const observed = model.normalizeMemoryRow(row({ id: "memory-2", canonical_key: "support.sla", category: "support", source_type: "connector_observed", source_connector: "zendesk", source_ref: "zendesk:ticket-1", last_observed_at: new Date().toISOString() }));
  assert.equal(observed.sourceType, "connector_observed");
  assert.equal(observed.reliability, "observed");
  assert.equal(observed.freshness, "fresh");

  const derived = model.normalizeMemoryRow(row({ id: "memory-3", canonical_key: "delivery.risk", category: "delivery", source_type: "derived", reliability: "derived", confidence: "low", evidence: ["workflow:123"], updated_at: new Date().toISOString() }));
  assert.equal(derived.reliability, "derived");
  assert.equal(derived.confidence, "low");
  assert.deepEqual(derived.evidence, ["workflow:123"]);

  const conflict = model.resolveMemoryEntries([
    owner,
    model.normalizeMemoryRow(row({ id: "memory-4", canonical_key: "business.industry", category: "business", source_type: "connector_observed", reliability: "observed", content: "Industry: Fintech", source_connector: "hubspot" })),
  ]);
  assert.equal(conflict.length, 2, "conflicting evidence is preserved");
  assert.ok(conflict.every((entry) => entry.conflict), "both sides are marked for review");
  assert.equal(conflict[0].reliability, "verified", "fresh verified evidence ranks first");

  const stale = model.normalizeMemoryRow(row({ id: "memory-5", category: "support", source_type: "connector_observed", reliability: "observed", last_observed_at: new Date(Date.now() - 4 * 86_400_000).toISOString() }));
  assert.equal(stale.reliability, "stale");
  assert.equal(stale.freshness, "stale");

  const observedVersion = model.normalizeMemoryRow(row({ id: "memory-observed", canonical_key: "support.sla", category: "support", source_type: "connector_observed", reliability: "observed", source_connector: "zendesk", content: "SLA: 12h" }));
  const ownerCorrection = model.normalizeMemoryRow(row({ id: "memory-correction", canonical_key: "support.sla", category: "support", source_type: "owner_confirmed", reliability: "verified", content: "SLA: 24h", supersedes_id: "memory-observed", policy_relevant: true }));
  const fact = model.resolveMemoryFacts([observedVersion, ownerCorrection])[0];
  assert.equal(fact.effective.id, "memory-correction", "owner correction becomes effective without erasing provider evidence");
  assert.equal(fact.alternates[0].id, "memory-observed", "superseded provider evidence remains queryable");
  assert.equal(model.memoryDependenciesForEntries([ownerCorrection]).length, 1, "only policy-relevant effective facts become approval dependencies");
  assert.equal(model.memoryDependenciesForEntries([{ ...ownerCorrection, policyRelevant: false }, { ...ownerCorrection, id: "connector-fact", sourceType: "connector_observed", policyRelevant: false }]).length, 0, "non-policy context remains outside approval dependencies");
  assert.notEqual(model.memoryDependencyFingerprint(model.memoryDependenciesForEntries([ownerCorrection])), model.memoryDependencyFingerprint(model.memoryDependenciesForEntries([{ ...ownerCorrection, content: "SLA: 12h" }])), "material Memory value changes alter the dependency fingerprint");

  const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260910_memory_governance.sql"), "utf8");
  for (const field of ["canonical_key", "source_type", "source_ref", "reliability", "confidence", "last_observed_at", "last_confirmed_at", "stale_after", "evidence", "supersedes_id"]) assert.match(migration, new RegExp(field));
  const actions = fs.readFileSync(path.join(root, "src/app/app/memory/actions.ts"), "utf8");
  assert.match(actions, /requireWorkspaceAdmin/);
  assert.match(actions, /connector_observed/);
  assert.match(actions, /memory_confirmed/);
  assert.match(actions, /correctMemoryEntryAction/);
  const materializer = fs.readFileSync(path.join(root, "src/lib/memory/materialize.ts"), "utf8");
  assert.match(materializer, /onConflict: "id"/);
  assert.match(materializer, /supersedes_id/);
  assert.match(materializer, /memory_materialization_failed/);
  const approvalScope = fs.readFileSync(path.join(root, "src/lib/policies/approval-scope.ts"), "utf8");
  assert.match(approvalScope, /memoryFingerprint/);
  const executionPolicy = fs.readFileSync(path.join(root, "src/lib/policies/execution-policy.ts"), "utf8");
  assert.match(executionPolicy, /memory_context_unavailable/);
  const workflowStore = fs.readFileSync(path.join(root, "src/lib/workflows/store.ts"), "utf8");
  assert.match(workflowStore, /PROMOTION_RULES/);
  assert.match(workflowStore, /threshold: 3/);
  const page = fs.readFileSync(path.join(root, "src/app/app/memory/page.tsx"), "utf8");
  assert.match(page, /Filter by category/);
  assert.match(page, /Filter by reliability/);
  assert.match(page, /Owner-confirmed/);
  console.log("memory-governance-smoke: owner, observed, derived, freshness, conflict, provenance, and admin mutation contracts passed.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
