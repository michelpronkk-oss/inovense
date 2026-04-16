"use server";

import { createSupabaseServerClient, type LeadStatus, type ProjectStatus } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import {
  sendDepositPaidConfirmationEmail,
  sendFinalPaymentReceivedEmail,
} from "./email-actions";
import {
  parseCurrencyCodeInput,
  parseUsdFxRate,
  USD_CURRENCY_CODE,
} from "@/lib/currency";
import { parseCountryCodeInput } from "@/lib/market";
import { logActivityEventSafe } from "@/lib/activity-events";

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

function revalidateClientWorkspacePaths(tokens: {
  proposalToken: string | null;
  onboardingToken: string | null;
}) {
  revalidatePath("/client");
  if (tokens.proposalToken) {
    revalidatePath(`/client/${tokens.proposalToken}`);
  }
  if (tokens.onboardingToken) {
    revalidatePath(`/client/${tokens.onboardingToken}`);
  }
}

function parseCurrencyAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function normalizeMoneyValue(value: number | null | undefined): number | null {
  if (value == null) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

function normalizePaymentLinkInput(raw: string): { value: string | null; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        value: null,
        error: "Payment link must start with http:// or https://.",
      };
    }
    return { value: parsed.toString() };
  } catch {
    return {
      value: null,
      error: "Enter a valid payment URL.",
    };
  }
}

function isMissingFinalPaymentColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    code?: string | null;
    message?: string | null;
    details?: string | null;
  };
  const haystack = `${maybeError.code ?? ""} ${maybeError.message ?? ""} ${maybeError.details ?? ""}`
    .toLowerCase();

  return (
    haystack.includes("final_payment_paid_at") ||
    (haystack.includes("column") && haystack.includes("does not exist")) ||
    (maybeError.code ?? "").toLowerCase() === "pgrst204"
  );
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
    const { data: current, error: currentError } = await supabase
      .from("leads")
      .select("status,country_code")
      .eq("id", id)
      .single();
    if (currentError || !current) {
      throw currentError ?? new Error("Lead not found.");
    }

    const toStatus = status as LeadStatus;
    if (current.status === toStatus) {
      revalidateLead(id);
      return { success: true };
    }

    const { error } = await supabase
      .from("leads")
      .update({ status: toStatus })
      .eq("id", id);
    if (error) throw error;
    await logActivityEventSafe({
      entityType: "lead",
      entityId: id,
      eventType: "lead.status_changed",
      fromStatus: current.status,
      toStatus,
      market: parseCountryCodeInput(current.country_code),
    });
    if (toStatus === "won") {
      await logActivityEventSafe({
        entityType: "lead",
        entityId: id,
        eventType: "deal.won",
        fromStatus: current.status,
        toStatus,
        market: parseCountryCodeInput(current.country_code),
      });
    }

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
  _proposalUrl: string,
  proposalTitle: string,
  proposalIntro: string,
  proposalScope: string,
  proposalDeliverables: string,
  proposalTimeline: string,
  proposalNotes: string,
  proposalPrice: string,
  proposalDeposit: string
): Promise<{ success: boolean; error?: string }> {
  const price = parseCurrencyAmount(proposalPrice);
  const deposit = parseCurrencyAmount(proposalDeposit);

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({
        proposal_title: proposalTitle.trim() || null,
        proposal_intro: proposalIntro.trim() || null,
        proposal_scope: proposalScope.trim() || null,
        proposal_deliverables: proposalDeliverables.trim() || null,
        proposal_timeline: proposalTimeline.trim() || null,
        proposal_notes: proposalNotes.trim() || null,
        proposal_price: price,
        proposal_deposit: deposit,
      })
      .eq("id", id);
    if (error) throw error;
    revalidateLead(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateProposalFields failed:", err);
    return { success: false, error: "Failed to save." };
  }
}

export async function generateProposalToken(
  id: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const token = crypto.randomUUID();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("leads")
      .update({ proposal_token: token })
      .eq("id", id);
    if (error) throw error;

    // Verify the token was actually persisted before reporting success.
    const { data: verify } = await supabase
      .from("leads")
      .select("proposal_token")
      .eq("id", id)
      .maybeSingle();

    if (!verify || verify.proposal_token !== token) {
      console.error("[admin] generateProposalToken: write did not persist for id", id);
      return { success: false, error: "Failed to save proposal link." };
    }

    revalidatePath(`/admin/leads/${id}`);
    return { success: true, token };
  } catch (err) {
    console.error("[admin] generateProposalToken failed:", err);
    return { success: false, error: "Failed to generate proposal link." };
  }
}

export async function generateClientPortalToken(
  id: string,
  rotate = false
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: currentLead, error: readError } = await supabase
      .from("leads")
      .select("proposal_token")
      .eq("id", id)
      .maybeSingle();

    if (readError || !currentLead) {
      return { success: false, error: "Failed to resolve client portal token." };
    }

    if (currentLead.proposal_token && !rotate) {
      return { success: true, token: currentLead.proposal_token };
    }

    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("leads")
      .update({ proposal_token: token })
      .eq("id", id);
    if (error) throw error;

    revalidateLead(id);
    return { success: true, token };
  } catch (err) {
    console.error("[admin] generateClientPortalToken failed:", err);
    return { success: false, error: "Failed to generate client portal link." };
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
    localCurrencyCode: string;
    usdFxRateLocked: string;
    countryCode: string;
  }
): Promise<{ success: boolean; paymentLink?: string | null; error?: string }> {
  const amount = parseCurrencyAmount(fields.depositAmount);
  const paymentLinkResult = normalizePaymentLinkInput(fields.paymentLink);
  if (paymentLinkResult.error) {
    return {
      success: false,
      error: paymentLinkResult.error,
    };
  }
  const normalizedPaymentLink = paymentLinkResult.value;
  const localCurrencyCode = parseCurrencyCodeInput(fields.localCurrencyCode);
  if (!localCurrencyCode) {
    return {
      success: false,
      error: "Use a valid 3-letter local currency code.",
    };
  }

  const trimmedFx = fields.usdFxRateLocked.trim();
  const usdFxRateLocked = parseUsdFxRate(trimmedFx);
  if (trimmedFx && usdFxRateLocked == null) {
    return {
      success: false,
      error: "Use a valid positive USD FX rate.",
    };
  }

  const countryCode = parseCountryCodeInput(fields.countryCode);
  if (fields.countryCode.trim() && !countryCode) {
    return {
      success: false,
      error: "Use a valid 2-letter country code or leave it empty.",
    };
  }

  const usdFxRateLockedAt =
    usdFxRateLocked != null ? new Date().toISOString() : null;
  const countrySource = countryCode ? "manual" : "unknown";
  const normalizedUsdFxRate =
    localCurrencyCode === USD_CURRENCY_CODE ? 1 : usdFxRateLocked;

  try {
    const supabase = createSupabaseServerClient();
    const { data: updatedLead, error } = await supabase
      .from("leads")
      .update({
        payment_link: normalizedPaymentLink,
        invoice_reference: fields.invoiceReference.trim() || null,
        deposit_amount: amount,
        project_start_date: fields.projectStartDate || null,
        local_currency_code: localCurrencyCode,
        usd_fx_rate_locked: normalizedUsdFxRate,
        usd_fx_rate_locked_at:
          localCurrencyCode === USD_CURRENCY_CODE
            ? new Date().toISOString()
            : usdFxRateLockedAt,
        currency_source: "manual",
        country_code: countryCode,
        country_source: countrySource,
      })
      .eq("id", id)
      .select("payment_link, proposal_token, onboarding_token")
      .maybeSingle();
    if (error) throw error;
    if (!updatedLead) {
      return { success: false, error: "Failed to save." };
    }

    if ((updatedLead.payment_link ?? null) !== normalizedPaymentLink) {
      return { success: false, error: "Payment link was not persisted." };
    }

    revalidateLead(id);
    revalidateClientWorkspacePaths({
      proposalToken: updatedLead.proposal_token ?? null,
      onboardingToken: updatedLead.onboarding_token ?? null,
    });
    return { success: true, paymentLink: updatedLead.payment_link ?? null };
  } catch (err) {
    console.error("[admin] updatePaymentFields failed:", err);
    return { success: false, error: "Failed to save." };
  }
}

export async function markDepositPaid(
  id: string
): Promise<{
  success: boolean;
  alreadyPaid?: boolean;
  paidAt?: string;
  emailWarning?: string;
  error?: string;
}> {
  try {
    const supabase = createSupabaseServerClient();

    const { data: currentLead, error: currentLeadError } = await supabase
      .from("leads")
      .select("id, deposit_paid_at, deposit_amount, proposal_deposit")
      .eq("id", id)
      .maybeSingle();

    if (currentLeadError || !currentLead) {
      return { success: false, error: "Failed to mark deposit as paid." };
    }

    if (currentLead.deposit_paid_at) {
      revalidateLead(id);
      return {
        success: true,
        alreadyPaid: true,
        paidAt: currentLead.deposit_paid_at ?? undefined,
      };
    }

    const snapshotAmount = normalizeMoneyValue(
      currentLead.deposit_amount ?? currentLead.proposal_deposit
    );
    const paidAt = new Date().toISOString();
    const payload: {
      deposit_paid_at: string;
      status: LeadStatus;
      deposit_amount?: number;
    } = {
      deposit_paid_at: paidAt,
      status: "deposit_paid",
    };

    // Snapshot deposit amount on first paid transition so proposal edits later
    // cannot rewrite historical paid/remaining values.
    if (currentLead.deposit_amount == null && snapshotAmount != null) {
      payload.deposit_amount = snapshotAmount;
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", id)
      .is("deposit_paid_at", null)
      .select("id, deposit_paid_at")
      .maybeSingle();

    if (updateError) throw updateError;

    // No row updated means a concurrent request marked it first or lead is missing.
    if (!updatedLead) {
      const { data: existingLead, error: existingLeadError } = await supabase
        .from("leads")
        .select("id, deposit_paid_at")
        .eq("id", id)
        .maybeSingle();

      if (existingLeadError || !existingLead) {
        return { success: false, error: "Failed to mark deposit as paid." };
      }

      if (existingLead.deposit_paid_at) {
        revalidateLead(id);
        return {
          success: true,
          alreadyPaid: true,
          paidAt: existingLead.deposit_paid_at ?? undefined,
        };
      }

      return { success: false, error: "Failed to mark deposit as paid." };
    }

    const emailResult = await sendDepositPaidConfirmationEmail(id);
    revalidateLead(id);

    if (!emailResult.success) {
      return {
        success: true,
        paidAt: updatedLead.deposit_paid_at ?? undefined,
        emailWarning:
          emailResult.error ??
          "Deposit marked as paid, but confirmation email could not be sent.",
      };
    }

    if (emailResult.warning) {
      return {
        success: true,
        paidAt: updatedLead.deposit_paid_at ?? undefined,
        emailWarning: emailResult.warning,
      };
    }

    return { success: true, paidAt: updatedLead.deposit_paid_at ?? undefined };
  } catch (err) {
    console.error("[admin] markDepositPaid failed:", err);
    return { success: false, error: "Failed to mark deposit as paid." };
  }
}

export async function markFinalPaymentPaid(
  id: string
): Promise<{
  success: boolean;
  alreadyPaid?: boolean;
  paidAt?: string;
  emailWarning?: string;
  error?: string;
}> {
  try {
    const supabase = createSupabaseServerClient();

    const { data: currentLead, error: currentLeadError } = await supabase
      .from("leads")
      .select("id, deposit_paid_at, final_payment_paid_at")
      .eq("id", id)
      .maybeSingle();

    if (currentLeadError || !currentLead) {
      return { success: false, error: "Failed to mark final payment." };
    }

    if (currentLead.final_payment_paid_at) {
      revalidateLead(id);
      return {
        success: true,
        alreadyPaid: true,
        paidAt: currentLead.final_payment_paid_at ?? undefined,
      };
    }

    if (!currentLead.deposit_paid_at) {
      return {
        success: false,
        error: "Mark deposit as paid before confirming final payment.",
      };
    }

    const paidAt = new Date().toISOString();
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({ final_payment_paid_at: paidAt })
      .eq("id", id)
      .is("final_payment_paid_at", null)
      .select("id, final_payment_paid_at")
      .maybeSingle();

    if (updateError) {
      if (isMissingFinalPaymentColumnError(updateError)) {
        return {
          success: false,
          error:
            "Final payment field is missing in the database. Run the latest Supabase migrations and try again.",
        };
      }
      throw updateError;
    }

    if (!updatedLead) {
      const { data: existingLead, error: existingLeadError } = await supabase
        .from("leads")
        .select("id, final_payment_paid_at")
        .eq("id", id)
        .maybeSingle();

      if (existingLeadError || !existingLead) {
        return { success: false, error: "Failed to mark final payment." };
      }

      if (existingLead.final_payment_paid_at) {
        revalidateLead(id);
        return {
          success: true,
          alreadyPaid: true,
          paidAt: existingLead.final_payment_paid_at ?? undefined,
        };
      }

      return { success: false, error: "Failed to mark final payment." };
    }

    const emailResult = await sendFinalPaymentReceivedEmail(id);
    revalidateLead(id);

    if (!emailResult.success) {
      return {
        success: true,
        paidAt: updatedLead.final_payment_paid_at ?? undefined,
        emailWarning:
          emailResult.error ??
          "Final payment marked as received, but confirmation email could not be sent.",
      };
    }

    if (emailResult.warning) {
      return {
        success: true,
        paidAt: updatedLead.final_payment_paid_at ?? undefined,
        emailWarning: emailResult.warning,
      };
    }

    return { success: true, paidAt: updatedLead.final_payment_paid_at ?? undefined };
  } catch (err) {
    console.error("[admin] markFinalPaymentPaid failed:", err);
    return { success: false, error: "Failed to mark final payment." };
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
      .update({ project_status: projectStatus as ProjectStatus })
      .eq("id", id);
    if (error) throw error;
    revalidateLead(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateProjectStatus failed:", err);
    return { success: false, error: "Failed to update project status." };
  }
}

/* ─── Reminder snooze ───────────────────────────────────────────────────── */

export async function snoozeReminder(formData: FormData): Promise<void> {
  const leadId = formData.get("lead_id");
  const kind = formData.get("kind");
  const days = parseInt(String(formData.get("days")), 10);

  if (
    typeof leadId !== "string" ||
    typeof kind !== "string" ||
    !leadId ||
    !kind ||
    !Number.isFinite(days) ||
    days < 1 ||
    days > 30
  ) {
    return;
  }

  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("leads")
    .select("reminder_snooze")
    .eq("id", leadId)
    .single();

  const current = (data?.reminder_snooze as Record<string, string> | null) ?? {};
  const until = addDays(new Date(), days).toISOString();

  await supabase
    .from("leads")
    .update({ reminder_snooze: { ...current, [kind]: until } })
    .eq("id", leadId);

  revalidateLead(leadId);
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
