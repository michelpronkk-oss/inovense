import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const state = read("src/lib/operators/product-state.ts");
const connectors = read("src/app/app/connectors/page.tsx");
const dashboard = read("src/components/dashboard/overview.tsx");
const briefing = read("src/components/operators/workforce-briefing.tsx");

assert.match(state, /href: connectorRemediationHref\(connectorKey\)/);
assert.match(state, /\/connectors\?setup=\$\{encodeURIComponent\(connectorKey\)\}/);
assert.match(state, /label: `Fix \$\{connectorName\}`/);
assert.match(state, /severity: issueImpact === "required" \? "blocking" : "attention"/);
assert.match(state, /impact: issues\.some\(\(issue\) => issue\.severity === "blocking"\) \? "required" : "optional"/);
assert.match(state, /label: `Configure \$\{connectorDisplayName\(input\.coreConfiguration\.connectorKey\)\}`/);
assert.match(state, /href: `\/connectors\?setup=\$\{input\.coreConfiguration\.connectorKey\}-project`/);
assert.match(state, /workspacePolicy\.trello\.defaultBoardId && workspacePolicy\.trello\.defaultListId/);
assert.match(state, /typeof metadata\.selectedProjectId === "string"/);

for (const mapping of [
  'google_drive: "google_drive"',
  'asana: "asana"',
  'jira: "jira"',
  '"slack-channel": "slack"',
  '"trello-project": "trello"',
  '"asana-project": "asana"',
  '"jira-project": "jira"',
  '"drive-folders": "google_drive"',
]) assert.ok(connectors.includes(mapping), `missing exact connector remediation mapping: ${mapping}`);

assert.match(dashboard, /item\.nextAction\.href/);
assert.match(dashboard, /item\.requiredActions\[0\]\.reason/);
assert.match(briefing, /action\.href/);
assert.match(briefing, /action\.impact/);
assert.doesNotMatch(dashboard, /Unavailable: \{item\.degraded/);

console.log("operator-attention-routing-smoke: exact connector routing and actionable attention contracts passed.");
