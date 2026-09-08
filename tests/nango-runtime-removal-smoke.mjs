import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.dependencies?.["@nangohq/node"], undefined);
assert.equal(packageJson.dependencies?.["@nangohq/frontend"], undefined);
assert.doesNotMatch(read("pnpm-lock.yaml"), /@nangohq\//);

for (const file of [
  "src/lib/operators/executors/hubspot.ts",
  "src/app/api/connectors/disconnect/route.ts",
  "src/app/api/connectors/hubspot/auth/route.ts",
  "src/app/api/connectors/hubspot/callback/route.ts",
  "src/lib/connectors/truth.ts",
]) {
  assert.doesNotMatch(read(file), /@nangohq|@\/lib\/integrations\/nango|new Nango\s*\(/, `${file} still imports or instantiates Nango`);
}

assert.equal(fs.existsSync(path.join(root, "src/lib/integrations/nango.ts")), false);
const nangoRouteRoot = path.join(root, "src/app/api/connectors/nango");
const nangoRouteFiles = fs.existsSync(nangoRouteRoot)
  ? fs.readdirSync(nangoRouteRoot, { recursive: true }).filter((entry) => typeof entry === "string" && entry.endsWith(".ts"))
  : [];
assert.equal(nangoRouteFiles.length, 0, "an active Nango API route still exists");
const registry = read("src/lib/connectors/registry.ts");
const availableNango = [...registry.matchAll(/authType:\s*"nango"[\s\S]{0,180}?status:\s*"available"/g)];
assert.equal(availableNango.length, 0, "an available connector still depends on Nango");
assert.doesNotMatch(read(".env.example"), /NANGO_SECRET_KEY|NANGO_HOST|NANGO_WEBHOOK_SECRET/);

console.log("nango-runtime-removal-smoke: passed");
