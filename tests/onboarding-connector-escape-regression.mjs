import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Regression coverage for the onboarding escape-hatch bug: closing the
// "Choose a plan" connector gate during onboarding must never silently drop
// the user into the normal dashboard with full navigation before onboarding
// (connector -> readiness -> operator activation -> monitoring) is actually
// complete. See src/app/app/app-shell.tsx, src/app/app/layout.tsx,
// src/app/app/connectors/page.tsx, and src/lib/onboarding/return-contract.ts.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const layout = read("src/app/app/layout.tsx");
const shell = read("src/app/app/app-shell.tsx");
const connectors = read("src/app/app/connectors/page.tsx");
const onboardingPage = read("src/app/app/onboarding/page.tsx");
const returnContract = read("src/lib/onboarding/return-contract.ts");
const onboardingActions = read("src/app/app/onboarding/actions.ts");

// D. Direct navigation to a normal route while onboarding is incomplete must
// redirect server-side - one canonical guard covering every /app/* route.
assert.match(layout, /const onboardingDone = Boolean\(gateway\.onboardingCompletedAt\)/, "onboarding completion must be read from the server gateway");
assert.match(layout, /!onboardingDone && pathname !== "\/onboarding" && pathname !== ONBOARDING_CONNECTOR_PATH/, "every route except /onboarding and the allowlisted connector resume path must redirect while onboarding is incomplete");
assert.match(layout, /onboardingCompletedAt = gateway\.onboardingCompletedAt/, "the resolved onboarding completion must be threaded to the client shell, not re-derived from client state");
assert.match(layout, /<AppShell onboardingCompletedAt=\{onboardingCompletedAt\}>/, "AppShell must receive the server-authoritative onboarding completion marker");

// The concrete escape hatch: /connectors is allowlisted by the server guard
// (for OAuth resumability) but must never render full app navigation while
// onboarding is incomplete - that sidebar is what let users reach the
// dashboard after closing the plan gate.
assert.match(shell, /onboardingCompletedAt \}: \{ children: React\.ReactNode; onboardingCompletedAt: string \| null \}/, "AppShell must accept the server-resolved onboarding completion as a prop, not client/local state");
assert.match(shell, /const isConnectorsRoute = pathname === "\/connectors" \|\| pathname === "\/app\/connectors"/, "the shell must recognize the onboarding-allowlisted connectors route");
assert.match(shell, /const onboardingChrome = isOnboardingRoute \|\| \(isConnectorsRoute && !onboardingCompletedAt\)/, "connectors must render bare (no sidebar/topbar) while onboarding is incomplete, exactly like /onboarding itself");
assert.match(shell, /if \(onboardingChrome\) \{/, "the bare-chrome branch must gate on the combined onboarding-chrome condition, not just the /onboarding route");
assert.doesNotMatch(shell, /localStorage/, "the onboarding chrome decision must stay server-authoritative, never client storage");

// B/C/E. Onboarding must be able to launch the real connector flow and get
// a single explicit return contract back, for both success/failure and
// cancel/close - never silent dead ends.
assert.match(onboardingPage, /markOnboardingReturn\(\);\s*router\.push\(`\/connectors\?setup=\$\{encodeURIComponent\(key\)\}&onboarding=1`\)/, "onboarding must mark the return contract before launching a connector flow");
assert.match(connectors, /isOnboardingLaunch\(searchParams\)/, "connectors must know when it was launched from onboarding, not treat onboarding=1 as a no-op query param");
assert.match(connectors, /hasPendingOnboardingReturn\(\)/, "connectors must check the shared onboarding return contract, not a locally-duplicated key");
assert.match(connectors, /const returnToOnboardingOrClose = \(fallback: \(\) => void\) => \{/, "there must be one explicit close-or-return handler used by every abandon path");
assert.match(connectors, /router\.push\("\/onboarding"\)/, "abandoning a connector flow launched from onboarding must return to /onboarding");
assert.match(connectors, /onClick=\{\(\) => returnToOnboardingOrClose\(\(\) => \{ setAddOpen\(false\); selectSetupConnector\(null\); \}\)\}/, "closing the connector modal via the backdrop must honor the return contract");
assert.match(connectors, /aria-label="Close connector finder" onClick=\{\(\) => returnToOnboardingOrClose\(\(\) => setAddOpen\(false\)\)\}/, "closing the connector modal via its close button must honor the return contract");
// The entitlement gate itself is now a view inside the same connector
// dialog (never a second stacked modal - see connector-trial-gate-layering-regression.mjs).
// Dismissing it must return to the same connector's setup detail with
// nothing lost, not jump back out to onboarding - that is reserved for
// abandoning the whole dialog via its own backdrop/close control above.
assert.match(connectors, /onClick=\{\(\) => setUpgradeOpen\(false\)\}>Back<\/button>/, "closing the gate must return to the same connector detail, preserving state, not silently strand the user or jump back to onboarding");
assert.match(connectors, /\{trialEligible \? "Start your 3-day trial" : "Choose a plan to connect real accounts"\}/, "a genuinely-blocked workspace must see an accurate reason, not a generic upsell; a trial-eligible one must be offered the trial first");

// Success/failure OAuth return already existed - assert it still uses the
// same shared contract instead of a locally-duplicated storage key.
assert.match(connectors, /if \(!hasPendingOnboardingReturn\(\)\) return;/, "the OAuth-return effect must use the shared return contract");
assert.match(connectors, /clearOnboardingReturn\(\);/, "the return marker must be cleared once consumed, so a later normal visit to \/connectors is not mistaken for an onboarding launch");

assert.match(returnContract, /export function isOnboardingLaunch/);
assert.match(returnContract, /export function markOnboardingReturn/);
assert.match(returnContract, /export function hasPendingOnboardingReturn/);
assert.match(returnContract, /export function clearOnboardingReturn/);

// G/J. Onboarding completion must remain genuinely gated on activation and
// monitoring, and closing UI or merely visiting a route must never complete
// it - this must still hold after the routing/chrome changes above.
assert.match(onboardingActions, /onboarding_completed_at: new Date\(\)\.toISOString\(\)/, "completion must still be the one explicit server write");
assert.match(onboardingActions, /\.is\("onboarding_completed_at", null\)/, "completion must remain idempotent - it cannot be re-triggered once set");
assert.match(onboardingPage, /api\/operators\/\$\{draft\.priority\}\/activate/, "completion must remain gated behind real operator activation, not merely reaching the last step");
assert.doesNotMatch(connectors, /completeOnboardingAction/, "the connectors surface must never be able to complete onboarding itself");

console.log("Onboarding connector-escape and return-contract regressions passed.");
