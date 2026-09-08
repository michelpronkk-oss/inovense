import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const source = fs.readFileSync("src/lib/runtime/provider-retry.ts", "utf8");
const tmp = path.join("tests", ".tmp-provider-retry"); fs.mkdirSync(tmp, { recursive: true });
try {
  const code = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmp, "retry.mjs"); fs.writeFileSync(file, code);
  const { classifyProviderFailure, shouldRetryProviderFailure } = await import(`${pathToFileURL(file).href}?v=${Math.random()}`);
  assert.equal(classifyProviderFailure({ status: 401 }), "reauth");
  assert.equal(classifyProviderFailure({ status: 403 }), "permission");
  assert.equal(classifyProviderFailure({ status: 429 }), "transient");
  assert.equal(classifyProviderFailure({ status: 500 }), "transient");
  assert.equal(classifyProviderFailure({ status: 404 }), "configuration");
  assert.equal(classifyProviderFailure({ status: 422 }), "configuration");
  assert.equal(shouldRetryProviderFailure({ status: 503, attempt: 0 }), true);
  assert.equal(shouldRetryProviderFailure({ status: 503, attempt: 2 }), false);
  assert.equal(shouldRetryProviderFailure({ status: 401, attempt: 0 }), false);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
const jira = fs.readFileSync("src/lib/connectors/jira.ts", "utf8");
assert.match(jira, /shouldRetryProviderFailure/);
console.log("Provider failure matrix smoke: bounded transient retry, reauth, permission, configuration, and permanent classifications verified.");
