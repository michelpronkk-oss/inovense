import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Regression coverage for the explicit trial lifecycle rewrite: a workspace
// must stay Preview - no real connector OAuth, no operator activation, no
// monitoring - until a signed-in owner/admin explicitly starts the 3-day
// trial (or the workspace is on a paid plan). See the companion runtime
// tests in onboarding-trial-entitlement-smoke.mjs (the trial-grant
// primitive itself and its removal from the app gateway) and
// onboarding-unsupported-connector-regression.mjs (the "I use another
// system" path). This file covers the surfaces that changed to add the
// explicit gate: onboarding's trial-gate step, /connectors' trial-aware
// gate, /plans' cardless trial button, and the dashboard's Preview/Trial copy.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const onboardingPage = read("src/app/app/onboarding/page.tsx");
const onboardingActions = read("src/app/app/onboarding/actions.ts");
const connectorsPage = read("src/app/app/connectors/page.tsx");
const upgradeModal = read("src/components/upgrade-modal.tsx");
const plansPage = read("src/app/app/plans/page.tsx");
const overview = read("src/components/dashboard/overview.tsx");
const activateRoute = read("src/app/api/operators/[operatorKey]/activate/route.ts");
const trialStartRoute = read("src/app/api/billing/trial/start/route.ts");
const entitlements = read("src/lib/os/entitlements.ts");

// ─────────────────────────────────────────────────────────────────────────
// C/G. Connectors: Preview blocks real OAuth and offers the trial first;
// trial-eligible workspaces are never told to "Choose a plan" while a free
// trial is still on offer; once active, the same click continues real OAuth.
// ─────────────────────────────────────────────────────────────────────────
assert.match(connectorsPage, /const \[trialState, setTrialState\] = useState<TrialGateState \| null>\(null\)/, "the connectors page must know real trial eligibility, including unavailable history, not assume it");
assert.match(connectorsPage, /fetch\("\/api\/billing\/trial-status", \{ cache: "no-store" \}\)/, "trial eligibility must come from the server, not be guessed client-side");
assert.match(connectorsPage, /if \(isPreview \|\| atConnectorLimit\) \{\s*setUpgradeOpen\(true\);\s*return;\s*\}\s*beginRealOAuth\(setupConnector\.id\);/, "Preview must still block real OAuth before it ever starts, exactly as before");
assert.match(connectorsPage, /const startTrialAndContinue = async \(\) => \{/, "there must be one authoritative trial-start handler on the connectors page");
assert.match(connectorsPage, /fetch\("\/api\/billing\/trial\/start", \{ method: "POST" \}\)/, "the connectors page must call the one explicit trial-start route, not duplicate the logic");
assert.match(connectorsPage, /await refreshWorkspace\(\);\s*setUpgradeOpen\(false\);\s*if \(setupConnector\) \{\s*beginRealOAuth\(setupConnector\.id\);/, "after a successful trial start, the originally-requested connector's real OAuth must continue automatically");
assert.match(connectorsPage, /\{trialEligible \? \(\s*<button type="button" className="btn btn-primary btn-sm" onClick=\{\(\) => void startTrialAndContinue\(\)\}/, "the gate must only offer to start a trial when the workspace is genuinely still eligible");
assert.doesNotMatch(connectorsPage, /title=\{isOnboarding \? "This workspace needs a plan to connect real accounts" : "Activate real connectors"\}$/m, "the gate title must be decided by real trial eligibility first, not just onboarding context");

// UpgradeModal itself must support the trial-first affordance without
// duplicating a second modal component.
assert.match(upgradeModal, /onStartTrial\?: \(\) => void/, "the shared upgrade modal must support an explicit trial-start action");
assert.match(upgradeModal, /onClick=\{onStartTrial\} disabled=\{startTrialBusy\}/, "the trial-start button must reflect real in-flight state, not fire twice");

// ─────────────────────────────────────────────────────────────────────────
// D/I. Operator activation stays server-authoritative and unaffected by
// this rewrite - Preview must fail closed there regardless of any UI state.
// ─────────────────────────────────────────────────────────────────────────
assert.match(activateRoute, /decideOperatorActivation\(readiness\)/, "activation must still be decided server-side from real readiness, not a client flag");
assert.match(activateRoute, /status: 409/, "activation must fail closed (not silently succeed) when entitlement/readiness does not allow it");
assert.doesNotMatch(activateRoute, /ensureOrganicTrial/, "the activation route must never itself grant a trial as a side effect of activating");

// ─────────────────────────────────────────────────────────────────────────
// B/K. Onboarding: the trial gate is explicit, and Preview completion never
// pretends anything is active.
// ─────────────────────────────────────────────────────────────────────────
assert.match(onboardingPage, /const entitlements = getEntitlements\(state\.workspace\)/, "onboarding must read real entitlement, not assume trial state");
assert.match(onboardingPage, /const previewMode = !entitlements\.canUseRealConnectors/, "Preview must be derived from real entitlement truth, not a draft flag");
assert.match(onboardingPage, /const limitedMode = previewMode \|\| \(draft\.noSupportedConnector && !hasCoreConnected\)/, "onboarding must skip activation whenever the workspace is still genuinely Preview");
assert.match(onboardingPage, /Start your 3-day trial/, "the explicit trial-gate headline must be present");
assert.match(onboardingPage, /Connect real systems and activate your workforce when you&apos;re ready\./, "the exact product-specified supporting copy must be present");
assert.match(onboardingPage, /Continue in Preview/, "declining the trial must be an equally visible, explicit secondary action");
assert.match(onboardingPage, /async function declineTrial\(\) \{ setBusy\(true\); setError\(""\); const result = await saveOnboardingDraftAction\(\{ \.\.\.draft, trialDeclined: true, step: 3 \}\)/, "declining the trial must be persisted, not just a local UI toggle lost on refresh");
assert.match(onboardingPage, /async function selectConnector\(key: ConnectorKey\) \{ if \(previewMode\) \{ await startTrialAndContinue\(key\); return; \} await openConnector\(key\); \}/, "clicking a recommended system while Preview must start the trial first, never open OAuth directly");
assert.match(onboardingPage, /async function startTrialAndContinue\(pendingKey\?: ConnectorKey\)/, "onboarding must have its own call to the one explicit trial-start route");
assert.match(onboardingPage, /fetch\("\/api\/billing\/trial\/start", \{ method: "POST" \}\)/, "onboarding must call the same authoritative trial-start route as every other surface");

// Preview completion (limitedMode true) must still go through the same
// activation-free completion path proven safe in the unsupported-connector
// regression suite - re-asserted here under its Preview trigger specifically.
assert.match(onboardingPage, /async function completeLimitedOnboarding\(\) \{ setBusy\(true\); setError\(""\); try \{ const complete = await completeOnboardingAction/, "Preview completion must use the same honest, activation-free completion path");
assert.doesNotMatch(onboardingPage, /previewMode[\s\S]{0,200}\/activate/, "nothing in the Preview branch may call the operator activation route");

// ─────────────────────────────────────────────────────────────────────────
// A. The app gateway (resolved on every /app/* navigation) must never grant
// a trial - re-verified here directly against the gateway source itself.
// ─────────────────────────────────────────────────────────────────────────
{
  const gateway = read("src/lib/server/app-gateway.ts");
  assert.doesNotMatch(gateway, /ensureOrganicTrial/, "opening Auterim/onboarding must never itself start a trial");
  assert.doesNotMatch(gateway, /billing_status: "trialing"/, "the gateway must never write a trialing billing status");
}

// ─────────────────────────────────────────────────────────────────────────
// E/F. The explicit route itself: authenticated, authorized, idempotent -
// re-verified here for the specific abuse-safety requirements (double
// click / refresh / paid workspace) beyond what the entitlement smoke test covers.
// ─────────────────────────────────────────────────────────────────────────
assert.match(trialStartRoute, /const user = await getVerifiedSupabaseUser\(\)/, "trial start must require a verified session, never a client-supplied identity");
assert.match(trialStartRoute, /if \(!user\) return NextResponse\.json\(\{ ok: false, error: "Sign in to continue\." \}, \{ status: 401 \}\)/, "an unauthenticated request must be rejected, not silently no-op");
assert.match(trialStartRoute, /status: 403/, "a non-owner/admin must be forbidden, not silently downgraded to a no-op");

// ─────────────────────────────────────────────────────────────────────────
// L/M. Trial expiry and paid plans - the entitlement resolver itself is
// unchanged by this rewrite (re-verified here since it is the single source
// every gate in this file ultimately depends on).
// ─────────────────────────────────────────────────────────────────────────
assert.match(entitlements, /if \(workspace\.billingStatus === "trialing" && workspace\.trialEndsAt\) \{/, "an expired trial must be recomputed live, never trusted from a stale stored status");
assert.match(entitlements, /if \(Number\.isFinite\(trialEnd\) && trialEnd <= Date\.now\(\)\) return "canceled";/, "a trial past its end date must resolve to canceled, blocking real connectors/operators again");

// ─────────────────────────────────────────────────────────────────────────
// O. Dashboard: Preview, Trial, and paid states must never contradict each
// other or overstate what is actually running.
// ─────────────────────────────────────────────────────────────────────────
assert.match(overview, /const isPreview = !billingStatus \|\| billingStatus === "preview"/, "dashboard Preview detection must come from the real workspace billing status");
assert.match(overview, /const isTrialing = billingStatus === "trialing"/, "the dashboard must distinguish trial-active from Preview - they are not the same state");
assert.match(overview, /label: "Preview", message: "Preview is active\. Start your 3-day trial to connect real systems and activate your workforce\.", primary: "Start 3-day trial", href: "\/plans"/, "a genuinely-eligible Preview workspace must be offered the trial as the primary action, not told to connect systems it cannot yet connect");
assert.match(overview, /label: "Preview", message: "Preview is active\. This account's trial has already been used - choose a plan to connect real systems\.", primary: "Choose a plan", href: "\/plans"/, "a Preview workspace with no trial left must be told the truth, not offered a trial that does not exist");
assert.match(overview, /message: "Your trial is active\. Connect your first system to start monitoring\.", primary: "Connect your first system"/, "a trialing-but-unconnected workspace must get the real next step, not be conflated with Preview");
// The plain "Connect systems" branch (no trial ever attempted) must only be
// reachable once real entitlement already exists - i.e. nested behind both
// the isPreview and isTrialing checks, never the first thing evaluated.
assert.match(overview, /: isTrialing\s*\?[\s\S]{0,300}: \{ state: "needs_setup", label: "Connect workspace", message: "Connect a system so Auterim can understand your workspace\.", primary: "Connect systems", href: "\/connectors" \}\)/, "'Connect systems' must remain nested behind the Preview/Trial checks, never shown to a workspace that cannot yet connect anything");

console.log("Explicit trial lifecycle regression contracts passed.");
