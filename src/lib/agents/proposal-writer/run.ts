import Anthropic from "@anthropic-ai/sdk";
import { getClientLocaleForLeadSource } from "@/lib/client-locale";
import { normalizeCurrencyCode } from "@/lib/currency";
import {
  ProposalWriterInputSchema,
  ProposalWriterOutputSchema,
  type ProposalWriterInput,
  type ProposalWriterOutput,
} from "./schema";
import type { LeadResearchOutput } from "@/lib/agents/lead-research/schema";
import type { ProposalAngleOutput } from "@/lib/agents/proposal-angle/schema";

const MODEL = "claude-sonnet-4-6";

/* ─── Language resolution ────────────────────────────────────────────────── */

type LanguageResolution = {
  output_language: "en" | "nl";
  language_reason:
    | "manual_override"
    | "agent2_alignment"
    | "agent1_alignment"
    | "lead_source_fallback";
};

function resolveOutputLanguage(
  input: Pick<
    ProposalWriterInput,
    | "force_output_language"
    | "lead_source"
    | "research_audit"
    | "proposal_angle"
  >
): LanguageResolution {
  if (input.force_output_language) {
    return {
      output_language: input.force_output_language,
      language_reason: "manual_override",
    };
  }
  const a2lang = input.proposal_angle.output_language;
  if (a2lang === "en" || a2lang === "nl") {
    return { output_language: a2lang, language_reason: "agent2_alignment" };
  }
  const a1lang = input.research_audit.output_language;
  if (a1lang === "en" || a1lang === "nl") {
    return { output_language: a1lang, language_reason: "agent1_alignment" };
  }
  return {
    output_language: getClientLocaleForLeadSource(input.lead_source),
    language_reason: "lead_source_fallback",
  };
}

/* ─── Normalization ──────────────────────────────────────────────────────── */

function normalizeStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function normalizeParsedOutput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;
  obj.internal_notes = normalizeStringArray(obj.internal_notes);
  obj.run_warnings = normalizeStringArray(obj.run_warnings);
  obj.safety_redactions = normalizeStringArray(obj.safety_redactions);
  return obj;
}

/* ─── Prompt builders ────────────────────────────────────────────────────── */

function formatResearchContext(audit: LeadResearchOutput): string {
  const snap = audit.company_snapshot;
  return [
    `Summary: ${audit.executive_summary}`,
    snap.what_the_company_sells
      ? `What they sell: ${snap.what_the_company_sells}`
      : null,
    snap.likely_target_customer
      ? `Target customer: ${snap.likely_target_customer}`
      : null,
    snap.market_geo_signal
      ? `Market/geo: ${snap.market_geo_signal}`
      : null,
    audit.commercial_audit.strengths.length
      ? `Strengths: ${audit.commercial_audit.strengths.join("; ")}`
      : null,
    audit.commercial_audit.gaps.length
      ? `Gaps: ${audit.commercial_audit.gaps.join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatAngleContext(angle: ProposalAngleOutput): string {
  return [
    `Angle title: ${angle.proposal_angle_title}`,
    `Current situation: ${angle.current_situation}`,
    `What is likely holding growth back: ${angle.what_is_likely_holding_growth_back}`,
    `Recommended scope: ${angle.recommended_scope}`,
    `Expected outcome: ${angle.expected_outcome}`,
    `Why now: ${angle.why_now}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSystemPrompt(): string {
  return `You are a senior proposal writer for Inovense, a premium digital agency.

Your task: write clean, client-facing proposal content and a concise proposal email draft.

This is the OUTPUT layer. The source material you receive (commercial audit, framing notes, objections, risks) is INTERNAL STRATEGY. It must NOT appear in client-facing output.

Content boundary rules (treat violations as bugs):
- Never copy risks, objections, assumptions, internal notes, or confidence caveats into proposal_prefill or proposal_email_prefill
- Never mention "Agent 1", "Agent 2", "research audit", "commercial audit", "objections", or "internal" in client output
- Never include budget realism concerns, risk language, or strategy caveats in client copy
- If you had to exclude something to protect this boundary, document it in safety_redactions

Email rules:
- proposal_email_prefill.body must be max 2 short paragraphs
- The email intro must point to the proposal page, not duplicate proposal content
- Do not write a full proposal in the email body

Writing rules:
- All client-facing text (proposal_prefill, proposal_email_prefill) must be in the specified output_language
- JSON keys remain in English
- Premium, human, confident tone. No generic agency fluff
- Never use em dashes. Use periods, commas, colons, or hyphens only
- proposal_intro: 2-3 sentences max
- proposal_scope, proposal_deliverables, proposal_timeline: 2-4 sentences each

Respond with ONLY valid JSON. No markdown, no prose, no code fences.`;
}

function buildUserPrompt(
  input: ProposalWriterInput,
  resolution: LanguageResolution
): string {
  const langInstruction =
    resolution.output_language === "nl"
      ? "Write all client-facing text in Dutch (Nederlands). JSON keys remain in English."
      : "Write all client-facing text in English. JSON keys remain in English.";
  const proposalCurrencyCode = normalizeCurrencyCode(
    input.existing_proposal.local_currency_code
  );

  const priceCtx =
    input.existing_proposal.proposal_price != null
      ? `Proposal price: ${proposalCurrencyCode} ${input.existing_proposal.proposal_price}`
      : "Proposal price: not set";
  const depositCtx =
    input.existing_proposal.proposal_deposit != null
      ? `Deposit: ${proposalCurrencyCode} ${input.existing_proposal.proposal_deposit}`
      : "Deposit: not set";

  const existingCtx = [
    input.existing_proposal.proposal_title
      ? `Existing title: ${input.existing_proposal.proposal_title}`
      : null,
    input.existing_proposal.proposal_intro
      ? `Existing intro: ${input.existing_proposal.proposal_intro}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${langInstruction}

LEAD CONTEXT:
- Lead ID: ${input.lead_id}
- Company: ${input.company_name}
- Service lane: ${input.service_lane}
- Project type: ${input.project_type ?? "not specified"}
- Budget range: ${input.budget_range ?? "not specified"}
- Timeline: ${input.timeline ?? "not specified"}
- ${priceCtx}
- ${depositCtx}
- Project brief: ${input.project_details ?? "not provided"}

INTERNAL SOURCE MATERIAL (do not copy into client output):
--- Agent 1 Research ---
${formatResearchContext(input.research_audit)}

--- Agent 2 Framing ---
${formatAngleContext(input.proposal_angle)}

${existingCtx ? `EXISTING PROPOSAL FIELDS:\n${existingCtx}\n` : ""}
EMAIL TEMPLATE DEFAULT (for reference):
Subject: ${input.email_template_defaults.proposal_sent_subject}
Body default: ${input.email_template_defaults.proposal_sent_body}

OUTPUT SCHEMA (output this exact JSON structure, no other text):
{
  "version": "1.0",
  "generated_at": "<ISO timestamp>",
  "lead_id": "${input.lead_id}",
  "output_language": "${resolution.output_language}",
  "language_reason": "${resolution.language_reason}",
  "proposal_prefill": {
    "proposal_title": "<Client-facing short title. Specific to this company and scope. In output_language>",
    "proposal_intro": "<2-3 sentences. Opens the proposal. Situation and direction. Client-facing, premium. In output_language>",
    "proposal_scope": "<2-4 sentences. What is in scope, specific and concrete. Client-facing. In output_language>",
    "proposal_deliverables": "<2-4 sentences. Specific deliverables. Client-facing. In output_language>",
    "proposal_timeline": "<2-3 sentences. Realistic timeline. Client-facing. In output_language>"
  },
  "proposal_email_prefill": {
    "subject": "<Short specific subject line, max 60 chars, in output_language>",
    "body": "<Max 2 short paragraphs. Concise intro + invite to review. Points to proposal page, does NOT duplicate it. In output_language>"
  },
  "optional_proposal_summary": "<A single sentence summary of the proposal angle for the admin, or null>",
  "internal_notes": ["<Admin-facing notes: things to verify, assumptions made, things to check before sending>"],
  "run_warnings": ["<Any data quality or confidence concerns>"],
  "safety_redactions": ["<Anything you chose not to include in client copy and why>"]
}

Now output the JSON:`;
}

/* ─── Runner ─────────────────────────────────────────────────────────────── */

export type RunResult =
  | { ok: true; output: ProposalWriterOutput }
  | { ok: false; error: string };

export async function runProposalWriter(
  rawInput: ProposalWriterInput
): Promise<RunResult> {
  const parsed = ProposalWriterInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input: " + parsed.error.message };
  }
  const input = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not set." };
  }

  const resolution = resolveOutputLanguage(input);

  const client = new Anthropic({ apiKey });

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: input.mode === "quick" ? 2048 : 4096,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(input, resolution) }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      return { ok: false, error: "Unexpected response type from model." };
    }
    rawText = block.text.trim();
  } catch (err) {
    return {
      ok: false,
      error: `Model call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let parsedJson: unknown;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsedJson = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: "Model output was not valid JSON." };
  }

  parsedJson = normalizeParsedOutput(parsedJson);

  const validated = ProposalWriterOutputSchema.safeParse(parsedJson);
  if (!validated.success) {
    return {
      ok: false,
      error: "Output schema validation failed: " + validated.error.message,
    };
  }

  const output = validated.data;
  output.generated_at = new Date().toISOString();
  output.lead_id = input.lead_id;

  return { ok: true, output };
}
