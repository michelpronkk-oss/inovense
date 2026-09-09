import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const activity = read("src/app/app/activity/page.tsx");
const connectors = read("src/app/app/connectors/page.tsx");
const workflows = read("src/app/app/workflows/page.tsx");
const memory = read("src/app/app/memory/page.tsx");
const activation = read("src/components/operators/activation-toggle.tsx");
const briefing = read("src/components/operators/workforce-briefing.tsx");
const avatar = read("src/components/operators/runtime-avatar.tsx");

assert.match(activity, /useState<Filter\[\]>/, "Activity keeps a multi-select filter state");
assert.match(activity, /role="menuitemcheckbox"/, "Activity filters expose checkbox semantics");
assert.match(activity, /Filter\{selectedFilters\.length/, "Activity shows the active filter count");
assert.match(activity, /setSelectedFilters\(\[\]\)/, "Activity can clear selected filters");
assert.doesNotMatch(activity, /key: "all", label: "All"/, "All is the empty filter state, not another button");

assert.match(connectors, /connector-finder-category/, "Connector picker has a category select");
assert.match(connectors, /prioritizedAvailable/, "Connector picker prioritizes its inventory");
assert.match(connectors, /isRealConnectedConnector\(right\)/, "Connected systems sort first");
assert.match(connectors, /connector-finder-results/, "Only connector results scroll inside the finder");
assert.doesNotMatch(connectors, /connector-discovery-filters/, "Connector picker no longer renders category pills");

assert.match(workflows, /getRealConnectedConnectors\(state\.connectors\)/, "Workflow guidance reads real connection truth");
assert.match(workflows, /Activate an operator/, "Workflow guidance can direct an inactive workspace to activation");
assert.match(workflows, /Your operators are monitoring/, "Workflow guidance has an active monitoring state");

assert.match(activation, /operator-activation-cta/, "Ready operators use one clear activation CTA");
assert.match(briefing, /product\?\.lifecycle !== "ready_to_activate"/, "Shared briefing does not duplicate the ready activation CTA");
for (const asset of ["revenue-operator.png", "client-flow-operator.png", "operations-operator.png", "support-operator.png"]) assert.match(avatar, new RegExp(asset.replace(".", "\\.")), `${asset} is a canonical runtime asset`);

assert.match(memory, /<dl className="memory-definition-grid">/, "Memory details use a definition grid");
assert.match(memory, /memory-entry-chevron/, "Memory expander has a named chevron affordance");
assert.match(memory, /aria-expanded=\{isOpen\}/, "Memory expander exposes its state");

console.log("release-candidate-ui-smoke: activity, connector, workflow, operator, asset, and memory contracts passed.");
