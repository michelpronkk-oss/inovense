import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "src");

const clientEntries = [
  "src/lib/connectors/truth.ts",
  "src/lib/connectors/salesforce-truth.ts",
  "src/lib/operators/product-state-types.ts",
  "src/app/app/agents/page.tsx",
];

const forbiddenImportPatterns = [
  /^node:/,
  /^(?:server-only|server-only\/)/,
  /@\/lib\/server(?:\/|$)/,
  /@\/lib\/connectors\/(?:salesforce|salesforce-rest|crypto|refresh-lock)(?:$|\/)/,
  /@\/lib\/(?:auth|secrets|tokens?)(?:$|\/)/,
];

const forbiddenSourcePatterns = [
  /from\s+["']server-only["']/,
  /\bcreateSupabaseAdmin\b/,
  /\bprocess\.env\.(?!NEXT_PUBLIC_[A-Z0-9_]+|NODE_ENV\b)/,
  /\bprocess\.env\s*\[/,
  /\b(?:encrypt|decrypt|refreshAccessToken|storeRefreshToken|accessToken|refreshToken)\b/,
];

function resolveInternalImport(importer, specifier) {
  if (!specifier.startsWith("@/")) return null;
  const absoluteBase = path.join(sourceRoot, specifier.slice(2));
  const candidates = [absoluteBase, `${absoluteBase}.ts`, `${absoluteBase}.tsx`, `${absoluteBase}.js`, `${absoluteBase}.jsx`, path.join(absoluteBase, "index.ts"), path.join(absoluteBase, "index.tsx")];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? (() => {
    throw new Error(`Unable to resolve internal import ${specifier} from ${importer}`);
  })();
}

function importsFrom(source) {
  const imports = [];
  const importRegex = /^\s*import\s+(type\s+)?[^;]*?\sfrom\s+["']([^"']+)["'];?/gm;
  for (const match of source.matchAll(importRegex)) {
    imports.push({ specifier: match[2], typeOnly: Boolean(match[1]) });
  }
  const sideEffectRegex = /^\s*import\s+["']([^"']+)["'];?/gm;
  for (const match of source.matchAll(sideEffectRegex)) {
    imports.push({ specifier: match[1], typeOnly: false });
  }
  return imports;
}

const visited = new Set();
const queue = clientEntries.map((relative) => path.join(repoRoot, relative));
const violations = [];

while (queue.length) {
  const file = queue.shift();
  if (visited.has(file)) continue;
  visited.add(file);
  assert.ok(fs.existsSync(file), `Boundary entry is missing: ${path.relative(repoRoot, file)}`);
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(repoRoot, file);

  for (const pattern of forbiddenSourcePatterns) {
    if (pattern.test(source)) violations.push(`${relative}: forbidden source pattern ${pattern}`);
  }

  for (const { specifier, typeOnly } of importsFrom(source)) {
    for (const pattern of forbiddenImportPatterns) {
      if (pattern.test(specifier)) violations.push(`${relative}: forbidden import ${specifier}`);
    }
    if (typeOnly) continue;
    const resolved = resolveInternalImport(relative, specifier);
    if (resolved) queue.push(resolved);
  }
}

const truth = fs.readFileSync(path.join(sourceRoot, "lib/connectors/truth.ts"), "utf8");
assert.match(truth, /from\s+["']@\/lib\/connectors\/salesforce-truth["']/);
assert.doesNotMatch(truth, /from\s+["']@\/lib\/connectors\/salesforce(?:["']|\/)/);

const salesforceRuntime = fs.readFileSync(path.join(sourceRoot, "lib/connectors/salesforce.ts"), "utf8");
const salesforceRestRuntime = fs.readFileSync(path.join(sourceRoot, "lib/connectors/salesforce-rest.ts"), "utf8");
const productStateRuntime = fs.readFileSync(path.join(sourceRoot, "lib/operators/product-state.ts"), "utf8");
for (const [label, source] of [["salesforce.ts", salesforceRuntime], ["salesforce-rest.ts", salesforceRestRuntime], ["product-state.ts", productStateRuntime]]) {
  assert.match(source, /import\s+["']server-only["'];/, `${label} must be server-only`);
}

assert.equal(violations.length, 0, violations.join("\n"));
console.log(`Connector truth boundary smoke passed (${visited.size} client-reachable modules checked).`);
