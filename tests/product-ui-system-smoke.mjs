import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");

const primitives = read("src/components/product-ui/page-primitives.tsx");
for (const primitive of ["PageHeader", "SectionHeader", "AttentionPanel", "EmptyState", "CapabilityList"]) {
  assert.match(primitives, new RegExp(`export function ${primitive}`), `${primitive} must remain available to authenticated routes`);
}

const css = read("src/app/app/dashboard.css");
for (const token of ["--surface:", "--radius-md:", "--space-4:", "--cyan:", "focus-visible", "prefers-reduced-motion", "@media (max-width: 700px)"]) {
  assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `authenticated design system must include ${token}`);
}

const appLayout = read("src/app/app/layout.tsx");
assert.doesNotMatch(appLayout, /radial-gradient/, "the authenticated shell must not introduce decorative background gradients");

for (const route of ["agents/page.tsx", "approvals/page.tsx", "workflows/page.tsx", "logs/page.tsx"]) {
  const source = read(`src/app/app/${route}`);
  assert.match(source, /PageHeader/, `${route} must use the shared product page hierarchy`);
}

assert.match(read("src/components/operators/status-badge.tsx"), /className="os-status"/, "operator status remains centralized");
console.log("Product UI system smoke: shared hierarchy, tokens, accessibility, responsive rules, and canonical status presentation are present.");
