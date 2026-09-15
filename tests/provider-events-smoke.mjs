import assert from "node:assert/strict";
import fs from "node:fs";
import esbuild from "esbuild";

const source = fs.readFileSync("src/lib/provider-events/types.ts", "utf8");
const { code } = await esbuild.transform(source, { loader: "ts", format: "esm", target: "node22" });
const mod = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const base = {
  workspaceId: "ws-one", connectorKey: "gmail", provider: "gmail", providerAccountId: "sha256-account",
  externalEventId: "sub:message-1", eventType: "gmail.history.changed", sourceMode: "push",
  metadata: { historyId: "123", body: "must be removed", token: "must be removed", attempt: 1 },
};
const first = mod.normalizeProviderEvent(base, "2026-09-15T10:00:00.000Z");
const second = mod.normalizeProviderEvent(base, "2026-09-15T10:00:01.000Z");
assert.equal(first.id, second.id, "same provider identity is deterministic across delivery time");
assert.equal(first.connectorId, second.connectorId, "connector identity is stable");
assert.equal(first.metadata.historyId, "123");
assert.equal(first.metadata.body, undefined);
assert.equal(first.metadata.token, undefined);
assert.throws(() => mod.normalizeProviderEvent({ ...base, providerAccountId: "person@example.com" }), /account_reference_invalid/);
assert.throws(() => mod.normalizeProviderEvent({ ...base, sourceMode: "unknown" }), /source_mode_invalid/);
const burst = [...Array(100)].map(() => first.id).concat([...Array(99)].map((_, i) => mod.normalizeProviderEvent({ ...base, externalEventId: `sub:${i}` }).id));
assert.equal(new Set(burst).size, 100, "100 duplicate and 100 unique notifications produce 100 logical events");
console.log("Provider event smoke: deterministic identity, sensitive metadata filtering, validation, and burst dedupe verified.");
