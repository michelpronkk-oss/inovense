"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { runLeadResearch } from "@/lib/agents/lead-research/run";
import type { LeadResearchOutput } from "@/lib/agents/lead-research/schema";
import { revalidatePath } from "next/cache";

export async function triggerLeadResearch(
  leadId: string
): Promise<{ ok: true; output: LeadResearchOutput } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "id, company_name, website_or_social, lead_source, service_lane, project_type, budget_range, timeline, project_details"
    )
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    return { ok: false, error: "Lead not found." };
  }

  const result = await runLeadResearch({
    lead_id: lead.id,
    company_name: lead.company_name,
    website_url: lead.website_or_social ?? null,
    lead_source: lead.lead_source ?? null,
    service_lane: lead.service_lane,
    project_type: lead.project_type ?? null,
    budget_range: lead.budget_range ?? null,
    timeline: lead.timeline ?? null,
    project_details: lead.project_details ?? null,
    mode: "standard",
  });

  if (!result.ok) {
    return result;
  }

  // Persist to lead record — cast through any so Supabase's strict Row type
  // accepts the jsonb payload without losing our LeadResearchOutput type elsewhere.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditPayload: any = result.output;
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      research_audit: auditPayload,
      research_audit_at: result.output.generated_at,
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("[research-actions] Failed to persist audit:", updateError);
    // Return the result anyway so the UI can display it even if persist failed
    return { ok: true, output: result.output };
  }

  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, output: result.output };
}
