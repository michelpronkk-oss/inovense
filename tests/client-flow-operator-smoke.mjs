import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Static source-contract smoke tests for Client Flow Operator's completion
// pass: Gmail/Microsoft 365 connector-aware scanning + approval creation, and
// generic (operator-agnostic) approval execution. Mirrors the style of
// tests/microsoft-connector-smoke.mjs: no test runner, live DB, or live
// Gmail/Graph/Anthropic call is used - every check is a regression guard
// against source-level contracts (no live Supabase/Anthropic credentials are
// usable from this environment for a real integration test).

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const scan = read("src/lib/operators/client-flow/scan.ts");
const aiDrafting = read("src/lib/operators/client-flow/ai-drafting.ts");
const readiness = read("src/lib/operators/readiness.ts");
const registry = read("src/lib/operators/registry.ts");
const approveRoute = read("src/app/api/approvals/[id]/approve/route.ts");
const scanRoute = read("src/app/api/operators/client-flow/scan/route.ts");
const statusRoute = read("src/app/api/operators/client-flow/status/route.ts");
const clientFlowPage = read("src/app/app/agents/client-flow/page.tsx");
const microsoftConnector = read("src/lib/connectors/microsoft.ts");

// ── A. scan.ts is connector-aware (Gmail or Microsoft 365), not Gmail-only ──
assert.match(scan, /function resolveClientFlowEmailConnector/, "scan.ts must resolve which email connector (Gmail or Microsoft 365) is actually connected");
assert.match(scan, /connected\.includes\("gmail"\)\) return "gmail"/, "Gmail must be preferred when both connectors are connected, matching runOperator.ts's resolveEmailConnector()");
assert.match(scan, /connected\.includes\("microsoft"\)\) return "microsoft"/);
assert.match(scan, /kind: emailConnector === "microsoft" \? "microsoft\.send_after_approval" : "gmail\.send_after_approval"/, "the approval kind must match whichever connector was actually used to scan/draft");
assert.match(scan, /getMicrosoftCredential/, "scan.ts must be able to read a Microsoft 365 credential when Gmail is not connected");
assert.match(scan, /await listRecentMicrosoftMessages\(accessToken, maxResults\)/, "scan.ts must actually scan the Microsoft 365 inbox when Microsoft is the active connector, not just switch the approval kind");
assert.match(scan, /await getMicrosoftMessage\(accessToken, item\.id\)/);
assert.match(scan, /fromMicrosoftMessage/, "Microsoft messages must be normalized into the same safe shape Gmail messages use for signal detection");

// ── B. Dedupe keys are provider-namespaced but backward compatible ─────────
assert.match(scan, /client_flow:\$\{provider\}:message:/, "dedupe keys must be namespaced per connector so Gmail and Microsoft message ids can never collide");
assert.match(scan, /record\.sourceProvider === "microsoft" \? "microsoft" : "gmail"/, "historical (pre-Microsoft) dedupe records must still resolve to gmail so existing approval history is never re-triggered");

// ── C. readiness.ts's client_flow branch is capability-based, not hardcoded to Gmail ──
const clientFlowBranch = readiness.slice(readiness.indexOf('operator.key === "client_flow"'), readiness.indexOf('operator.key === "operations"'));
assert.match(clientFlowBranch, /connectedConnectorsWithCapability\("email\.send_after_approval", truth\)/, "client_flow readiness must use the capability-based connector check, not a hardcoded gmail-only check");
assert.doesNotMatch(clientFlowBranch, /requires a real Gmail credential/i, "client_flow readiness reason text must not be Gmail-specific");
assert.match(clientFlowBranch, /Connect Gmail or Microsoft 365/, "client_flow readiness copy must mention both supported email connectors");

// ── D. registry.ts: client_flow mirrors revenue's release-status pattern ───
const revenueEntry = registry.slice(registry.indexOf('key: "revenue"'), registry.indexOf('key: "client_flow"'));
const clientFlowEntry = registry.slice(registry.indexOf('key: "client_flow"'), registry.indexOf('key: "operations"'));
const revenueStatus = /currentReleaseStatus: "(\w+)"/.exec(revenueEntry)?.[1];
const clientFlowStatus = /currentReleaseStatus: "(\w+)"/.exec(clientFlowEntry)?.[1];
assert.equal(clientFlowStatus, revenueStatus, "client_flow's currentReleaseStatus must match revenue's (the known-working reference) release status convention");

// ── E. approve route: Microsoft path parses and executes Client Flow's bundled Trello action ──
assert.match(approveRoute, /clientFlowTrelloAction: rec\.clientFlowTrelloAction[\s\S]{0,80}as PreparedAction : null,\s*\n\s*clientFlow: rec\.clientFlow/, "validateMicrosoftPayload must parse clientFlowTrelloAction/clientFlow, matching validateGmailPayload");
const executeMicrosoftApprovalBody = approveRoute.slice(approveRoute.indexOf("async function executeMicrosoftApproval"), approveRoute.indexOf("export async function POST"));
assert.match(executeMicrosoftApprovalBody, /executeClientFlowTrelloAction/, "the Microsoft approval execution path must run Client Flow's bundled Trello action, matching the Gmail path");
const microsoftDraftOnlyBranch = executeMicrosoftApprovalBody.slice(executeMicrosoftApprovalBody.indexOf('policyDecision.decision === "draft_only"'));
assert.match(microsoftDraftOnlyBranch.slice(0, microsoftDraftOnlyBranch.indexOf("return NextResponse.json({ ok: true, status: \"draft_only_reviewed\"")), /executeClientFlowTrelloAction/, "the Microsoft draft-only branch must also run the bundled Trello action (email being draft-only must not block it)");

// ── F. Identity security: Client Flow routes never trust client-supplied identity ──
for (const routeSrc of [scanRoute, statusRoute]) {
  assert.match(routeSrc, /resolveWorkspaceContext/, "Client Flow routes must resolve workspace identity from a verified session, never trust client-supplied ids directly");
}

// ── G. AI drafting is a real Anthropic call with a deterministic fallback, not a stub ──
assert.match(aiDrafting, /import Anthropic from "@anthropic-ai\/sdk"/);
assert.match(aiDrafting, /client\.messages\.create/);
assert.match(aiDrafting, /fallbackUsed: true/, "a deterministic fallback must exist for when ANTHROPIC_API_KEY is missing or the model call fails");

// ── H. UI reflects the active connector instead of always assuming Gmail ───
assert.match(clientFlowPage, /emailProvider/, "the Client Flow dashboard must read which email connector is actually active");
assert.match(statusRoute, /emailProvider: "gmail" \| "microsoft" \| null/, "the status route must expose which email connector is active");
assert.match(statusRoute, /microsoft: microsoft \?/, "the status route must report Microsoft 365 connector state, not only Gmail");

// ── I. Microsoft message normalization carries enough context for signal detection ──
assert.match(microsoftConnector, /conversationId: string \| null/, "Microsoft messages must expose a thread/conversation id for dedupe parity with Gmail's threadId");
assert.match(microsoftConnector, /bodyText: string \| null/, "Microsoft messages must expose full body text, not just the truncated preview, for accurate signal keyword matching");

console.log("Auterim Client Flow Operator smoke contracts passed.");
