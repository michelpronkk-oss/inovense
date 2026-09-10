import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Regression coverage for the "no supported connector" onboarding polish:
// users must never be forced to have Gmail/Microsoft/Trello/etc. to finish
// onboarding, and choosing "I use another system" must never fabricate
// operator activation or monitoring. See src/app/app/onboarding/page.tsx,
// src/app/app/onboarding/actions.ts, and src/components/connectors/provider-logo.tsx.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("src/app/app/onboarding/page.tsx");
const actions = read("src/app/app/onboarding/actions.ts");
const css = read("src/app/app/onboarding/styles-onboarding.css");
const providerLogoSource = read("src/components/connectors/provider-logo.tsx");
const connectorsPage = read("src/app/app/connectors/page.tsx");
const overview = read("src/components/dashboard/overview.tsx");
const settingsPage = read("src/app/app/settings/page.tsx");

// ─────────────────────────────────────────────────────────────────────────
// A. Supported connector selected -> normal connector flow unchanged
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /async function openConnector\(key: ConnectorKey\)/, "the real connector flow must still exist unchanged");
assert.match(page, /systems, noSupportedConnector: false, step: 3/, "connecting a real system must clear any earlier 'no supported system' declaration");
assert.match(page, /markOnboardingReturn\(\);\s*router\.push\(`\/connectors\?setup=\$\{encodeURIComponent\(key\)\}&onboarding=1`\)/, "the real OAuth handoff to /connectors must be untouched");

// ─────────────────────────────────────────────────────────────────────────
// B. "I use another system" -> onboarding can continue safely
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /const hasCoreConnected = Boolean\(choice\?\.core\.some/, "step-3 validity must be based on real connected-account truth");
assert.match(page, /draft\.step === 3 \? Boolean\(hasCoreConnected \|\| draft\.noSupportedConnector\) : true/, "declaring 'I use another system' must be an alternate, equally valid way to pass step 3");
assert.match(page, /async function chooseNoSupportedConnector\(\)/, "there must be an explicit, separate action for declaring no supported system applies");
assert.match(page, /saveOnboardingDraftAction\(\{ \.\.\.draft, noSupportedConnector: true, step: 3 \}\)/, "the declaration must be persisted server-side immediately, not just held in memory");
assert.match(page, /I use another system/, "the exact product-specified copy must be present");
assert.match(page, /You can continue with limited context\. Auterim will show what becomes available when you connect a supported system later\./, "the exact supporting copy for the unsupported-tool path must be present");
assert.match(page, /Auterim works best with connected systems, but you can continue if your current tools are not supported yet\./, "step 3 must lead with the non-blocking framing, not a hard requirement");
assert.doesNotMatch(page, /disabled=\{busy \|\| \(draft\.step === 3 && !hasCoreConnected\)\}/, "step 3 must never hard-disable Continue purely on missing core connector");

// ─────────────────────────────────────────────────────────────────────────
// C. Skip -> no fake operator activation, no fake monitoring_started
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /const limitedMode = draft\.noSupportedConnector && !hasCoreConnected/, "limited mode must be truthful - declared AND still actually unconnected");
{
  const fnStart = page.indexOf("async function completeLimitedOnboarding()");
  assert.ok(fnStart >= 0, "a distinct limited-mode completion path must exist");
  const fnEnd = page.indexOf("async function signInWithAnotherAccount", fnStart);
  const fnBody = page.slice(fnStart, fnEnd);
  assert.doesNotMatch(fnBody, /\/activate/, "limited-mode completion must never call the operator activation route");
  assert.doesNotMatch(fnBody, /monitoring_started/i, "limited-mode completion must never claim monitoring started");
  assert.match(fnBody, /completeOnboardingAction/, "limited-mode completion must still persist real onboarding completion");
}
assert.match(page, /void \(limitedMode \? completeLimitedOnboarding\(\) : startMonitoring\(\)\)/, "the launch button must route to the honest completion path in limited mode, and the real activation path otherwise");
assert.match(page, /limitedMode \? "Continue to dashboard" : "Start monitoring"/, "the CTA label itself must not claim monitoring when none will start");
assert.match(page, /const canStart = limitedMode \|\|/, "limited mode must be allowed to finish onboarding without meeting real activation readiness");
// The real activation path itself must remain untouched and still gated on live readiness.
assert.match(page, /async function startMonitoring\(\) \{ if \(!draft\.priority \|\| !priorityReadiness\)/, "real activation must still require verified readiness");
assert.match(page, /api\/operators\/\$\{draft\.priority\}\/activate/, "real activation must still call the one real activation route");

// completeOnboardingAction itself must remain a pure completion write - it
// must never touch activation/monitoring state, in either path.
assert.doesNotMatch(actions, /monitoring_started/i, "completeOnboardingAction must never set monitoring state itself");
assert.doesNotMatch(actions, /\/activate/, "completeOnboardingAction must never call the activation route itself");
assert.match(actions, /onboarding_completed_at: new Date\(\)\.toISOString\(\)/, "completion must remain the one explicit, idempotent server write");
assert.match(actions, /noSupportedConnector: Boolean\(input\.noSupportedConnector\)/, "the declaration must round-trip through the same draft validation as every other field");
assert.match(actions, /no_supported_connector: draft\.noSupportedConnector/, "the declaration must be persisted in onboarding_data alongside the rest of the draft");
assert.match(actions, /noSupportedConnector: data\.no_supported_connector === true/, "the declaration must be read back honestly (default false, never assumed true)");

// ─────────────────────────────────────────────────────────────────────────
// D. Limited-mode dashboard -> truthful state, connect CTA visible
// ─────────────────────────────────────────────────────────────────────────
assert.match(overview, /lifecycle === "A"\s*\?\s*\{ state: "needs_setup", label: "Connect workspace", message: "Connect a system so Auterim can understand your workspace\.", primary: "Connect systems", href: "\/connectors" \}/, "a workspace with zero healthy connectors must show a truthful, non-broken empty state with a real connect CTA");
assert.match(overview, /\{!hasActivity && \(/, "activity must have an honest empty branch");
assert.match(overview, /Activity is still building\./, "no fake activity may be claimed before anything runs");
assert.doesNotMatch(overview, /Math\.random/, "dashboard state must never be randomly fabricated");

// ─────────────────────────────────────────────────────────────────────────
// E. Later connector connection -> readiness updates normally
// ─────────────────────────────────────────────────────────────────────────
assert.match(page, /api\/operators\/readiness/, "onboarding must keep reading real, live readiness");
assert.match(page, /void refreshLiveState\(\)/, "returning from a real OAuth connection must still refresh live readiness/account truth");

// ─────────────────────────────────────────────────────────────────────────
// F. Official provider logos render from local assets
// ─────────────────────────────────────────────────────────────────────────
assert.doesNotMatch(providerLogoSource, /https?:\/\//, "provider logos must never hotlink a remote asset in production");
assert.doesNotMatch(providerLogoSource, /<img\s/, "provider logos must be local inline vector marks, not <img> fetches");
assert.match(page, /import \{ ProviderLogo \} from "@\/components\/connectors\/provider-logo"/, "onboarding must use the shared provider-logo component");
assert.match(connectorsPage, /import \{ ProviderLogo \} from "@\/components\/connectors\/provider-logo"/, "the connectors page must use the same shared provider-logo component");
assert.doesNotMatch(connectorsPage, /IntegrationLogos/, "the fragile display-name-keyed logo lookup must be fully replaced, not layered on top of");
assert.match(overview, /import \{ ProviderLogo \} from "@\/components\/connectors\/provider-logo"/, "the dashboard connector strip must use the same shared provider-logo component");
assert.doesNotMatch(overview, /IntegrationLogos/, "the dashboard connector strip must not keep the old display-name-keyed lookup");
assert.match(settingsPage, /import \{ ProviderLogo \} from "@\/components\/connectors\/provider-logo"/, "the settings connected-accounts list must use the same shared provider-logo component");
assert.doesNotMatch(settingsPage, /IntegrationLogos/, "the settings connected-accounts list must not keep the old, gmail/hubspot-only hardcoded logo guess");
for (const key of ["gmail", "microsoft", "microsoft_teams", "google_drive", "hubspot", "trello", "asana", "jira", "zendesk", "intercom", "slack"]) {
  assert.match(providerLogoSource, new RegExp(`^\\s*${key}: \\(`, "m"), `a real brand mark must exist for ${key}`);
}

{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-provider-logo-"));
  try {
    const outfile = path.join(tmpDir, "provider-logo.mjs");
    await esbuild.build({
      entryPoints: [path.join(root, "src/components/connectors/provider-logo.tsx")],
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node18",
      jsx: "automatic",
      logLevel: "silent",
    });
    const mod = await import(`${pathToFileURL(outfile).href}?v=${Math.random()}`);
    const supported = ["gmail", "microsoft", "microsoft_teams", "google_drive", "hubspot", "trello", "asana", "jira", "zendesk", "intercom", "slack", "salesforce"];
    for (const key of supported) {
      assert.equal(mod.hasProviderLogo(key), true, `hasProviderLogo must be true for ${key}`);
      assert.ok(mod.PROVIDER_LABELS[key], `PROVIDER_LABELS must name ${key}`);
    }
    assert.equal(mod.hasProviderLogo("notion"), false, "hasProviderLogo must be false for a connector with no real drawn mark yet (falls back to letter)");
    assert.equal(mod.hasProviderLogo("some_future_connector"), false, "an unknown key must never crash - it must report no real logo");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// G. Mobile connector step -> no overflow
// ─────────────────────────────────────────────────────────────────────────
assert.match(css, /\.connector-alt\{width:100%;min-height:44px;font-size:12\.5px\}/, "the unsupported-system action must stay full-width and tappable on narrow phones");
assert.doesNotMatch(css, /\.connector-grid\{[^}]*overflow-x/, "the connector grid must not rely on horizontal scrolling on mobile");
assert.match(css, /\.connector-grid\{grid-template-columns:1fr;gap:8px\}/, "connector cards must stack to a single column on narrow phones, not overflow");

console.log("Onboarding unsupported-connector, limited-mode, and provider-logo regressions passed.");
