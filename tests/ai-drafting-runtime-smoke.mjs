import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Runtime smoke test for the two live Anthropic drafting paths (Revenue,
// Client Flow). Unlike the source-contract smoke tests, this file actually
// executes the real ai-drafting.ts modules with `global.fetch` swapped for a
// mock, proving (not just pattern-matching) three real branches:
//   1. missing ANTHROPIC_API_KEY -> deterministic fallback
//   2. a well-formed Anthropic response -> the model draft is used
//   3. a malformed/non-JSON Anthropic response -> deterministic fallback
//   4. a thrown/rejected Anthropic call -> deterministic fallback
// No live Anthropic credentials or network access are used - fetch is fully
// mocked in-process.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-ai-runtime-smoke");
fs.mkdirSync(tmpDir, { recursive: true });

function loadModule(relSourcePath) {
  const source = fs.readFileSync(path.join(root, relSourcePath), "utf8");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href + `?t=${Date.now()}`);
}

function mockFetchOnce(responder) {
  const original = global.fetch;
  global.fetch = async (...args) => responder(...args);
  return () => { global.fetch = original; };
}

function textResponse(body, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const deterministicDraft = { to: "lead@example.com", subject: "Re: pricing", body: "Deterministic body." };

async function testRevenue() {
  const { draftRevenueFollowUpWithAI, REVENUE_DRAFT_MODEL } = await loadModule("src/lib/operators/revenue/ai-drafting.ts");

  const opportunity = {
    message: { from: "Lead <lead@example.com>", fromEmail: "lead@example.com", subject: "Pricing question", snippet: "What does this cost?" },
    matchedKeywords: ["pricing"],
    classification: "revenue_opportunity",
    confidence: "high",
  };
  const context = {
    workspaceId: "ws-test",
    companyName: "Auterim",
    website: "auterim.com",
    offerSummary: null,
    toneOfVoice: null,
    pricingRules: [],
    policies: { approvalPolicy: {}, bannedClaims: [] },
    approvedExamples: [],
    rejectedExamples: [],
    recentSuccessfulApprovalLearnings: [],
    recentRejectionLearnings: [],
    memoryKeysUsed: ["os_workspaces:name"],
  };

  // 1. Missing API key -> fallback, no fetch call attempted.
  {
    const prevKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const restoreFetch = mockFetchOnce(() => { throw new Error("fetch must not be called when the API key is missing"); });
    try {
      const result = await draftRevenueFollowUpWithAI({ opportunity, deterministicDraft, context });
      assert.equal(result.draftingMetadata.fallbackUsed, true, "missing key must fall back");
      assert.equal(result.draftingMetadata.modelUsed, null, "missing key must not report a model used");
      assert.match(result.draftingMetadata.error ?? "", /ANTHROPIC_API_KEY is not set/);
      assert.deepEqual(result.draft, deterministicDraft, "fallback must return the deterministic draft untouched");
    } finally {
      restoreFetch();
      if (prevKey !== undefined) process.env.ANTHROPIC_API_KEY = prevKey;
    }
  }

  process.env.ANTHROPIC_API_KEY = "test-key-not-real";

  // 2. Well-formed model response -> real AI draft is used, fallbackUsed=false.
  {
    const restoreFetch = mockFetchOnce(() => textResponse({
      content: [{ type: "text", text: JSON.stringify({
        detectedSignalSummary: "Lead asked about pricing.",
        whyThisMatters: "Direct pricing intent.",
        suggestedAction: "Approve the reply.",
        subject: "Re: your pricing question",
        draftBody: "Thanks for asking about pricing. Happy to walk through it on a short call.",
        expectedOutcome: "Lead responds with availability.",
        riskNotes: "External send requires approval.",
      }) }],
    }));
    try {
      const result = await draftRevenueFollowUpWithAI({ opportunity, deterministicDraft, context });
      assert.equal(result.draftingMetadata.fallbackUsed, false, "a valid model response must not fall back");
      assert.equal(result.draftingMetadata.modelUsed, REVENUE_DRAFT_MODEL);
      assert.equal(result.draft.subject, "Re: your pricing question");
      assert.match(result.draft.body, /short call/);
    } finally {
      restoreFetch();
    }
  }

  // 3. Malformed (non-JSON) model text -> fallback.
  {
    const restoreFetch = mockFetchOnce(() => textResponse({
      content: [{ type: "text", text: "not valid json at all {{{" }],
    }));
    try {
      const result = await draftRevenueFollowUpWithAI({ opportunity, deterministicDraft, context });
      assert.equal(result.draftingMetadata.fallbackUsed, true, "malformed JSON must fall back");
      assert.equal(result.draftingMetadata.modelUsed, null);
      assert.match(result.draftingMetadata.error ?? "", /not valid JSON/);
      assert.deepEqual(result.draft, deterministicDraft);
    } finally {
      restoreFetch();
    }
  }

  // 4. Anthropic call throws (network/API error) -> fallback, no unhandled rejection.
  {
    const restoreFetch = mockFetchOnce(() => { throw new Error("simulated network failure"); });
    try {
      const result = await draftRevenueFollowUpWithAI({ opportunity, deterministicDraft, context });
      assert.equal(result.draftingMetadata.fallbackUsed, true, "a thrown/rejected call must fall back, not throw");
      assert.equal(result.draftingMetadata.modelUsed, null);
      assert.deepEqual(result.draft, deterministicDraft);
    } finally {
      restoreFetch();
    }
  }

  console.log("  Revenue AI drafting: missing-key, success, malformed, and error paths all verified.");
}

async function testClientFlow() {
  const { draftClientFlowReplyWithAI, CLIENT_FLOW_DRAFT_MODEL } = await loadModule("src/lib/operators/client-flow/ai-drafting.ts");

  const signal = {
    message: { from: "Client <client@example.com>", fromEmail: "client@example.com", subject: "Can we change the scope?", snippet: "Can we adjust the timeline?" },
    signalType: "change_request",
    confidence: "high",
    matchedKeywords: ["change"],
  };
  const defaultTaskTitle = "Change request: client@example.com";
  const defaultTaskDescription = "Client signal: change request.";

  // 1. Missing API key -> fallback.
  {
    const prevKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const restoreFetch = mockFetchOnce(() => { throw new Error("fetch must not be called when the API key is missing"); });
    try {
      const result = await draftClientFlowReplyWithAI({ signal, deterministicDraft, defaultTaskTitle, defaultTaskDescription });
      assert.equal(result.draftingMetadata.fallbackUsed, true);
      assert.equal(result.draftingMetadata.modelUsed, null);
      assert.match(result.draftingMetadata.error ?? "", /ANTHROPIC_API_KEY is not set/);
      assert.deepEqual(result.draft, deterministicDraft);
    } finally {
      restoreFetch();
      if (prevKey !== undefined) process.env.ANTHROPIC_API_KEY = prevKey;
    }
  }

  process.env.ANTHROPIC_API_KEY = "test-key-not-real";

  // 2. Well-formed model response -> real AI draft is used.
  {
    const restoreFetch = mockFetchOnce(() => textResponse({
      content: [{ type: "text", text: JSON.stringify({
        detectedSignalSummary: "Client requested a scope change.",
        recommendedNextStep: "Confirm the new scope internally before replying.",
        subject: "Re: scope change",
        draftBody: "Thanks for flagging this, we will confirm the updated scope shortly.",
        trelloTaskTitle: "Review scope change",
        trelloTaskDescription: "Client asked to adjust timeline.",
        riskNotes: "External send requires approval.",
      }) }],
    }));
    try {
      const result = await draftClientFlowReplyWithAI({ signal, deterministicDraft, defaultTaskTitle, defaultTaskDescription });
      assert.equal(result.draftingMetadata.fallbackUsed, false);
      assert.equal(result.draftingMetadata.modelUsed, CLIENT_FLOW_DRAFT_MODEL);
      assert.equal(result.draft.subject, "Re: scope change");
      assert.equal(result.trelloTaskTitle, "Review scope change");
    } finally {
      restoreFetch();
    }
  }

  // 3. Malformed model text -> fallback.
  {
    const restoreFetch = mockFetchOnce(() => textResponse({
      content: [{ type: "text", text: "{not json" }],
    }));
    try {
      const result = await draftClientFlowReplyWithAI({ signal, deterministicDraft, defaultTaskTitle, defaultTaskDescription });
      assert.equal(result.draftingMetadata.fallbackUsed, true);
      assert.match(result.draftingMetadata.error ?? "", /not valid JSON/);
      assert.deepEqual(result.draft, deterministicDraft);
    } finally {
      restoreFetch();
    }
  }

  // 4. Thrown/rejected call -> fallback.
  {
    const restoreFetch = mockFetchOnce(() => { throw new Error("simulated network failure"); });
    try {
      const result = await draftClientFlowReplyWithAI({ signal, deterministicDraft, defaultTaskTitle, defaultTaskDescription });
      assert.equal(result.draftingMetadata.fallbackUsed, true);
      assert.deepEqual(result.draft, deterministicDraft);
    } finally {
      restoreFetch();
    }
  }

  console.log("  Client Flow AI drafting: missing-key, success, malformed, and error paths all verified.");
}

try {
  await testRevenue();
  await testClientFlow();
  console.log("ai-drafting-runtime-smoke: all checks passed.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
