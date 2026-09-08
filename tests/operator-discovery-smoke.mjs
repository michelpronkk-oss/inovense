import assert from "node:assert/strict";
import fs from "node:fs";

const list = fs.readFileSync("src/app/app/agents/page.tsx", "utf8");
const briefing = fs.readFileSync("src/components/operators/workforce-briefing.tsx", "utf8");
const readiness = fs.readFileSync("src/lib/operators/readiness.ts", "utf8");
const activation = fs.readFileSync("src/components/operators/activation-toggle.tsx", "utf8");
assert.match(list, /One project system/);
assert.match(list, /Jira", "Asana", "Trello/);
assert.match(list, /Available to unlock/);
assert.match(list, /View operator/);
assert.match(briefing, /Connect one project system/);
assert.match(briefing, /Optional context/);
assert.match(briefing, /No issues need attention right now/);
assert.doesNotMatch(briefing, /readinessPercent/);
assert.match(readiness, /Trello, Asana, or Jira/);
assert.match(activation, /workflow history, and recorded outcomes stay available/);
console.log("Operator discovery smoke: visible roles, alternative system capability, explicit activation, and non-technical unlock language verified.");
