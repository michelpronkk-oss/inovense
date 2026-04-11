import { z } from "zod";

/* ─── Input ──────────────────────────────────────────────────────────────── */

export const LeadResearchInputSchema = z.object({
  lead_id: z.string(),
  company_name: z.string(),
  website_url: z.string().nullable(),
  lead_source: z.string().nullable(),
  service_lane: z.string(),
  project_type: z.string().nullable(),
  budget_range: z.string().nullable(),
  timeline: z.string().nullable(),
  project_details: z.string().nullable(),
  force_output_language: z.enum(["en", "nl"]).optional(),
  mode: z.enum(["quick", "standard"]).optional(),
});

export type LeadResearchInput = z.infer<typeof LeadResearchInputSchema>;

/* ─── Output ─────────────────────────────────────────────────────────────── */

export const CompanySnapshotSchema = z.object({
  what_the_company_sells: z.string().nullable(),
  likely_target_customer: z.string().nullable(),
  business_model_guess: z.string().nullable(),
  market_geo_signal: z.string().nullable(),
});

export const CommercialAuditSchema = z.object({
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  trust_signals: z.array(z.string()),
  conversion_friction: z.array(z.string()),
  risks: z.array(z.string()),
});

export const ProposalAngleInputsSchema = z.object({
  likely_priorities: z.array(z.string()),
  likely_objections: z.array(z.string()),
  suggested_lane_fit: z.array(z.enum(["Build", "Systems", "Growth"])),
  angle_seeds: z.array(z.string()),
});

export const SourceSchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  accessed_at: z.string(),
  language: z.enum(["en", "nl", "unknown"]),
  evidence: z.array(z.string()),
});

export const LeadResearchOutputSchema = z.object({
  version: z.literal("1.0"),
  generated_at: z.string(),
  lead_id: z.string(),
  output_language: z.enum(["en", "nl"]),
  detected_website_language: z.enum(["en", "nl", "mixed", "unknown"]),
  language_reason: z.enum([
    "website_detected",
    "lead_source_fallback",
    "manual_override",
  ]),
  executive_summary: z.string(),
  company_snapshot: CompanySnapshotSchema,
  commercial_audit: CommercialAuditSchema,
  proposal_angle_inputs: ProposalAngleInputsSchema,
  sources: z.array(SourceSchema),
  run_warnings: z.array(z.string()),
});

export type LeadResearchOutput = z.infer<typeof LeadResearchOutputSchema>;
