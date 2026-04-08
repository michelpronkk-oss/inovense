"use server";

import { createSupabaseServerClient, type LeadStatus, type ProjectStatus } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "reviewing",
  "qualified",
  "proposal_sent",
  "payment_requested",
  "deposit_paid",
  "onboarding_sent",
  "onboarding_completed",
  "active",
  "won",
  "lost",
];

function revalidateLead(id: string) {
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

/* ─── Status ────────────────────────────────────────────────────────────── */

export async function updateLeadStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  if (!VALID_STATUSES.includes(status as LeadStatus)) {
    return { success: false, error: "Invalid status." };
  }
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    revalidateLead(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateLeadStatus failed:", err);
    return { success: false, error: "Failed to update status." };
  }
}

/* ─── Notes ─────────────────────────────────────────────────────────────── */

export async function updateLeadNotes(
  id: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({ notes: notes.trim() || null })
      .eq("id", id);
    if (error) throw error;
    revalidatePath(`/admin/leads/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateLeadNotes failed:", err);
    return { success: false, error: "Failed to save notes." };
  }
}

/* ─── Next step ─────────────────────────────────────────────────────────── */

export async function updateInternalNextStep(
  id: string,
  nextStep: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({ internal_next_step: nextStep.trim() || null })
      .eq("id", id);
    if (error) throw error;
    revalidatePath(`/admin/leads/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateInternalNextStep failed:", err);
    return { success: false, error: "Failed to save." };
  }
}

/* ─── Onboarding ────────────────────────────────────────────────────────── */

export async function sendOnboarding(
  id: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const token = crypto.randomUUID();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({
        onboarding_token: token,
        onboarding_status: "sent",
        onboarding_sent_at: new Date().toISOString(),
        status: "onboarding_sent",
      })
      .eq("id", id);
    if (error) throw error;
    revalidateLead(id);
    return { success: true, token };
  } catch (err) {
    console.error("[admin] sendOnboarding failed:", err);
    return { success: false, error: "Failed to generate onboarding link." };
  }
}

/* ─── Proposal ──────────────────────────────────────────────────────────── */

export async function updateProposalFields(
  id: string,
  proposalUrl: string,
  proposalNotes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({
        proposal_url: proposalUrl.trim() || null,
        proposal_notes: proposalNotes.trim() || null,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath(`/admin/leads/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateProposalFields failed:", err);
    return { success: false, error: "Failed to save." };
  }
}

/* ─── Payment ───────────────────────────────────────────────────────────── */

export async function updatePaymentFields(
  id: string,
  fields: {
    paymentLink: string;
    invoiceReference: string;
    depositAmount: string;
    projectStartDate: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const parsed = fields.depositAmount.trim()
    ? parseFloat(fields.depositAmount)
    : null;
  const amount =
    parsed !== null && !isNaN(parsed) && parsed >= 0 ? parsed : null;

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({
        payment_link: fields.paymentLink.trim() || null,
        invoice_reference: fields.invoiceReference.trim() || null,
        deposit_amount: amount,
        project_start_date: fields.projectStartDate || null,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath(`/admin/leads/${id}`);
    return { success: true };
  } catch (err) {
    console.error("[admin] updatePaymentFields failed:", err);
    return { success: false, error: "Failed to save." };
  }
}

export async function markDepositPaid(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({
        deposit_paid_at: new Date().toISOString(),
        status: "deposit_paid",
      })
      .eq("id", id);
    if (error) throw error;
    revalidateLead(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] markDepositPaid failed:", err);
    return { success: false, error: "Failed to mark deposit as paid." };
  }
}

/* ─── Project status ────────────────────────────────────────────────────── */

const VALID_PROJECT_STATUSES: ProjectStatus[] = [
  "not_started",
  "ready",
  "active",
  "paused",
  "completed",
];

export async function updateProjectStatus(
  id: string,
  projectStatus: string
): Promise<{ success: boolean; error?: string }> {
  if (!VALID_PROJECT_STATUSES.includes(projectStatus as ProjectStatus)) {
    return { success: false, error: "Invalid project status." };
  }
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({ project_status: projectStatus })
      .eq("id", id);
    if (error) throw error;
    revalidateLead(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateProjectStatus failed:", err);
    return { success: false, error: "Failed to update project status." };
  }
}

/* ─── Delete ────────────────────────────────────────────────────────────── */

export async function deleteLead(id: string): Promise<never> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    console.error("[admin] deleteLead failed:", error.message);
    // Can't return an error object from a redirect action cleanly;
    // throw so the client catches it via the useTransition error boundary.
    throw new Error("Failed to delete lead.");
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  redirect("/admin/leads");
}
