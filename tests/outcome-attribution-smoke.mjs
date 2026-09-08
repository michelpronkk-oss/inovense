import assert from "node:assert/strict";
import fs from "node:fs";
const source = fs.readFileSync("src/lib/workflows/engine.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260908_cross_connector_workflows.sql", "utf8");
assert.match(source, /"observed" \| "influenced" \| "direct"/);
assert.match(source, /if \(!input\.hasObservedProviderState\) return null/);
assert.match(migration, /evidence_refs jsonb not null/);
assert.doesNotMatch(source, /roi|hours saved|caused/i);
console.log("Outcome attribution smoke: evidence-backed observed/influenced/direct levels and no ROI claim verified.");
