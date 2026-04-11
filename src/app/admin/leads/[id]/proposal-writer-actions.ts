"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { runProposalWriter } from "@/lib/agents/proposal-writer/run";
import type { ProposalWriterOutput } from "@/lib/agents/proposal-writer/schema";
import { getEmailTemplatesForLeadSource } from "@/lib/email-templates";
import { revalidatePath } from "next/cache";

function revalidateLead(id: string) {
  revalidatePath(`/admin/leads/${id}`);
}

/* ─── Content safety guard ───────────────────────────────────────────────── */

// These patterns must never appear in client-facing proposal text.
// If matched, the apply is rejected so internal strategy is not leaked.
const LEAKAGE_PATTERNS: RegExp[] = [
  /\binternal\s+note\b/i,
  /\brun[_\s]warning\b/i,
  /\bcommercial\s+risk\b/i,
  /\bconversion\s+friction\b/i,
  /\blikely\s+objection\b/i,
  /\bsafety\s+redaction\b/i,
  /\bagent\s+[12]\b/i,
  /\bresearch\s+audit\b/i,
  /\bproposal\s+angle\b/i,
];

function checkForLeakage(fields: Record<string, string | null>): string[] {
  const matches: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    for (const pattern of LEAKAGE_PATTERNS) {
      if (pattern.test(value)) {
        matches.push(`${key}: matched pattern "${pattern.source}"`);
        break;
      }
    }
  }
  return matches;
}

/* ─── Trigger ────────────────────────────────────────────────────────────── */

export async function triggerProposalWriter(leadId: string): Promise<
  | { ok: true; output: ProposalWriterOutput }
  | { ok: false; error: string }
> {
  const supabase = createSupabaseServerClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "id, company_name, lead_source, service_lane, project_type, budget_range, timeline, project_details, research_audit, research_audit_at, proposal_angle, proposal_angle_at, proposal_title, proposal_intro, proposal_scope, proposal_deliverables, proposal_timeline, proposal_notes, proposal_price, proposal_deposit"
    )
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { ok: false, error: "Lead not found." };
  }

  if (!lead.research_audit) {
    return { ok: false, error: "Run Lead Research first." };
  }
  if (!lead.proposal_angle) {
    return { ok: false, error: "Run Proposal Angle first." };
  }

  const templates = getEmailTemplatesForLeadSource(lead.lead_source);
  const firstName = ""; // not needed for defaults
  const proposalSentTemplate = templates.proposal_sent;

  const result = await runProposalWriter({
    lead_id: lead.id,
    company_name: lead.company_name,
    lead_source: lead.lead_source ?? null,
    service_lane: lead.service_lane,
    project_type: lead.project_type ?? null,
    budget_range: lead.budget_range ?? null,
    timeline: lead.timeline ?? null,
    project_details: lead.project_details ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    research_audit: lead.research_audit as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proposal_angle: lead.proposal_angle as any,
    proposal_angle_at: lead.proposal_angle_at ?? null,
    existing_proposal: {
      proposal_title: lead.proposal_title ?? null,
      proposal_intro: lead.proposal_intro ?? null,
      proposal_scope: lead.proposal_scope ?? null,
      proposal_deliverables: lead.proposal_deliverables ?? null,
      proposal_timeline: lead.proposal_timeline ?? null,
      proposal_notes: lead.proposal_notes ?? null,
      proposal_price:
        lead.proposal_price != null ? Number(lead.proposal_price) : null,
      proposal_deposit:
        lead.proposal_deposit != null ? Number(lead.proposal_deposit) : null,
    },
    email_template_defaults: {
      proposal_sent_subject: proposalSentTemplate.defaultSubject(
        firstName,
        lead.company_name
      ),
      proposal_sent_body: proposalSentTemplate.defaultBody(
        firstName,
        lead.company_name
      ),
    },
    mode: "standard",
  });

  if (!result.ok) return result;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writerPayload: any = result.output;
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      proposal_writer: writerPayload,
      proposal_writer_at: result.output.generated_at,
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("[proposal-writer] Failed to persist output:", updateError);
  }

  revalidateLead(leadId);
  return { ok: true, output: result.output };
}

/* ─── Apply prefill to proposal fields ──────────────────────────────────── */

export async function applyProposalWriterToProposalFields(
  leadId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, proposal_writer")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { ok: false, error: "Lead not found." };
  }
  if (!lead.proposal_writer) {
    return { ok: false, error: "Run Proposal Writer first." };
  }

  const writer = lead.proposal_writer as ProposalWriterOutput;
  const prefill = writer.proposal_prefill;

  // Server-side content safety check before writing client-facing fields
  const leakageMatches = checkForLeakage({
    proposal_title: prefill.proposal_title,
    proposal_intro: prefill.proposal_intro,
    proposal_scope: prefill.proposal_scope,
    proposal_deliverables: prefill.proposal_deliverables,
    proposal_timeline: prefill.proposal_timeline,
  });

  if (leakageMatches.length > 0) {
    console.error(
      "[proposal-writer] Content safety check failed:",
      leakageMatches
    );
    return {
      ok: false,
      error:
        "Content safety check failed. Internal language was detected in client-facing fields. Re-run Proposal Writer to get a clean output.",
    };
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      proposal_title: prefill.proposal_title,
      proposal_intro: prefill.proposal_intro,
      proposal_scope: prefill.proposal_scope,
      proposal_deliverables: prefill.proposal_deliverables,
      proposal_timeline: prefill.proposal_timeline,
      proposal_writer_applied_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("[proposal-writer] Failed to apply prefill:", updateError);
    return { ok: false, error: "Failed to apply to proposal fields." };
  }

  revalidateLead(leadId);
  return { ok: true };
}
