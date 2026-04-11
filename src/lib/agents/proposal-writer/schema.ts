import { z } from "zod";
import { LeadResearchOutputSchema } from "@/lib/agents/lead-research/schema";
import { ProposalAngleOutputSchema } from "@/lib/agents/proposal-angle/schema";

/* ─── Input ──────────────────────────────────────────────────────────────── */

export const ProposalWriterInputSchema = z.object({
  lead_id: z.string(),
  company_name: z.string(),
  lead_source: z.string().nullable(),
  service_lane: z.string(),
  project_type: z.string().nullable(),
  budget_range: z.string().nullable(),
  timeline: z.string().nullable(),
  project_details: z.string().nullable(),

  research_audit: LeadResearchOutputSchema,
  proposal_angle: ProposalAngleOutputSchema,
  proposal_angle_at: z.string().nullable(),

  existing_proposal: z.object({
    proposal_title: z.string().nullable(),
    proposal_intro: z.string().nullable(),
    proposal_scope: z.string().nullable(),
    proposal_deliverables: z.string().nullable(),
    proposal_timeline: z.string().nullable(),
    proposal_notes: z.string().nullable(),
    proposal_price: z.number().nullable(),
    proposal_deposit: z.number().nullable(),
    local_currency_code: z.string().nullable(),
  }),

  email_template_defaults: z.object({
    proposal_sent_subject: z.string(),
    proposal_sent_body: z.string(),
  }),

  force_output_language: z.enum(["en", "nl"]).optional(),
  mode: z.enum(["quick", "standard"]).optional(),
});

export type ProposalWriterInput = z.infer<typeof ProposalWriterInputSchema>;

/* ─── Output ─────────────────────────────────────────────────────────────── */

export const ProposalWriterOutputSchema = z.object({
  version: z.literal("1.0"),
  generated_at: z.string(),
  lead_id: z.string(),

  output_language: z.enum(["en", "nl"]),
  language_reason: z.enum([
    "manual_override",
    "agent2_alignment",
    "agent1_alignment",
    "lead_source_fallback",
  ]),

  proposal_prefill: z.object({
    proposal_title: z.string().nullable(),
    proposal_intro: z.string().nullable(),
    proposal_scope: z.string().nullable(),
    proposal_deliverables: z.string().nullable(),
    proposal_timeline: z.string().nullable(),
  }),

  proposal_email_prefill: z.object({
    subject: z.string(),
    body: z.string(),
  }),

  optional_proposal_summary: z.string().nullable(),
  internal_notes: z.array(z.string()),
  run_warnings: z.array(z.string()),
  safety_redactions: z.array(z.string()),
});

export type ProposalWriterOutput = z.infer<typeof ProposalWriterOutputSchema>;
