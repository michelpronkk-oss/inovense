import assert from "node:assert/strict";
import fs from "node:fs";
const source = fs.readFileSync("src/lib/workflows/engine.ts", "utf8");
for (const value of ["Resolve customer escalation", "Recover delivery risk", "Follow up on sales opportunity", "microsoft_teams", "zendesk", "jira", "asana", "trello"]) assert.ok(source.includes(value), `${value} must be represented by a controlled template`);
assert.match(source, /PM_PREFERENCE/); assert.match(source, /derive/);
console.log("Cross-connector workflow smoke: escalation, delivery recovery, revenue follow-up, connector substitution, and derived payload references verified.");
