import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for Revenue Operator's production
// hardening pass: Gmail/Microsoft 365 connector parity, real confidence and
// priority scoring, best-next-action branching (including a reachable
// "no action" outcome), thread-reactivation-aware dedupe, real HubSpot
// note/task execution, and a per-workspace-isolated Trigger.dev fanout.
// Mirrors tests/client-flow-operator-smoke.mjs: no test runner, live DB, or
// live Gmail/Graph/Anthropic call is used - every check is a regression
// guard against source-level contracts.

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const scan = read("src/lib/operators/revenue/scan.ts");
const aiDrafting = read("src/lib/operators/revenue/ai-drafting.ts");
const readiness = read("src/lib/operators/readiness.ts");
const hubspot = read("src/lib/operators/executors/hubspot.ts");
const approveRoute = read("src/app/api/approvals/[id]/approve/route.ts");
const scanRoute = read("src/app/api/operators/revenue/scan/route.ts");
const trigger = read("src/trigger/revenue-operator-scan.ts");

// ── A. scan.ts is connector-aware (Gmail or Microsoft 365), not Gmail-only ──
assert.match(scan, /function resolveRevenueEmailConnector/, "scan.ts must resolve which email connector (Gmail or Microsoft 365) is actually connected, matching Client Flow's pattern");
assert.match(scan, /connected\.includes\("gmail"\)\) return "gmail"/);
assert.match(scan, /connected\.includes\("microsoft"\)\) return "microsoft"/);
assert.match(scan, /getMicrosoftCredential/, "scan.ts must be able to read a Microsoft 365 credential when Gmail is not connected");
assert.match(scan, /await listRecentMicrosoftMessages\(accessToken, maxResults\)/, "scan.ts must actually scan the Microsoft 365 inbox when Microsoft is the active connector");
assert.match(scan, /await getMicrosoftMessage\(accessToken, item\.id\)/);
assert.match(scan, /fromMicrosoftMessage/, "Microsoft messages must be normalized into the same safe shape Gmail messages use");
assert.match(scan, /emailConnector === "microsoft"\s*\n?\s*\? await createMicrosoftSendApproval/, "the approval must be created through the connector that was actually scanned, not always Gmail");
assert.match(scan, /if \(emailConnector === "gmail"\) \{/, "the credential lookup must be branched by connector instead of always assuming gmail");

// ── B. readiness never claims a capability the scan cannot deliver ─────────
const revenueBranch = readiness.slice(readiness.indexOf('operator.key === "revenue"'), readiness.indexOf('operator.key === "client_flow"'));
assert.match(revenueBranch, /connectedConnectorsWithCapability\("email\.send_after_approval", truth\)/, "revenue readiness must be capability-based (Gmail or Microsoft 365), matching what scan.ts can actually run");
assert.match(scan, /resolveRevenueEmailConnector\(readiness\)/, "scan.ts must derive its connector choice from the same readiness result the API/UI already trust, not re-derive it independently");

// ── C. Confidence is a real deterministic gradient, not a hardcoded literal ─
assert.doesNotMatch(scan, /confidence: "high";\s*\n\};/, "the old hardcoded `confidence: \"high\"` literal type must be gone");
assert.match(scan, /export type RevenueConfidence = "high" \| "medium" \| "low"/, "confidence must be a real three-tier gradient");
assert.match(scan, /function scoreOpportunitySignal/, "a deterministic scoring function must exist");
assert.match(scan, /priorityReasons/, "priority reasons must be stored as a plain-language explanation, not just an opaque score");
assert.match(scan, /isBusinessEmailDomain/, "scoring must use cheap, honest signals already available (business vs personal email domain)");
assert.match(scan, /hasWarmReferralLanguage/, "scoring must detect warm-referral wording as one of its listed signals");

// ── D. Best-next-action is deterministic and includes a reachable "no action" outcome ──
assert.match(scan, /function decideNextAction/, "a best-next-action decision function must exist");
assert.match(scan, /"prepare_email_reply" \| "prepare_qualification_question" \| "defer_low_priority"/, "at least three distinct next actions must be reachable, including a real deferral/no-action path");
assert.match(scan, /nextAction === "defer_low_priority"/, "the scan loop must actually branch on the deferral outcome");
assert.match(scan, /output_type: "revenue_no_action_summary"/, "a deferred/no-action outcome must still be logged as a real output, not silently dropped");
assert.match(scan, /status: "completed",\s*\n\s*input: deferInput,\s*\n\s*output: \{ status: "no_action_low_priority"/, "deferred opportunities must produce a real, queryable run row instead of vanishing");
assert.doesNotMatch(scan, /return \{ kind: "skipped", reason: matchedKeywords\.length > 0 \? "low_confidence" : "noise" \}/, "weak-but-nonzero signal messages must no longer be silently dropped with no audit trail");

// ── E. Dedupe distinguishes "already handled" from "new reply on an old thread" ──
assert.match(scan, /scope: "message" \| "thread"/, "dedupe lookups must distinguish message-level duplicates from thread-level history");
assert.match(scan, /isReactivation/, "a genuinely new message on a previously-handled thread must be flagged for reactivation instead of permanently suppressed");
assert.match(scan, /duplicate && duplicate\.scope === "message"/, "only a message-level (or contact+subject) match should hard-skip; a thread-only match must not");

// ── F. AI drafting stays deterministic-fallback-safe and is next-action aware ──
assert.match(aiDrafting, /import Anthropic from "@anthropic-ai\/sdk"/);
assert.match(aiDrafting, /client\.messages\.create/);
assert.match(aiDrafting, /fallbackUsed: true/, "a deterministic fallback must exist for when ANTHROPIC_API_KEY is missing or the model call fails");
assert.match(aiDrafting, /if \(!apiKey\) \{\s*\n\s*return fallbackResult/, "drafting must remain fully functional with zero model key");
assert.match(aiDrafting, /nextAction\?: RevenueNextAction/, "the AI drafting input must be able to reflect which next action was chosen deterministically");
assert.match(aiDrafting, /DRAFT PURPOSE/, "the model prompt must be told whether this is a full reply or a qualification question, without letting it choose the action itself");

// ── G. HubSpot notes and tasks are real execution, not a permanent stub ─────
assert.doesNotMatch(hubspot, /status: "prepared_not_enabled", reason: "HubSpot note execution is intentionally not enabled/, "the hardcoded v1.6 note stub must be gone");
assert.doesNotMatch(hubspot, /status: "prepared_not_enabled", reason: "HubSpot task execution is intentionally not enabled/, "the hardcoded v1.6 task stub must be gone");
assert.match(hubspot, /export async function createHubSpotNote/, "a real note-creation function must exist");
assert.match(hubspot, /export async function createHubSpotTask/, "a real task-creation function must exist");
assert.match(hubspot, /crm\/v3\/objects\/notes/, "notes must be written through the real HubSpot notes API");
assert.match(hubspot, /crm\/v3\/objects\/tasks/, "tasks must be written through the real HubSpot tasks API");
assert.match(hubspot, /noteResult = await createHubSpotNote/, "executeHubSpotRevenueActions must actually call note creation, not just prepare it");
assert.match(hubspot, /taskResult = await createHubSpotTask/, "executeHubSpotRevenueActions must actually call task creation, not just prepare it");
// Note/task writes remain inside the same approval-gated function as
// contact/deal writes - the approve route only reaches
// executeHubSpotRevenueActions after policy/approval already passed, so no
// new bypass of os_approvals is introduced.
const hubspotCallSites = approveRoute.match(/executeHubSpotRevenueActions\(/g) ?? [];
assert.ok(hubspotCallSites.length >= 2, "HubSpot execution (including notes/tasks) must stay behind the same approval-gated call sites for both Gmail and Microsoft 365");

// ── H. Trigger.dev daily scan is a real per-workspace fanout, not one hardcoded workspace ──
assert.doesNotMatch(trigger, /TODO: Replace the single-workspace default with a workspace fanout/, "the fanout TODO must be resolved, not left in place");
assert.match(trigger, /async function listEligibleRevenueWorkspaceIds/, "a real workspace discovery function must exist");
assert.match(trigger, /getOperatorReadiness\(\{ workspaceId, operatorKey: "revenue" \}\)/, "fanout eligibility must reuse the same readiness check the manual scan route trusts, not a separate ad hoc check");
assert.match(trigger, /for \(const workspaceId of discovery\.workspaceIds\) \{\s*\n\s*\/\/ Each workspace is isolated/, "each workspace in the fanout must be isolated so one failure cannot abort the others");
assert.match(trigger, /try \{\s*\n\s*const result = await scanRevenueOpportunities\(\{ workspaceId, sourceMode: "scheduled" \}\);/, "each workspace scan must be individually try/caught inside the fanout loop");
assert.match(trigger, /workspacesNeedingAttention/, "failed workspaces must be surfaced explicitly, not swallowed");

// ── I. Identity security: Revenue routes never trust client-supplied identity ──
assert.match(scanRoute, /resolveWorkspaceContext/, "the revenue scan route must resolve workspace identity from a verified session, never trust client-supplied ids directly");

console.log("Auterim Revenue Operator smoke contracts passed.");
