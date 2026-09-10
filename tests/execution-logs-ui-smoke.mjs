import assert from "node:assert/strict";
import fs from "node:fs";

const logsPage = fs.readFileSync("src/app/app/logs/page.tsx", "utf8");
const types = fs.readFileSync("src/lib/os/types.ts", "utf8");
const provider = fs.readFileSync("src/lib/os/app-provider.tsx", "utf8");
const connectors = fs.readFileSync("src/app/app/connectors/page.tsx", "utf8");

assert.match(logsPage, /function actorFor/);
assert.match(logsPage, /Auterim system/);
assert.match(logsPage, /Operator automation/);
assert.match(logsPage, /title=\{`\$\{actor\.label\}/);
assert.match(logsPage, /<tr><th>Time<\/th><th>Actor<\/th><th>Event<\/th><th>Subject<\/th>/);
assert.match(logsPage, /function isHumanInitiatedLog/);
assert.match(logsPage, /STATUS_TONE\[l\.status\]/);
assert.match(types, /actorType\?: "user" \| "system" \| "operator"/);
assert.match(provider, /function userActor/);
assert.match(provider, /actorType: "user"/);
assert.doesNotMatch(provider, /connected.*by operator/);
assert.match(connectors, /whatAuterimCanDoNow\.slice\(0, 5\)/);
assert.match(connectors, /\+\$\{whatAuterimCanDoNow\.length - 5\} more/);

console.log("execution-logs-ui-smoke: premium log attribution and bounded capability summary contracts passed.");
