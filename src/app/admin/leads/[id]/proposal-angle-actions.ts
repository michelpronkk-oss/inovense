"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { runProposalAngle } from "@/lib/agents/proposal-angle/run";
import type { ProposalAngleOutput } from "@/lib/agents/proposal-angle/schema";
import { revalidatePath } from "next/cache";

function revalidateLead(id: string) {
  revalidatePath(`/admin/leads/${id}`);
}

/* ─── Trigger ────────────────────────────────────────────────────────────── */

export async function triggerProposalAngle(
  leadId: string
): Promise<
  { ok: true; output: ProposalAngleOutput } | { ok: false; error: string }
> {
  const supabase = createSupabaseServerClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "id, company_name, lead_source, service_lane, project_type, budget_range, timeline, project_details, research_audit, research_audit_at, proposal_title, proposal_intro, proposal_scope, proposal_deliverables, proposal_timeline, proposal_notes"
    )
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { ok: false, error: "Lead not found." };
  }

  if (!lead.research_audit) {
    return { ok: false, error: "Run Lead Research first." };
  }

  const result = await runProposalAngle({
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
    research_audit_at: lead.research_audit_at ?? null,
    existing_proposal: {
      proposal_title: lead.proposal_title ?? null,
      proposal_intro: lead.proposal_intro ?? null,
      proposal_scope: lead.proposal_scope ?? null,
      proposal_deliverables: lead.proposal_deliverables ?? null,
      proposal_timeline: lead.proposal_timeline ?? null,
      proposal_notes: lead.proposal_notes ?? null,
    },
    mode: "standard",
  });

  if (!result.ok) return result;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anglePayload: any = result.output;
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      proposal_angle: anglePayload,
      proposal_angle_at: result.output.generated_at,
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("[proposal-angle] Failed to persist output:", updateError);
    // Return the result anyway — caller can display even if DB write failed
  }

  revalidateLead(leadId);
  return { ok: true, output: result.output };
}

/* ─── Apply prefill to proposal fields ──────────────────────────────────── */

export async function applyProposalAngleToProposalFields(
  leadId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, proposal_angle")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { ok: false, error: "Lead not found." };
  }

  if (!lead.proposal_angle) {
    return { ok: false, error: "Run Proposal Angle first." };
  }

  const angle = lead.proposal_angle as ProposalAngleOutput;
  const prefill = angle.proposal_prefill;

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      proposal_title: prefill.proposal_title,
      proposal_intro: prefill.proposal_intro,
      proposal_scope: prefill.proposal_scope,
      proposal_deliverables: prefill.proposal_deliverables,
      proposal_timeline: prefill.proposal_timeline,
      proposal_notes: prefill.proposal_notes,
      proposal_angle_applied_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("[proposal-angle] Failed to apply prefill:", updateError);
    return { ok: false, error: "Failed to apply to proposal fields." };
  }

  revalidateLead(leadId);
  return { ok: true };
}
