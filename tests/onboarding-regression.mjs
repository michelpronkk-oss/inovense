import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("src/app/app/onboarding/page.tsx");
const actions = read("src/app/app/onboarding/actions.ts");
const css = read("src/app/app/onboarding/styles-onboarding.css");

assert.match(page, /padStart\(2, "0"\).*\/ 05/, "onboarding must expose five-step progress");
assert.match(page, /getOnboardingDraftAction/, "onboarding must restore a server-authoritative draft");
assert.match(page, /saveOnboardingDraftAction/, "continue must save a resumable draft");
assert.match(page, /completeOnboardingAction/, "activation must use the final server action");
assert.match(page, /role="radio"/, "first priority must use accessible radio semantics");
assert.match(page, /Gmail/, "systems must include Gmail");
assert.match(page, /HubSpot/, "systems must include HubSpot");
assert.match(page, /Slack/, "systems must include Slack");
assert.match(page, /Trello/, "systems must include Trello");
assert.match(page, /router\.replace\("\/activate\?first=1"\)/, "activation must route canonically");

assert.match(actions, /getVerifiedSupabaseUser\(\)/, "writes must use a verified session");
assert.match(actions, /requireWorkspaceAdmin/, "writes must authorize the active workspace");
assert.match(actions, /onboarding_completed_at: new Date\(\)\.toISOString\(\)/, "only final activation must complete onboarding");
assert.match(actions, /onboarding_version: ONBOARDING_VERSION/, "final activation must version onboarding");
assert.match(actions, /full_name: draft\.fullName/, "profile name must be persisted securely");
assert.match(actions, /onboarding_step: draft\.step/, "draft step must survive refresh");
assert.match(css, /font-size:16px/, "mobile focused inputs must be at least 16px to avoid iOS zoom");
assert.match(css, /@media\(max-width:620px\)/, "onboarding must include a compact mobile layout");
assert.match(css, /grid-template-columns:1fr/, "mobile connector/review layouts must collapse to one column");

console.log("Onboarding regression contracts passed.");
