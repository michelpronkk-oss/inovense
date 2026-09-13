import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const triggerConfig = readFileSync(resolve(repoRoot, "trigger.config.ts"), "utf8");

assert.match(triggerConfig, /runtime:\s*["']node-22["']/);

const taskDefinitions = [
  ["src/trigger/workflow-recovery.ts", ["workflow-recovery-scan"]],
  ["src/trigger/trial-lifecycle.ts", ["trial-lifecycle"]],
  ["src/trigger/revenue-operator-scan.ts", ["revenue-operator-scan", "revenue-operator-daily-scan"]],
];

for (const [file, taskIds] of taskDefinitions) {
  const source = readFileSync(resolve(repoRoot, file), "utf8");
  assert.match(source, /import\s*\{\s*createSupabaseAdmin\s*\}\s*from\s*["']@\/lib\/server\/supabase-admin["']/);
  for (const taskId of taskIds) {
    assert.ok(source.includes(`id: "${taskId}"`), `${taskId} must remain registered in ${file}`);
  }
}

const runtimeProbe = `
import assert from "node:assert/strict";
import { createSupabaseAdmin } from "./src/lib/server/supabase-admin.ts";

assert.match(process.version, /^v22\\./, "Trigger's configured Node 22 runtime is required");
assert.equal(typeof globalThis.WebSocket, "function", "Node 22 must provide its native WebSocket");
assert.equal(typeof globalThis.window, "undefined", "the admin client must not need a browser window");
assert.equal(typeof globalThis.document, "undefined", "the admin client must not need a browser document");

const client = createSupabaseAdmin();
assert.equal(client.realtime.transport, globalThis.WebSocket, "Supabase should use Node's native WebSocket transport");
assert.equal(client.auth.persistSession, false, "admin auth must remain non-persistent");
assert.equal(typeof client.from, "function", "the service-role database client should initialize");
console.log("Trigger Supabase admin runtime smoke passed");
`;

const runtimeResult = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "--eval", runtimeProbe],
  {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "trigger-runtime-smoke-service-role-key",
    },
  },
);

assert.equal(runtimeResult.status, 0, runtimeResult.stderr || runtimeResult.stdout || "Node runtime probe failed");
assert.match(runtimeResult.stdout, /Trigger Supabase admin runtime smoke passed/);

console.log("Trigger task Supabase runtime smoke passed");
