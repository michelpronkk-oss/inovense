import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const navigation = read("src/lib/app-navigation.ts");
const sidebar = read("src/components/dashboard/sidebar.tsx");
const styles = read("src/app/app/dashboard.css");

const routeMatches = [...navigation.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(routeMatches).size, routeMatches.length, "navigation must not contain duplicate routes");
for (const href of routeMatches) {
  const relative = href === "/" ? "src/app/app/page.tsx" : `src/app/app${href}/page.tsx`;
  assert.ok(fs.existsSync(path.join(root, relative)), `navigation route must exist: ${href}`);
}

for (const label of ["Operations", "Administration", "Support"]) assert.match(navigation, new RegExp(`label: "${label}"`));
for (const label of ["Support", "Feedback", "Roadmap"]) assert.match(navigation, new RegExp(`label: "${label}"`));
assert.ok(navigation.indexOf('id: "support"') < navigation.indexOf('id: "feedback"') && navigation.indexOf('id: "feedback"') < navigation.indexOf('id: "roadmap"'), "support item order must remain support, feedback, roadmap");
assert.ok(navigation.indexOf('id: "connectors"') < navigation.indexOf('id: "memory"'), "connectors should precede memory in Operations");
const operationsStart = navigation.indexOf('label: "Operations",\n    items:');
const administrationStart = navigation.indexOf('label: "Administration",\n    items:');
const supportStart = navigation.indexOf('label: "Support",\n    items:');
const operations = navigation.slice(operationsStart, administrationStart);
const administration = navigation.slice(administrationStart, supportStart);
const support = navigation.slice(supportStart);
assert.doesNotMatch(operations, /id: "(?:team|policies|api-keys|plans|settings)"/, "administration items must not leak into Operations");
assert.match(administration, /id: "api-keys"/, "mobile More and desktop must share API keys");
for (const group of [operations, administration, support]) {
  const labels = [...group.matchAll(/id: "[^"]+", label: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(labels).size, labels.length, "labels must be unique within a navigation group");
}
assert.match(navigation, /return current === href \|\| current\.startsWith\(`\$\{href\}\/`\);/);
assert.match(navigation, /rawPath\.startsWith\("\/app\/"\)/);
assert.match(navigation, /mobileMoreSections/);
assert.match(sidebar, /APP_NAVIGATION_SECTIONS/);
assert.match(sidebar, /mobileMoreSections\(\)/);
assert.match(sidebar, /aria-current/);
assert.match(styles, /\.os-nav:focus-visible/);
assert.match(styles, /\.os-mobile-menu-feedback:focus-visible/);
assert.match(styles, /min-height: 40px/);

console.log("sidebar navigation smoke checks passed");
