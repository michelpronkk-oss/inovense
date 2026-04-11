import { z } from "zod";
import { LeadResearchOutputSchema } from "@/lib/agents/lead-research/schema";

/* ─── Input ──────────────────────────────────────────────────────────────── */

export const ExistingProposalSchema = z.object({
  proposal_title: z.string().nullable(),
  proposal_intro: z.string().nullable(),
  proposal_scope: z.string().nullable(),
  proposal_deliverables: z.string().nullable(),
  proposal_timeline: z.string().nullable(),
  proposal_notes: z.string().nullable(),
});

export const ProposalAngleInputSchema = z.object({
  lead_id: z.string(),
  company_name: z.string(),
  lead_source: z.string().nullable(),
  service_lane: z.string(),
  project_type: z.string().nullable(),
  budget_range: z.string().nullable(),
  timeline: z.string().nullable(),
  project_details: z.string().nullable(),

  research_audit: LeadResearchOutputSchema,
  research_audit_at: z.string().nullable(),

  existing_proposal: ExistingProposalSchema,

  force_output_language: z.enum(["en", "nl"]).optional(),
  mode: z.enum(["quick", "standard"]).optional(),
});

export type ProposalAngleInput = z.infer<typeof ProposalAngleInputSchema>;

/* ─── Output ─────────────────────────────────────────────────────────────── */

export const ProposalPrefillSchema = z.object({
  proposal_title: z.string().nullable(),
  proposal_intro: z.string().nullable(),
  proposal_scope: z.string().nullable(),
  proposal_deliverables: z.string().nullable(),
  proposal_timeline: z.string().nullable(),
  proposal_notes: z.string().nullable(),
});

export const ProposalAngleOutputSchema = z.object({
  version: z.literal("1.0"),
  generated_at: z.string(),
  lead_id: z.string(),

  output_language: z.enum(["en", "nl"]),
  language_reason: z.enum([
    "manual_override",
    "agent1_alignment",
    "lead_source_fallback",
  ]),

  proposal_angle_title: z.string(),
  current_situation: z.string(),
  what_is_likely_holding_growth_back: z.string(),
  recommended_scope: z.string(),
  expected_outcome: z.string(),
  why_now: z.string(),

  optional_intro_paragraph: z.string().nullable(),
  optional_email_intro_paragraph: z.string().nullable(),
  internal_notes: z.array(z.string()),

  proposal_prefill: ProposalPrefillSchema,

  run_warnings: z.array(z.string()),
});

export type ProposalAngleOutput = z.infer<typeof ProposalAngleOutputSchema>;
