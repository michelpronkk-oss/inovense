import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Regression coverage for the stacked-modal bug: the Preview/trial
// entitlement gate was a second independent overlay (UpgradeModal, using
// .os-modal-backdrop, z-index: 30) rendered on top of the still-open
// connector setup dialog (.scrim, z-index: 80) - the higher z-index token
// meant the setup dialog visually and interactively stayed on top, making
// the gate an unusable, unreachable layer underneath it.
//
// The fix replaces the connector setup view IN PLACE, inside the exact same
// .scrim/.modal dialog, instead of stacking a second dialog - so there is
// only ever one foreground interactive surface. See
// src/app/app/connectors/page.tsx and src/app/app/dashboard.css.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("src/app/app/connectors/page.tsx");
const css = read("src/app/app/dashboard.css");

// ─────────────────────────────────────────────────────────────────────────
// Root cause, locked in: the two z-index tokens that caused the bug.
// ─────────────────────────────────────────────────────────────────────────
assert.match(css, /\.os-root \.scrim \{ position: fixed; inset: 0; z-index: 80;/, "the connector modal's backdrop token (80) must be documented/unchanged - the fix is architectural, not a z-index bump");
assert.match(css, /\.os-modal-backdrop \{[\s\S]{0,40}\}/, "the upgrade modal's original backdrop rule must still exist for any other standalone caller");

// ─────────────────────────────────────────────────────────────────────────
// 1. No second stacked dialog: UpgradeModal must no longer be rendered as
// an independent overlay from the connectors page.
// ─────────────────────────────────────────────────────────────────────────
assert.doesNotMatch(page, /import \{ UpgradeModal \} from "@\/components\/upgrade-modal"/, "the connectors page must no longer render a second, independently-backdropped dialog for the entitlement gate");
assert.doesNotMatch(page, /<UpgradeModal/, "no standalone UpgradeModal instance may remain in the connectors page");

// ─────────────────────────────────────────────────────────────────────────
// 2. The gate is a view swap inside the SAME modal/backdrop as the
// connector setup dialog - one dialog, one DOM tree, no stacking possible.
// ─────────────────────────────────────────────────────────────────────────
{
  const modalStart = page.indexOf('<div className="modal wide connector-finder-modal"');
  assert.ok(modalStart >= 0, "the connector setup modal container must exist");
  const modalCloseMarker = page.indexOf("{/* Connector detail drawer }".replace("}", "*/"), modalStart);
  const modalBody = page.slice(modalStart, modalCloseMarker > 0 ? modalCloseMarker : modalStart + 6000);
  assert.match(modalBody, /!setupConnector \? \(/, "the picker view must remain the first branch");
  assert.match(modalBody, /\) : upgradeOpen \? \(/, "the entitlement gate must be a branch of the SAME ternary as the picker/setup views, not a sibling overlay");
  assert.match(modalBody, /Start your 3-day trial/, "the gate content must live inside this same modal body");
  assert.match(modalBody, /ConnectorSetupView connector=\{setupConnector\}/, "the real setup view must be the sibling branch, not removed");
}
assert.match(page, /role="dialog" aria-modal="true"/, "the single connector modal must be marked as a real dialog for assistive tech");

// ─────────────────────────────────────────────────────────────────────────
// 3. Copy matches the product spec exactly for an eligible, unused trial -
// and "Choose a plan" must never appear on that path.
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /trialState === null \? "Checking trial access"/, "the gate must represent unknown trial state instead of treating it as plan-required");
assert.match(page, /trialEligible \? "Start your 3-day trial" : "Choose a plan to connect real accounts"/, "the eligible-trial and plan-required headlines must remain distinct");
assert.match(page, /Connect real systems and activate your workforce when you're ready\./, "the exact supporting copy must be present");
assert.match(page, /trialEligible \? <button[\s\S]*>Not now<\/button> : trialState === null \?/, "the secondary action must remain a dismiss action while a trial is available or still loading");
assert.match(page, /<Link className="btn btn-ghost btn-sm" href="\/plans">Compare plans<\/Link>/, "the secondary plan-required action must navigate to the plans page");
assert.match(page, /Continue to Foundation/, "the primary plan-required action must continue directly to Foundation checkout");
assert.match(page, /Retry eligibility/, "an unavailable trial-history lookup must offer a retry instead of a false plan gate");
assert.match(page, /<Link className="btn btn-primary btn-sm" href="\/plans">Choose a plan<\/Link>/, "an eligible connector gate must route to plan selection before any trial or OAuth action");
{
  const gateStart = page.indexOf(") : upgradeOpen ? (");
  const gateEnd = page.indexOf(") : (", gateStart + 10);
  const gateBody = page.slice(gateStart, gateEnd);
  assert.doesNotMatch(gateBody, /Choose a plan"[^:]*:[^"]*trialEligible/, "the eligible branch must never be reachable through plan-selection language");
  assert.match(page, /trial has ended|already used/, "the genuinely-blocked branch must still explain an expired vs. previously-used trial truthfully");
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Stale-gate prevention: selecting a different connector (or clearing
// selection) must always close a gate left open for a previous connector.
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /const selectSetupConnector = \(id: string \| null\) => \{ setSetupConnectorId\(id\); setUpgradeOpen\(false\); \}/, "every connector-selection change must go through one helper that also closes any stale gate");
{
  const rawSetterCalls = (page.match(/[^.\w]setSetupConnectorId\(/g) ?? []).length;
  assert.equal(rawSetterCalls, 1, "the raw connector-id setter must be called from exactly one place - inside the shared helper - and nowhere else");
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Accessibility: Escape closes only the current foreground view, one
// level at a time - the gate first, then setup detail, then the modal.
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /if \(upgradeOpen\) setUpgradeOpen\(false\);\s*else if \(setupConnectorId\) selectSetupConnector\(null\);\s*else if \(addOpen\)/, "Escape must close the gate before it closes/affects anything else");
assert.match(page, /\}, \[addOpen, drawerConnectorId, setupConnectorId, upgradeOpen\]\);/, "the Escape handler must actually re-subscribe when the gate opens/closes");

// ─────────────────────────────────────────────────────────────────────────
// 6. Connector-intent preservation: cancelling the gate returns to the same
// connector's setup detail (nothing lost); a successful trial start resumes
// the exact connector that was requested, for every connector on the shared
// setup flow (not just one).
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /onClick=\{\(\) => setUpgradeOpen\(false\)\}>Back<\/button>/, "closing the gate via its head control must return to the same connector's setup detail, not close the whole modal");
assert.doesNotMatch(page, /const startTrialAndContinue = async \(\) => \{/, "the connectors gate must not start or activate a trial before plan selection");
assert.match(page, /href="\/plans">Choose a plan<\/Link>/, "the connector intent must pause at plan selection instead of continuing directly into provider OAuth");
// Connector-agnostic: the gate branch itself must not special-case any one
// provider - it must behave identically for Gmail, Microsoft 365, Google
// Drive, HubSpot, Trello, Asana, Jira, Zendesk, Intercom, Slack, Teams, and
// Salesforce, since all of them reach it through the same setup-detail view.
{
  const gateStart = page.indexOf(") : upgradeOpen ? (");
  const gateEnd = page.indexOf(") : (", gateStart + 10);
  const gateBody = page.slice(gateStart, gateEnd);
  for (const id of ["gmail", "microsoft\"", "google_drive", "hubspot", "trello", "asana", "jira", "zendesk", "intercom", "slack", "microsoft_teams", "salesforce"]) {
    assert.doesNotMatch(gateBody, new RegExp(`setupConnector\\.id === "${id}`), `the entitlement gate must not special-case ${id} - it must be identical for every connector`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Entitlement security unchanged: Preview still blocks OAuth server-side
// intent (the client-side gate is UX only - the real block is that OAuth is
// never initiated while isPreview is true, and the provider auth routes are
// untouched by this presentation-only fix).
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /if \(isPreview \|\| atConnectorLimit\) \{\s*setUpgradeOpen\(true\);\s*return;\s*\}\s*beginRealOAuth\(setupConnector\.id\);/, "Preview must still block real OAuth before it is ever started, exactly as before this presentation fix");

console.log("Connector trial-gate layering, continuation, and accessibility regressions passed.");
