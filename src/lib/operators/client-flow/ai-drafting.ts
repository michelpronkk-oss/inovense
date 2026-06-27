import Anthropic from "@anthropic-ai/sdk";
import type { PreparedGmailFollowUp } from "@/lib/operators/executors/gmail";
import type { ClientFlowSignal } from "@/lib/operators/client-flow/scan";

export const CLIENT_FLOW_DRAFT_PROMPT_VERSION = "client-flow-draft-v1.0";
export const CLIENT_FLOW_DRAFT_MODEL = process.env.CLIENT_FLOW_DRAFT_MODEL || "claude-sonnet-4-6";

export type ClientFlowAIDraftResult = {
  draft: PreparedGmailFollowUp;
  detectedSignalSummary: string;
  recommendedNextStep: string;
  trelloTaskTitle: string;
  trelloTaskDescription: string;
  riskNotes: string;
  draftingMetadata: {
    modelUsed: string | null;
    fallbackUsed: boolean;
    promptVersion: string;
    signalType: string;
    confidence: string;
    error?: string;
  };
};

type ModelDraftPayload = {
  detectedSignalSummary?: unknown;
  recommendedNextStep?: unknown;
  subject?: unknown;
  draftBody?: unknown;
  trelloTaskTitle?: unknown;
  trelloTaskDescription?: unknown;
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
  signal: ClientFlowSignal;
  deterministicDraft: PreparedGmailFollowUp;
  defaultTaskTitle: string;
  defaultTaskDescription: string;
  error?: string;
}): ClientFlowAIDraftResult {
  const snippet = input.signal.message.snippet || input.signal.message.subject || "a client message";
  return {
    draft: input.deterministicDraft,
    detectedSignalSummary: `Client message matched ${input.signal.signalType.replace(/_/g, " ")}: ${snippet.slice(0, 180)}${snippet.length > 180 ? "..." : ""}`,
    recommendedNextStep: "Review the prepared client reply and decide whether to send it after approval.",
    trelloTaskTitle: input.defaultTaskTitle,
    trelloTaskDescription: input.defaultTaskDescription,
    riskNotes: "Medium risk because this is an external client email. Human approval is required before sending.",
    draftingMetadata: {
      modelUsed: null,
      fallbackUsed: true,
      promptVersion: CLIENT_FLOW_DRAFT_PROMPT_VERSION,
      signalType: input.signal.signalType,
      confidence: input.signal.confidence,
      error: input.error,
    },
  };
}

function buildSystemPrompt(): string {
  return `You draft approval-gated Client Flow Operator replies for Inovense.

You support existing client communication: project updates, delivery questions, change requests, and open loops. You never handle sales leads or pricing.

Important boundaries:
- You only draft. You never decide whether to send.
- Do not make promises about dates, scope, or pricing that are not in the source message.
- Do not invent deliverables, status, or commitments.
- Use only the safe Gmail metadata provided.
- Keep the reply calm, human, concise, and clear with one obvious next step.
- Acknowledge the request, confirm you have noted it, and state the next step plainly.
- Do not over-explain. Do not sound robotic or use AI-sounding language.
- Avoid em dashes. No emojis.
- Respond with only valid JSON.`;
}

function buildUserPrompt(input: {
  signal: ClientFlowSignal;
  deterministicDraft: PreparedGmailFollowUp;
}): string {
  const message = input.signal.message;
  return `DETECTED CLIENT SIGNAL:
- Signal type: ${input.signal.signalType}
- Confidence: ${input.signal.confidence}
- Matched cues: ${input.signal.matchedKeywords.join(", ") || "(none)"}

SAFE GMAIL SIGNAL:
- From: ${message.from}
- From email: ${message.fromEmail}
- Subject: ${message.subject || "(no subject)"}
- Snippet: ${message.snippet || "(no snippet)"}

DETERMINISTIC FALLBACK DRAFT:
Subject: ${input.deterministicDraft.subject}
Body:
${input.deterministicDraft.body}

Return this JSON shape exactly:
{
  "detectedSignalSummary": "1 sentence. What Client Flow detected.",
  "recommendedNextStep": "1 sentence. The clear next step for the human.",
  "subject": "Email subject, max 90 chars.",
  "draftBody": "Plain text client reply. No markdown. No invented promises.",
  "trelloTaskTitle": "Short internal task title, max 70 chars.",
  "trelloTaskDescription": "2-4 short lines of safe internal context for the task.",
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

export async function draftClientFlowReplyWithAI(input: {
  signal: ClientFlowSignal;
  deterministicDraft: PreparedGmailFollowUp;
  defaultTaskTitle: string;
  defaultTaskDescription: string;
}): Promise<ClientFlowAIDraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackResult({ ...input, error: "ANTHROPIC_API_KEY is not set." });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: CLIENT_FLOW_DRAFT_MODEL,
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
    const detectedSignalSummary = asString(payload.detectedSignalSummary) ?? `Client message matched ${input.signal.signalType.replace(/_/g, " ")}.`;
    const recommendedNextStep = asString(payload.recommendedNextStep) ?? "Review the prepared client reply for approval.";
    const trelloTaskTitle = (asString(payload.trelloTaskTitle) ?? input.defaultTaskTitle).slice(0, 70);
    const trelloTaskDescription = (asString(payload.trelloTaskDescription) ?? input.defaultTaskDescription).slice(0, 1200);
    const riskNotes = asString(payload.riskNotes) ?? "External client email send requires human approval before execution.";

    return {
      draft: { to: input.deterministicDraft.to, subject, body },
      detectedSignalSummary,
      recommendedNextStep,
      trelloTaskTitle,
      trelloTaskDescription,
      riskNotes,
      draftingMetadata: {
        modelUsed: CLIENT_FLOW_DRAFT_MODEL,
        fallbackUsed: false,
        promptVersion: CLIENT_FLOW_DRAFT_PROMPT_VERSION,
        signalType: input.signal.signalType,
        confidence: input.signal.confidence,
      },
    };
  } catch (error) {
    return fallbackResult({
      ...input,
      error: error instanceof Error ? error.message : "AI drafting failed.",
    });
  }
}
