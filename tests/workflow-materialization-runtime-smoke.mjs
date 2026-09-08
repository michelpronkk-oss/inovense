import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmp = path.join(root, "tests", ".tmp-workflow-materialization");
fs.mkdirSync(tmp, { recursive: true });
try {
  let source = fs.readFileSync("src/lib/workflows/materialize.ts", "utf8");
  source = source.replace(/^import[^\n]+\n/gm, "");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmp, "materialize.mjs");
  fs.writeFileSync(file, code);
  const { sanitizeWorkflowText } = await import(pathToFileURL(file).href);
  assert.equal(sanitizeWorkflowText("  Resolve\n\u0000case\t", 80), "Resolve case");
  assert.equal(sanitizeWorkflowText("x".repeat(40), 12), "x".repeat(12));
  console.log("Workflow materialization runtime smoke: control stripping and bounded provider text verified.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
