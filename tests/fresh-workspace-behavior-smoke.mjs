import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Exercise the real provisioning adapter with a stateful RPC boundary. The
// database function remains the authority for atomicity; this test verifies
// that the production server adapter preserves its retry/idempotency contract
// and fails closed when the RPC does not return a workspace.
const source = fs.readFileSync("src/lib/server/provisioning.ts", "utf8");
const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-fresh-workspace-"));
const modulePath = path.join(tempDir, "provisioning.mjs");
fs.writeFileSync(modulePath, code, "utf8");

try {
  const { provisionInitialWorkspace } = await import(`${pathToFileURL(modulePath).href}?fresh=${Date.now()}`);
  const calls = [];
  let persistedRow = null;
  const supabase = {
    rpc(name, args) {
      calls.push({ name, args });
      if (!persistedRow) {
        persistedRow = {
          workspace_id: "ws-fresh-business",
          workspace_name: "Fresh Business",
          role_key: "owner",
          onboarding_completed_at: null,
          created: true,
        };
      } else {
        persistedRow = { ...persistedRow, created: false };
      }
      return Promise.resolve({ data: [persistedRow], error: null });
    },
  };

  const first = await provisionInitialWorkspace(supabase, { fullName: "Owner One", companyName: "Fresh Business" });
  const retry = await provisionInitialWorkspace(supabase, { fullName: "Owner One", companyName: "Fresh Business" });

  assert.deepEqual(first, {
    workspaceId: "ws-fresh-business",
    workspaceName: "Fresh Business",
    roleKey: "owner",
    onboardingCompletedAt: null,
    created: true,
  });
  assert.deepEqual(retry, { ...first, created: false }, "a retry must return the existing workspace without changing identity");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], {
    name: "provision_initial_workspace",
    args: { p_full_name: "Owner One", p_company_name: "Fresh Business" },
  });

  await assert.rejects(
    () => provisionInitialWorkspace({ rpc: async () => ({ data: null, error: null }) }),
    /Workspace provisioning did not return a workspace/,
    "an empty RPC result must not create a client-side workspace state",
  );
  await assert.rejects(
    () => provisionInitialWorkspace({ rpc: async () => ({ data: null, error: { message: "auth.uid required" } }) }),
    /auth\.uid required/,
    "an RPC authorization failure must remain visible to the caller",
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("fresh-workspace-behavior-smoke: provisioning retry identity, RPC forwarding, and fail-closed errors passed.");
