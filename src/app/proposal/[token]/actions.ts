"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  type LeadStatus,
  type ProposalDecision,
} from "@/lib/supabase-server";

const DECISION_TO_STATUS: Record<ProposalDecision, LeadStatus> = {
  accepted: "payment_requested",
  declined: "lost",
};

async function applyProposalDecision(token: string, decision: ProposalDecision) {
  if (!token) {
    return redirect("/");
  }

  const supabase = createSupabaseServerClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, proposal_decision")
    .eq("proposal_token", token)
    .single();

  if (leadError || !lead) {
    return redirect(`/proposal/${token}`);
  }

  if (lead.proposal_decision != null) {
    return redirect(`/proposal/${token}`);
  }

  const nextStatus = DECISION_TO_STATUS[decision];
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      proposal_decision: decision,
      proposal_decided_at: now,
      status: nextStatus,
    })
    .eq("id", lead.id)
    .is("proposal_decision", null);

  if (updateError) {
    console.error("[proposal] applyProposalDecision failed:", updateError);
    return redirect(`/proposal/${token}`);
  }

  revalidatePath(`/proposal/${token}`);
  revalidatePath(`/admin/leads/${lead.id}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");

  return redirect(`/proposal/${token}`);
}

export async function acceptProposal(token: string) {
  return applyProposalDecision(token, "accepted");
}

export async function declineProposal(token: string) {
  return applyProposalDecision(token, "declined");
}
