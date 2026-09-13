import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", `.tmp-inbound-intent-routing-${process.pid}`);
fs.mkdirSync(tmpDir, { recursive: true });

async function loadEngine() {
  const inbound = fs.readFileSync(path.join(root, "src/lib/signals/inbound.ts"), "utf8").replace(/^import[^\n]+\n/gm, "");
  const identity = fs.readFileSync(path.join(root, "src/lib/workflows/identity.ts"), "utf8").replace(/^import[^\n]+\n/gm, "");
  const ownership = `function arbitrateSignalOwnership(event, decision) { const primaryOperator = decision.primaryOperator ?? null; return { primaryOperator, supportingOperators: decision.supportingOperators ?? [], externalCommunicationOwner: decision.customerFacing ? primaryOperator : null, customerFacing: decision.customerFacing === true, reason: "Test adapter preserves the classifier ownership decision." }; }`;
  const engine = fs.readFileSync(path.join(root, "src/lib/signals/engine.ts"), "utf8").replace(/^import[^\n]+\n/gm, "");
  const { code } = esbuild.transformSync(`${inbound}\n${ownership}\n${identity}\n${engine}`, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, "engine.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

async function loadGmailParser() {
  const source = fs.readFileSync(path.join(root, "src/lib/connectors/gmail.ts"), "utf8").replace(/^import[^\n]+\n/gm, "");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const file = path.join(tmpDir, "gmail-parser.mjs");
  fs.writeFileSync(file, code, "utf8");
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

const email = (overrides = {}) => ({
  workspaceId: "ws-inbound",
  source: "gmail",
  provider: "gmail",
  connectorKey: "gmail",
  sourceType: "email",
  eventType: "email.received",
  sourceId: "message-1",
  threadId: "thread-1",
  receivedAt: "2026-09-09T08:00:00.000Z",
  from: "customer@example.com",
  subject: "Hello",
  snippet: "Hello, can you help?",
  ...overrides,
});

try {
  const { routeSignalEvent, normalizeSignalEvent } = await loadEngine();
  const route = (overrides) => routeSignalEvent(email(overrides));
  const routeWithText = (overrides, classificationText) => routeSignalEvent(email(overrides), new Date(), { classificationText });

  // 1. Explicit pricing request -> Revenue.
  let result = route({ subject: "Pricing for 25 additional seats", snippet: "Can you send pricing for 25 additional seats?" });
  assert.equal(result.decision.primaryIntent, "PRICING_REQUEST");
  assert.equal(result.decision.primaryOperator, "revenue");
  assert.equal(result.decision.actionability, "WORKFLOW_CANDIDATE");
  // 2. Customer question -> Client Flow.
  result = route({ subject: "A question about the rollout", snippet: "Can you explain what happens next?" });
  assert.equal(result.decision.primaryIntent, "CUSTOMER_QUESTION");
  assert.equal(result.candidates[0]?.operatorKey, "client_flow");
  // 3. Complaint -> Support.
  result = route({ subject: "The integration is broken", snippet: "This is unacceptable and we are not satisfied with the support issue." });
  assert.equal(result.decision.primaryIntent, "COMPLAINT");
  assert.equal(result.decision.primaryOperator, "support");
  assert.equal(result.decision.priorityLevel, "high");
  // 4. Escalation carries Operations as context without competing ownership.
  result = route({ subject: "Escalation: rollout blocked", snippet: "This is the third time we have asked. The rollout is still blocked." });
  assert.equal(result.decision.primaryOperator, "client_flow");
  assert.deepEqual(result.decision.supportingOperators, ["operations"]);
  // 5. Internal blocker -> Operations.
  result = route({ from: "ops@example.com", subject: "Internal blocker", snippet: "The vendor dependency is stuck and the handoff is blocked." });
  assert.equal(result.decision.primaryOperator, "operations");
  assert.equal(result.decision.operationsSignal, true);
  // 6. Proposal request -> Revenue.
  result = route({ subject: "Proposal request", snippet: "Please send a proposal and scope for the expansion." });
  assert.equal(result.decision.primaryIntent, "PROPOSAL_REQUEST");
  assert.equal(result.decision.primaryOperator, "revenue");
  // 7. Newsletter ignored.
  result = route({ subject: "Weekly newsletter", snippet: "Read our digest. Unsubscribe here." });
  assert.equal(result.decision.primaryIntent, "NEWSLETTER");
  assert.equal(result.candidates.length, 0);
  // 8. Automated receipt ignored.
  result = route({ from: "noreply@vendor.example", subject: "Receipt", snippet: "Your payment receipt is attached." });
  assert.equal(result.decision.primaryIntent, "AUTOMATED_NOTIFICATION");
  assert.equal(result.candidates.length, 0);
  // 9. Resolved thank-you reply is observation only.
  result = route({ subject: "Re: issue", snippet: "Thanks, that solved it. All good now." });
  assert.equal(result.decision.actionability, "OBSERVE");
  assert.equal(result.candidates.length, 0);
  // 10. Multi-intent customer message keeps one primary owner.
  result = route({ subject: "Implementation and pricing", snippet: "We are still waiting for implementation and also want pricing for another region." });
  assert.equal(result.decision.primaryOperator, "client_flow");
  assert.ok(result.decision.supportingOperators.includes("revenue"));
  // 11. Supporting context never becomes a second candidate.
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].supportingOperators, ["operations", "revenue"]);
  // 12. Same provider/thread/intent dedupes deterministically.
  const first = route({ subject: "Pricing", snippet: "Please send pricing." });
  const second = route({ subject: "Pricing", snippet: "Please send pricing.", sourceId: "message-2" });
  assert.equal(first.candidates[0]?.dedupeKey, second.candidates[0]?.dedupeKey);
  // 13. Repeated unresolved follow-up raises priority.
  result = route({ subject: "Re: implementation", snippet: "Still waiting for an answer.", metadata: { threadMessageCount: 3, threadUnresolved: true } });
  assert.equal(result.decision.priorityLevel, "high");
  assert.equal(result.decision.actionability, "WORKFLOW_CANDIDATE");
  // 14. Unknown low-confidence content never creates a workflow candidate.
  result = route({ subject: "Hello", snippet: "A short note with no request or business context." });
  assert.equal(result.decision.confidence, "low");
  assert.equal(result.candidates.length, 0);
  // 15. Customer-facing candidates remain bounded signals; routing never sends.
  result = route({ subject: "Pricing request", snippet: "Can you send a quote?" });
  assert.equal(result.decision.customerFacing, true);
  assert.equal(result.candidates[0]?.actionability, "WORKFLOW_CANDIDATE");
  // 15a. Intent keywords match whole words/phrases: "details" is not an ETA request.
  result = route({ subject: "Project details", snippet: "Here are the project details for your review." });
  assert.equal(result.decision.secondaryIntents.includes("DELIVERY_STATUS_REQUEST"), false);
  result = route({ subject: "Project timing", snippet: "Could you share the ETA for the rollout?" });
  assert.equal(result.decision.secondaryIntents.includes("DELIVERY_STATUS_REQUEST"), true);
  // 16. Existing provider dedupe remains stable and workspace-scoped.
  const normalized = normalizeSignalEvent(email({ sourceId: "same-message" }));
  assert.equal(normalized.dedupeKey, normalizeSignalEvent(email({ sourceId: "same-message" })).dedupeKey);
  assert.notEqual(normalized.dedupeKey, normalizeSignalEvent(email({ workspaceId: "other-workspace", sourceId: "same-message" })).dedupeKey);
  // 17. Support question is not commercial intent.
  result = route({ subject: "Support question", snippet: "The integration is not working. Can you help?" });
  assert.equal(result.decision.commercialSignal, false);
  assert.equal(result.decision.primaryOperator, "support");
  // 18. Bounded thread context is honored without storing a body.
  result = route({ metadata: { threadMessageCount: 999, threadUnresolved: true }, snippet: "Still waiting on delivery." });
  assert.equal(result.decision.primaryOperator, "client_flow");
  // 19. Malformed provider data is safe.
  result = route({ sourceId: "", from: null, subject: null, snippet: null, metadata: null });
  assert.ok(result.decision.primaryIntent);
  // 20. Classifier failure-safe unknown path does not throw or route.
  result = route({ sourceId: "unknown", subject: "", snippet: "", metadata: { senderKind: "unknown" } });
  assert.equal(result.candidates.length, 0);
  // 21. Raw body never appears in normalized provider event or candidate evidence.
  const bodyResult = route({ metadata: { body: "secret customer body", token: "secret-token" }, snippet: "Please send pricing." });
  assert.doesNotMatch(JSON.stringify(bodyResult), /secret customer body|secret-token/);
  // 22. Only the three live operators can be emitted.
  for (const candidate of first.candidates) assert.ok(["revenue", "client_flow", "operations"].includes(candidate.operatorKey));

  const founderBody = `Hi Michel,\n\nWe’re close to making a decision on Auterim and I wanted to confirm a few final details before we move forward.\n\nWe would likely start with around 30 users across operations and customer success.\n\nCould you confirm:\n\n- the monthly pricing for a team of 30\n- whether onboarding is included\n- how quickly we could get started after signing\n- whether we can add more users later without changing the setup\n- whether there is any flexibility on pricing if we commit for a longer period\n\nWe’re planning to make a final decision by Thursday.\n\nAuterim is currently one of the two options still being considered, so getting this information before then would be very helpful.\n\nIf everything lines up, we should be able to move quickly.\n\nBest,\nSophie\nOperations Director\nNorthstar Labs`;
  const founderSubject = "Final questions before we move forward";
  const founderSnippet = founderBody.slice(0, 180);
  const founderSnippetOnly = route({ subject: founderSubject, snippet: founderSnippet });
  assert.equal(founderSnippetOnly.decision.revenueSignals.includes("pricing"), false, "the short provider snippet omits the explicit pricing ask");
  assert.equal(founderSnippetOnly.decision.revenueSignals.includes("competitor_evaluation"), false, "the short provider snippet omits the vendor comparison");

  // 23. The exact founder-test email routes to Revenue using the parsed full body, while keeping that body transient.
  const founder = routeWithText({
    sourceId: "founder-test-message",
    threadId: "founder-test-thread",
    from: "Sophie <sophie@northstarlabs.com>",
    subject: founderSubject,
    snippet: founderSnippet,
  }, founderBody);
  assert.equal(founder.decision.primaryIntent, "PRICING_REQUEST");
  assert.equal(founder.decision.primaryOperator, "revenue", JSON.stringify(founder.decision));
  assert.equal(founder.decision.confidence, "high");
  assert.equal(founder.decision.actionability, "WORKFLOW_CANDIDATE");
  assert.equal(founder.decision.commercialSignal, true);
  assert.equal(founder.decision.secondaryIntents.includes("DELIVERY_STATUS_REQUEST"), false, "the word details must not trigger the eta rule");
  for (const signal of ["pricing", "purchase_intent", "decision_deadline", "competitor_evaluation", "seat_count", "expansion", "commercial_negotiation"]) {
    assert.ok(founder.decision.revenueSignals.includes(signal), `founder message should include ${signal}`);
  }
  assert.ok(!JSON.stringify(founder).includes("monthly pricing for a team of 30"), "full message body must not be returned in routed evidence");

  // 24. The 10 requested Revenue categories are recognized semantically, without requiring buy/purchase/sales/deal wording.
  const revenueCases = [
    ["pricing request", "Could you share monthly pricing for our team?", "pricing"],
    ["team size", "We would start with a team of 30 users across operations.", "seat_count"],
    ["decision deadline", "We need to make a final decision by Thursday before our planned start.", "decision_deadline"],
    ["competitor comparison", "We are evaluating your platform alongside another vendor before choosing a provider.", "competitor_evaluation"],
    ["discount negotiation", "Is there flexibility on pricing if we commit for a longer period?", "commercial_negotiation"],
    ["proposal follow-up", "I am following up on your proposal and would like to confirm the scope.", "proposal_follow_up"],
    ["expansion", "We would like to add 12 users to our current plan.", "expansion"],
    ["renewal", "Let's discuss renewal of our annual subscription before the current term ends.", "renewal"],
    ["procurement", "What is your procurement process for selecting a vendor, including the security review?", "procurement"],
    ["demo request", "Could we schedule a demo to evaluate the workflow before deciding?", "demo_request"],
  ];
  for (const [label, body, signal] of revenueCases) {
    const routed = routeWithText({ sourceId: `revenue-${signal}`, subject: "Business inquiry", snippet: body.slice(0, 120) }, body);
    assert.equal(routed.decision.primaryOperator, "revenue", `${label} should route to Revenue`);
    assert.equal(routed.decision.commercialSignal, true, `${label} should be a commercial signal`);
    assert.ok(routed.decision.revenueSignals.includes(signal), `${label} should expose ${signal}`);
    assert.equal(routed.candidates[0]?.operatorKey, "revenue", `${label} should produce one Revenue candidate`);
  }

  // 25. False-positive safeguards retain noise suppression and non-Revenue ownership.
  const notRevenueCases = [
    ["password reset", "Security", "Your password reset code is 847231."],
    ["support ticket", "Integration broken", "The integration is not working. Please help me fix this issue."],
    ["newsletter", "Weekly newsletter", "Read our weekly digest. Unsubscribe here."],
    ["invoice receipt", "Receipt", "Your invoice paid receipt is attached."],
    ["automated notification", "Build complete", "Do not reply. Automated notification: deployment completed."],
    ["personal message", "Weekend plans", "Hi, are we still meeting for coffee and the family picnic this weekend?"],
  ];
  for (const [label, subject, body] of notRevenueCases) {
    const routed = routeWithText({ from: label === "automated notification" ? "noreply@vendor.example" : "friend@gmail.com", subject, snippet: body.slice(0, 120) }, body);
    assert.equal(routed.candidates.some((candidate) => candidate.operatorKey === "revenue"), false, `${label} must not route to Revenue`);
    assert.equal(routed.decision.commercialSignal === true && routed.decision.primaryOperator === "revenue", false, `${label} must not be marked as a Revenue opportunity`);
  }

  // 26. Quoted history and signatures do not contribute commercial evidence.
  const quoted = routeWithText({ subject: "Updated report", snippet: "I have attached the revised report." }, "I have attached the revised report.\n\nOn Monday, Dana wrote:\nWe need monthly pricing for 30 users and a proposal.\n\nBest,\nMichel\nSales Director");
  assert.equal(quoted.decision.commercialSignal, false);
  assert.equal(quoted.candidates.some((candidate) => candidate.operatorKey === "revenue"), false);

  // 27. Gmail multipart parsing selects text/plain, decodes UTF-8, and retains the full body separately from its provider snippet.
  const { parseSafeGmailMessage } = await loadGmailParser();
  const toBase64Url = (value) => Buffer.from(value, "utf8").toString("base64url");
  const parsed = parseSafeGmailMessage({
    id: "founder-test-message",
    threadId: "founder-test-thread",
    snippet: founderSnippet,
    payload: {
      mimeType: "multipart/alternative",
      headers: [
        { name: "From", value: "Sophie <sophie@northstarlabs.com>" },
        { name: "Subject", value: founderSubject },
      ],
      parts: [
        { mimeType: "text/plain; charset=UTF-8", body: { data: toBase64Url(founderBody) } },
        { mimeType: "text/html; charset=UTF-8", body: { data: toBase64Url("<p>HTML fallback with unrelated content</p>") } },
      ],
    },
  });
  assert.equal(parsed.id, "founder-test-message");
  assert.equal(parsed.threadId, "founder-test-thread");
  assert.equal(parsed.fromEmail, "sophie@northstarlabs.com");
  assert.equal(parsed.subject, founderSubject);
  assert.equal(parsed.snippet, founderSnippet.replace(/[\r\n]+/g, " ").trim());
  assert.ok(parsed.bodyText.includes("monthly pricing for a team of 30"));
  assert.ok(parsed.bodyText.includes("We’re planning to make a final decision by Thursday."));
  assert.doesNotMatch(parsed.bodyText, /HTML fallback/, "text/plain takes precedence when multipart/alternative has both forms");
  const parsedFounderRoute = routeWithText({
    sourceId: parsed.id,
    threadId: parsed.threadId,
    from: "Sophie <sophie@northstarlabs.com>",
    subject: parsed.subject,
    snippet: parsed.snippet,
  }, parsed.bodyText);
  assert.equal(parsedFounderRoute.decision.primaryOperator, "revenue", "the Gmail parser output must remain Revenue when passed through the classifier");
  assert.ok(parsedFounderRoute.decision.revenueSignals.includes("pricing"));
  const htmlOnly = parseSafeGmailMessage({
    id: "html-only",
    payload: { mimeType: "text/html", body: { data: toBase64Url("<p>Could you send <strong>pricing</strong>?</p>") } },
  });
  assert.match(htmlOnly.bodyText, /Could you send pricing\?/);
  const boundedBody = parseSafeGmailMessage({
    id: "long-body",
    payload: { mimeType: "text/plain", body: { data: toBase64Url("x".repeat(5000)) } },
  });
  assert.equal(boundedBody.bodyText.length, 4003, "parsed message text remains capped at 4,000 characters plus the truncation marker");
  assert.ok(boundedBody.bodyText.endsWith("..."));

  console.log("inbound-intent-routing-smoke: routing, semantic Revenue, false-positive, and Gmail parsing scenarios passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
