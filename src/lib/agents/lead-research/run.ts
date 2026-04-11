import Anthropic from "@anthropic-ai/sdk";
import { inspectSite } from "./site-inspector";
import { resolveOutputLanguage } from "./language";
import {
  LeadResearchInputSchema,
  LeadResearchOutputSchema,
  type LeadResearchInput,
  type LeadResearchOutput,
} from "./schema";

const MODEL = "claude-sonnet-4-6";

const VALID_LANES = new Set(["Build", "Systems", "Growth"]);

/**
 * Normalizes model output before Zod validation to handle known shape mismatches.
 * Keeps the output contract strict while absorbing predictable model quirks.
 */
function normalizeParsedOutput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;

  const pai = obj.proposal_angle_inputs;
  if (typeof pai !== "object" || pai === null) return obj;
  const paiObj = pai as Record<string, unknown>;

  const lf = paiObj.suggested_lane_fit;

  if (typeof lf === "string") {
    // "Build" -> ["Build"]
    // "Build, Systems" or "Build | Systems" -> ["Build", "Systems"]
    const parts = lf.split(/[\s,|]+/).map((s) => s.trim());
    paiObj.suggested_lane_fit = parts.filter((p) => VALID_LANES.has(p));
  } else if (Array.isArray(lf)) {
    // Filter out any values that are not valid lane names
    paiObj.suggested_lane_fit = lf.filter(
      (item) => typeof item === "string" && VALID_LANES.has(item)
    );
  } else {
    // Unexpected shape — default to empty (will pass schema, display as no lanes)
    paiObj.suggested_lane_fit = [];
  }

  return obj;
}

function buildSystemPrompt(): string {
  return `You are an internal commercial intelligence analyst for Inovense, a premium digital agency.

Your task: produce a structured JSON audit of a lead based on their company information, submitted project brief, and any website content provided.

This is INTERNAL output only. Do not generate client-facing copy. Do not write proposal fields. Do not change lead status.

Output rules:
- Respond with ONLY valid JSON. No markdown, no prose, no code fences.
- Match the exact output schema provided.
- All narrative text (summaries, audit points, seeds) must be written in the specified output_language.
- Keep observations commercially specific and useful. Avoid generic agency observations.
- Separate high-confidence observations from uncertain ones through field placement and run_warnings.
- Maximum executive_summary: 3 sentences.
- Maximum 5 items per array field.
- Null fields that have no evidence rather than guessing.
- suggested_lane_fit MUST be a JSON array. Valid values: "Build", "Systems", "Growth". Example: ["Build"] or ["Systems", "Growth"]. Never output a plain string for this field.`;
}

function buildUserPrompt(
  input: LeadResearchInput,
  siteExcerpt: string | null,
  outputLanguage: "en" | "nl",
  detectedWebsiteLanguage: "en" | "nl" | "mixed" | "unknown",
  languageReason: "website_detected" | "lead_source_fallback" | "manual_override",
  siteError: string | null,
  siteTitle: string | null,
  siteUrl: string,
  siteAccessedAt: string,
  siteEvidence: string[]
): string {
  const langInstruction =
    outputLanguage === "nl"
      ? "Write all narrative text in Dutch (Nederlands). JSON keys remain in English."
      : "Write all narrative text in English. JSON keys remain in English.";

  const websiteSection = siteError
    ? `Website: ${input.website_url ?? "none"}\nSite inspection failed: ${siteError}\nProceed with lead context only.`
    : `Website: ${input.website_url}\nTitle: ${siteTitle ?? "unknown"}\n\nWebsite excerpt (first ~6000 chars of visible text):\n${siteExcerpt}`;

  return `${langInstruction}

LEAD CONTEXT:
- Lead ID: ${input.lead_id}
- Company: ${input.company_name}
- Service lane requested: ${input.service_lane}
- Project type: ${input.project_type ?? "not specified"}
- Budget range: ${input.budget_range ?? "not specified"}
- Timeline: ${input.timeline ?? "not specified"}
- Lead source: ${input.lead_source ?? "unknown"}
- Project brief:
${input.project_details ?? "Not provided"}

${websiteSection}

OUTPUT SCHEMA (output this exact JSON structure):
{
  "version": "1.0",
  "generated_at": "<ISO timestamp>",
  "lead_id": "${input.lead_id}",
  "output_language": "${outputLanguage}",
  "detected_website_language": "${detectedWebsiteLanguage}",
  "language_reason": "${languageReason}",
  "executive_summary": "<3 sentences max>",
  "company_snapshot": {
    "what_the_company_sells": "<string or null>",
    "likely_target_customer": "<string or null>",
    "business_model_guess": "<string or null>",
    "market_geo_signal": "<string or null>"
  },
  "commercial_audit": {
    "strengths": ["<up to 5 items>"],
    "gaps": ["<up to 5 items>"],
    "trust_signals": ["<up to 5 items>"],
    "conversion_friction": ["<up to 5 items>"],
    "risks": ["<up to 5 items>"]
  },
  "proposal_angle_inputs": {
    "likely_priorities": ["<up to 5 items>"],
    "likely_objections": ["<up to 5 items>"],
    "suggested_lane_fit": ["Build", "Systems", "Growth"],  ← JSON array, pick 1-3 that apply
    "angle_seeds": ["<up to 5 items>"]
  },
  "sources": [
    {
      "url": "${siteUrl || input.website_url || ""}",
      "title": ${siteTitle ? `"${siteTitle.replace(/"/g, '\\"')}"` : "null"},
      "accessed_at": "${siteAccessedAt}",
      "language": "${detectedWebsiteLanguage === "mixed" || detectedWebsiteLanguage === "unknown" ? "unknown" : detectedWebsiteLanguage}",
      "evidence": ${JSON.stringify(siteEvidence.slice(0, 5))}
    }
  ],
  "run_warnings": ["<any caveats about data quality or confidence>"]
}

Now output the JSON audit:`;
}

export type RunResult =
  | { ok: true; output: LeadResearchOutput }
  | { ok: false; error: string };

export async function runLeadResearch(
  rawInput: LeadResearchInput
): Promise<RunResult> {
  const parsed = LeadResearchInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input: " + parsed.error.message };
  }
  const input = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not set." };
  }

  // 1. Inspect website
  const site = await inspectSite(input.website_url);

  // 2. Resolve output language
  const langResolution = resolveOutputLanguage(
    { force_output_language: input.force_output_language, lead_source: input.lead_source },
    site.detected_language
  );

  // 3. Build prompt
  const userPrompt = buildUserPrompt(
    input,
    site.excerpt || null,
    langResolution.output_language,
    langResolution.detected_website_language,
    langResolution.language_reason,
    site.error,
    site.title,
    site.url,
    site.accessed_at,
    site.evidence
  );

  // 4. Call Claude
  const client = new Anthropic({ apiKey });

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: input.mode === "quick" ? 2048 : 4096,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: userPrompt }],
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

  // 5. Parse JSON
  let parsed_json: unknown;
  try {
    // Strip accidental markdown fences if present
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed_json = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      error: "Model output was not valid JSON.",
    };
  }

  // 5b. Normalize known fragile fields before schema validation.
  // The model occasionally returns a plain string for suggested_lane_fit
  // instead of an array. Coerce it here so Zod sees the correct shape.
  parsed_json = normalizeParsedOutput(parsed_json);

  // 6. Validate with Zod
  const validated = LeadResearchOutputSchema.safeParse(parsed_json);
  if (!validated.success) {
    return {
      ok: false,
      error: "Output schema validation failed: " + validated.error.message,
    };
  }

  // 7. Merge in site warnings
  const output = validated.data;
  if (site.error) {
    const warningText = `Website inspection: ${site.error}`;
    if (!output.run_warnings.includes(warningText)) {
      output.run_warnings.unshift(warningText);
    }
  }

  // Ensure generated_at is set (model may not have filled it correctly)
  output.generated_at = new Date().toISOString();
  output.lead_id = input.lead_id;

  return { ok: true, output };
}
