import Anthropic from "@anthropic-ai/sdk";
import { getClientLocaleForLeadSource } from "@/lib/client-locale";
import {
  ProposalAngleInputSchema,
  ProposalAngleOutputSchema,
  type ProposalAngleInput,
  type ProposalAngleOutput,
} from "./schema";
import type { LeadResearchOutput } from "@/lib/agents/lead-research/schema";

const MODEL = "claude-sonnet-4-6";

/* ─── Language resolution ────────────────────────────────────────────────── */

type LanguageResolution = {
  output_language: "en" | "nl";
  language_reason:
    | "manual_override"
    | "agent1_alignment"
    | "lead_source_fallback";
};

function resolveOutputLanguage(
  input: Pick<
    ProposalAngleInput,
    "force_output_language" | "lead_source" | "research_audit"
  >
): LanguageResolution {
  if (input.force_output_language) {
    return {
      output_language: input.force_output_language,
      language_reason: "manual_override",
    };
  }
  if (
    input.research_audit.output_language === "en" ||
    input.research_audit.output_language === "nl"
  ) {
    return {
      output_language: input.research_audit.output_language,
      language_reason: "agent1_alignment",
    };
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

  return obj;
}

/* ─── Prompt builders ────────────────────────────────────────────────────── */

function buildSystemPrompt(): string {
  return `You are an internal proposal strategist for Inovense, a premium digital agency.

Your task: take Agent 1 commercial research on a lead and produce structured proposal framing. This is INTERNAL output only. Do not generate a full proposal document. Do not send emails. Do not change lead status.

Output rules:
- Respond with ONLY valid JSON. No markdown, no prose, no code fences.
- Match the exact output schema provided.
- All narrative text must be written in the specified output_language. JSON keys remain in English.
- proposal_prefill fields that are client-facing (proposal_title, proposal_intro, proposal_scope, proposal_deliverables, proposal_timeline) must be premium, human, and ready to use. No generic agency copy.
- proposal_prefill.proposal_notes is internal only and must NOT be client-facing.
- Keep each prefill field focused: proposal_intro is 2-3 sentences max. proposal_scope, proposal_deliverables, proposal_timeline are each 2-4 sentences.
- optional_intro_paragraph and optional_email_intro_paragraph may be null if not useful.
- internal_notes should surface any assumptions, caveats, or things to verify.
- run_warnings should surface any concerns about data quality or confidence.
- Never use em dashes. Use periods, commas, colons, or hyphens only.`;
}

function formatResearchAudit(audit: LeadResearchOutput): string {
  const snap = audit.company_snapshot;
  const ca = audit.commercial_audit;
  const pai = audit.proposal_angle_inputs;

  const lines: string[] = [
    `Executive summary: ${audit.executive_summary}`,
    "",
    "Company snapshot:",
    snap.what_the_company_sells
      ? `  - What they sell: ${snap.what_the_company_sells}`
      : "  - What they sell: unknown",
    snap.likely_target_customer
      ? `  - Target customer: ${snap.likely_target_customer}`
      : "  - Target customer: unknown",
    snap.business_model_guess
      ? `  - Business model: ${snap.business_model_guess}`
      : "",
    snap.market_geo_signal ? `  - Market / geo: ${snap.market_geo_signal}` : "",
    "",
    "Commercial audit:",
    ca.strengths.length
      ? `  Strengths:\n${ca.strengths.map((s) => `    - ${s}`).join("\n")}`
      : "",
    ca.trust_signals.length
      ? `  Trust signals:\n${ca.trust_signals.map((s) => `    - ${s}`).join("\n")}`
      : "",
    ca.gaps.length
      ? `  Gaps:\n${ca.gaps.map((s) => `    - ${s}`).join("\n")}`
      : "",
    ca.conversion_friction.length
      ? `  Conversion friction:\n${ca.conversion_friction.map((s) => `    - ${s}`).join("\n")}`
      : "",
    ca.risks.length
      ? `  Risks:\n${ca.risks.map((s) => `    - ${s}`).join("\n")}`
      : "",
    "",
    "Proposal angle inputs from Agent 1:",
    pai.likely_priorities.length
      ? `  Likely priorities:\n${pai.likely_priorities.map((s) => `    - ${s}`).join("\n")}`
      : "",
    pai.likely_objections.length
      ? `  Likely objections:\n${pai.likely_objections.map((s) => `    - ${s}`).join("\n")}`
      : "",
    `  Suggested lane fit: ${pai.suggested_lane_fit.join(", ") || "not determined"}`,
    pai.angle_seeds.length
      ? `  Angle seeds:\n${pai.angle_seeds.map((s) => `    - ${s}`).join("\n")}`
      : "",
  ];

  return lines.filter((l) => l !== "").join("\n");
}

function buildUserPrompt(
  input: ProposalAngleInput,
  resolution: LanguageResolution
): string {
  const langInstruction =
    resolution.output_language === "nl"
      ? "Write all narrative text in Dutch (Nederlands). JSON keys remain in English. Client-facing prefill fields must be written in premium Dutch."
      : "Write all narrative text in English. JSON keys remain in English. Client-facing prefill fields must be in premium, confident English.";

  const existingSection =
    Object.values(input.existing_proposal).some(Boolean)
      ? `Existing proposal fields (may be partial or empty):
  - Title: ${input.existing_proposal.proposal_title ?? "none"}
  - Intro: ${input.existing_proposal.proposal_intro ?? "none"}
  - Scope: ${input.existing_proposal.proposal_scope ?? "none"}
  - Deliverables: ${input.existing_proposal.proposal_deliverables ?? "none"}
  - Timeline: ${input.existing_proposal.proposal_timeline ?? "none"}
  - Notes: ${input.existing_proposal.proposal_notes ?? "none"}`
      : "Existing proposal fields: none set yet.";

  return `${langInstruction}

LEAD CONTEXT:
- Lead ID: ${input.lead_id}
- Company: ${input.company_name}
- Service lane: ${input.service_lane}
- Project type: ${input.project_type ?? "not specified"}
- Budget range: ${input.budget_range ?? "not specified"}
- Timeline: ${input.timeline ?? "not specified"}
- Lead source: ${input.lead_source ?? "unknown"}
- Project brief:
${input.project_details ?? "Not provided"}

AGENT 1 RESEARCH:
${formatResearchAudit(input.research_audit)}

${existingSection}

OUTPUT SCHEMA (output this exact JSON structure, no other text):
{
  "version": "1.0",
  "generated_at": "<ISO timestamp>",
  "lead_id": "${input.lead_id}",
  "output_language": "${resolution.output_language}",
  "language_reason": "${resolution.language_reason}",
  "proposal_angle_title": "<Short internal working title for this angle, 5-10 words>",
  "current_situation": "<1-2 sentences describing where the company is today, in output_language>",
  "what_is_likely_holding_growth_back": "<1-2 sentences on the core friction or gap that is blocking progress, in output_language>",
  "recommended_scope": "<2-3 sentences on what Inovense would focus on and why, in output_language>",
  "expected_outcome": "<1-2 sentences on what success looks like for the client, in output_language>",
  "why_now": "<1-2 sentences on timing and urgency, in output_language>",
  "optional_intro_paragraph": "<An optional soft opening paragraph that could open the proposal document, or null>",
  "optional_email_intro_paragraph": "<An optional 2-3 sentence intro for the proposal follow-up email, or null>",
  "internal_notes": ["<Assumptions, caveats, or things to verify before sending>"],
  "proposal_prefill": {
    "proposal_title": "<Client-facing short proposal title, in output_language>",
    "proposal_intro": "<2-3 sentence client-facing opening. Sets context and direction. Premium, human, not generic. In output_language>",
    "proposal_scope": "<2-4 sentence client-facing scope description. What is and is not included. In output_language>",
    "proposal_deliverables": "<2-4 sentence client-facing deliverables description. Specific, concrete. In output_language>",
    "proposal_timeline": "<2-3 sentence client-facing timeline description. Realistic and grounded. In output_language>",
    "proposal_notes": "<Internal notes for Inovense only. Assumptions, version context, things to check. NOT shown to client.>"
  },
  "run_warnings": ["<Any concerns about data quality or confidence>"]
}

Now output the JSON:`;
}

/* ─── Runner ─────────────────────────────────────────────────────────────── */

export type RunResult =
  | { ok: true; output: ProposalAngleOutput }
  | { ok: false; error: string };

export async function runProposalAngle(
  rawInput: ProposalAngleInput
): Promise<RunResult> {
  const parsed = ProposalAngleInputSchema.safeParse(rawInput);
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

  const validated = ProposalAngleOutputSchema.safeParse(parsedJson);
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
