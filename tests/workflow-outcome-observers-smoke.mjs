import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";
const tmp = "tests/.tmp-workflow-outcomes"; fs.mkdirSync(tmp, { recursive: true });
try {
  const source = fs.readFileSync("src/lib/workflows/outcome-observers.ts", "utf8").replace(/import type[^\n]+\n/, "");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmp, "observer.mjs"); fs.writeFileSync(file, code);
  const observer = await import(pathToFileURL(path.resolve(file)).href);
  assert.equal(observer.observeProjectRecovery({ workflowId: "w", taskRef: "t", status: "open", linkedActionExecuted: true }), null);
  assert.equal(observer.observeProjectRecovery({ workflowId: "w", taskRef: "t", status: "completed", linkedActionExecuted: true })?.attributionLevel, "influenced");
  assert.equal(observer.observeZendeskResolution({ workflowId: "w", ticketId: "1", status: "solved", linkedActionExecuted: false })?.attributionLevel, "observed");
  assert.equal(observer.observeRevenueFollowUp(), null, "an email send cannot manufacture pipeline impact");
  console.log("Workflow outcome observers: provider-state recovery/resolution and conservative revenue boundary verified.");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
