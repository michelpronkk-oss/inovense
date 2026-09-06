import Anthropic from "@anthropic-ai/sdk";
import type { PreparedGmailFollowUp } from "@/lib/operators/executors/gmail";
import type { RevenueCompanyGraphContext } from "@/lib/operators/revenue/context";
import type { Opportunity, RevenueNextAction } from "@/lib/operators/revenue/scan";

export const REVENUE_DRAFT_PROMPT_VERSION = "revenue-draft-v1.9";
export const REVENUE_DRAFT_MODEL = process.env.REVENUE_DRAFT_MODEL || "claude-sonnet-4-6";

export type RevenueAIDraftResult = {
  draft: PreparedGmailFollowUp;
  detectedSignalSummary: string;
  whyThisMatters: string;
  suggestedAction: string;
  expectedOutcome: string;
  riskNotes: string;
  draftingMetadata: {
    modelUsed: string | null;
    memoryKeysUsed: string[];
    fallbackUsed: boolean;
    promptVersion: string;
    classification: string;
    confidence: string;
    error?: string;
  };
};

type ModelDraftPayload = {
  detectedSignalSummary?: unknown;
  whyThisMatters?: unknown;
  suggestedAction?: unknown;
  subject?: unknown;
  draftBody?: unknown;
  expectedOutcome?: unknown;
  riskNotes?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanSubject(value: string, fallback: string): string {
  const subject = value.replace(/[\r\n]+/g, " ").trim();
  return subject ? subject.slice(0, 120) : fallback;
}

function cleanBody(value: string, fallback: string): string {
  const body = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  return body ? body.slice(0, 4000) : fallback;
}

function fallbackResult(input: {
  opportunity: Opportunity;
  deterministicDraft: PreparedGmailFollowUp;
  context: RevenueCompanyGraphContext;
  nextAction?: RevenueNextAction;
  error?: string;
}): RevenueAIDraftResult {
  const snippet = input.opportunity.message.snippet || input.opportunity.message.subject || "an inbound revenue signal";
  return {
    draft: input.deterministicDraft,
    detectedSignalSummary: `Inbound message matched revenue intent: ${input.opportunity.matchedKeywords.join(", ")}.`,
    whyThisMatters: `The sender appears to be asking about ${snippet.slice(0, 180)}${snippet.length > 180 ? "..." : ""}`,
    suggestedAction: "Review and approve the prepared Gmail follow-up if the opportunity is real.",
    expectedOutcome: "A timely human-approved reply keeps the lead warm and moves toward qualification.",
    riskNotes: "Medium risk because this is an external email. Human approval is required before sending.",
    draftingMetadata: {
      modelUsed: null,
      memoryKeysUsed: input.context.memoryKeysUsed,
      fallbackUsed: true,
      promptVersion: REVENUE_DRAFT_PROMPT_VERSION,
      classification: input.opportunity.classification,
      confidence: input.opportunity.confidence,
      error: input.error,
    },
  };
}

function compactExamples(examples: RevenueCompanyGraphContext["approvedExamples"]): string {
  if (examples.length === 0) return "None available.";
  return examples.map((item) => [
    `- ${item.title}`,
    item.content ? `  ${item.content.slice(0, 500)}` : null,
  ].filter(Boolean).join("\n")).join("\n");
}

function buildSystemPrompt(): string {
  return `You draft approval-gated Revenue Operator follow-ups for Auterim.

Important boundaries:
- You only draft. You never decide whether to send.
- Do not claim the CRM was updated.
- Do not claim HubSpot actions executed.
- Do not invent pricing, guarantees, case studies, certifications, client names, or availability.
- Use only the provided company context and safe Gmail metadata.
- Keep the draft human, concise, calm, premium and specific.
- Keep it natural and not overly salesy.
- Avoid AI-sounding language, fake promises and exaggerated claims.
- Reference the inbound request when it is useful.
- Give one clear next step.
- Use a human close.
- Avoid em dashes.
- Respond with only valid JSON.`;
}

function buildUserPrompt(input: {
  opportunity: Opportunity;
  deterministicDraft: PreparedGmailFollowUp;
  context: RevenueCompanyGraphContext;
  nextAction?: RevenueNextAction;
}): string {
  const ctx = input.context;
  const draftPurposeLine = input.nextAction === "prepare_qualification_question"
    ? "DRAFT PURPOSE: Ask one short qualification question. Do not pitch or assume the sale yet - the signal is promising but ambiguous."
    : "DRAFT PURPOSE: Prepare a full follow-up reply to a confirmed commercial signal.";
  return `${draftPurposeLine}

COMPANY GRAPH CONTEXT:
- Company name: ${ctx.companyName ?? "unknown"}
- Website: ${ctx.website ?? "unknown"}
- Offer/products/services: ${ctx.offerSummary ?? "not stored"}
- Tone of voice: ${ctx.toneOfVoice ?? "premium, calm, clear"}
- Pricing/package rules: ${ctx.pricingRules.length ? ctx.pricingRules.join("; ") : "none stored"}
- Banned claims: ${ctx.policies.bannedClaims.length ? ctx.policies.bannedClaims.join("; ") : "none stored"}
- Approval policy JSON: ${JSON.stringify(ctx.policies.approvalPolicy).slice(0, 1200)}

APPROVED REVENUE EXAMPLES:
${compactExamples(ctx.approvedExamples)}

REJECTED REVENUE EXAMPLES:
${compactExamples(ctx.rejectedExamples)}

SAFE GMAIL SIGNAL:
- From: ${input.opportunity.message.from}
- From email: ${input.opportunity.message.fromEmail}
- Subject: ${input.opportunity.message.subject || "(no subject)"}
- Snippet: ${input.opportunity.message.snippet || "(no snippet)"}
- Matched keywords: ${input.opportunity.matchedKeywords.join(", ")}
- Classification: ${input.opportunity.classification}
- Confidence: ${input.opportunity.confidence}

DETERMINISTIC FALLBACK DRAFT:
Subject: ${input.deterministicDraft.subject}
Body:
${input.deterministicDraft.body}

Return this JSON shape exactly:
{
  "detectedSignalSummary": "1 sentence. What Revenue Operator detected.",
  "whyThisMatters": "1-2 sentences. Business reason for review.",
  "suggestedAction": "1 sentence. What the human should consider approving.",
  "subject": "Email subject, max 90 chars.",
  "draftBody": "Plain text email body. No markdown. No invented facts.",
  "expectedOutcome": "1 sentence. What may happen after approval.",
  "riskNotes": "1 sentence. Include that external send requires approval."
}`;
}

function parseModelPayload(rawText: string): ModelDraftPayload | null {
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? parsed as ModelDraftPayload : null;
  } catch {
    return null;
  }
}

export async function draftRevenueFollowUpWithAI(input: {
  opportunity: Opportunity;
  deterministicDraft: PreparedGmailFollowUp;
  context: RevenueCompanyGraphContext;
  nextAction?: RevenueNextAction;
}): Promise<RevenueAIDraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackResult({ ...input, error: "ANTHROPIC_API_KEY is not set." });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: REVENUE_DRAFT_MODEL,
      max_tokens: 1400,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      return fallbackResult({ ...input, error: "Unexpected model response type." });
    }

    const payload = parseModelPayload(block.text);
    if (!payload) {
      return fallbackResult({ ...input, error: "Model output was not valid JSON." });
    }

    const subject = cleanSubject(asString(payload.subject) ?? "", input.deterministicDraft.subject);
    const body = cleanBody(asString(payload.draftBody) ?? "", input.deterministicDraft.body);
    const detectedSignalSummary = asString(payload.detectedSignalSummary) ?? `Inbound message matched revenue intent: ${input.opportunity.matchedKeywords.join(", ")}.`;
    const whyThisMatters = asString(payload.whyThisMatters) ?? "Revenue Operator detected a high-confidence inbound revenue signal.";
    const suggestedAction = asString(payload.suggestedAction) ?? "Review the prepared Gmail follow-up for approval.";
    const expectedOutcome = asString(payload.expectedOutcome) ?? "A timely human-approved reply keeps the lead warm and moves toward qualification.";
    const riskNotes = asString(payload.riskNotes) ?? "External email send requires human approval before execution.";

    return {
      draft: {
        to: input.deterministicDraft.to,
        subject,
        body,
      },
      detectedSignalSummary,
      whyThisMatters,
      suggestedAction,
      expectedOutcome,
      riskNotes,
      draftingMetadata: {
        modelUsed: REVENUE_DRAFT_MODEL,
        memoryKeysUsed: input.context.memoryKeysUsed,
        fallbackUsed: false,
        promptVersion: REVENUE_DRAFT_PROMPT_VERSION,
        classification: input.opportunity.classification,
        confidence: input.opportunity.confidence,
      },
    };
  } catch (error) {
    return fallbackResult({
      ...input,
      error: error instanceof Error ? error.message : "AI drafting failed.",
    });
  }
}
