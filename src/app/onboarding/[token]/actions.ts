"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getClientLocaleForLeadSource, type ClientLocale } from "@/lib/client-locale";

type OnboardingActionCopy = {
  invalidLink: string;
  expiredLink: string;
  alreadySubmitted: string;
  submissionFailed: string;
};

const ONBOARDING_ACTION_COPY: Record<ClientLocale, OnboardingActionCopy> = {
  en: {
    invalidLink: "Invalid link.",
    expiredLink: "This link is invalid or has expired.",
    alreadySubmitted: "This onboarding form has already been submitted.",
    submissionFailed: "Submission failed. Please try again or contact us at hello@inovense.com.",
  },
  nl: {
    invalidLink: "Ongeldige link.",
    expiredLink: "Deze link is ongeldig of verlopen.",
    alreadySubmitted: "Deze onboarding is al verstuurd.",
    submissionFailed: "Versturen mislukt. Probeer het opnieuw of neem contact op via hello@inovense.com.",
  },
};

export async function submitOnboarding(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  if (!token) {
    return { success: false, error: ONBOARDING_ACTION_COPY.en.invalidLink };
  }

  let locale: ClientLocale = "en";

  try {
    const supabase = createSupabaseServerClient();

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("id, onboarding_status, lead_source")
      .eq("onboarding_token", token)
      .single();

    locale = getClientLocaleForLeadSource(lead?.lead_source);
    const copy = ONBOARDING_ACTION_COPY[locale];

    if (fetchError || !lead) {
      return { success: false, error: copy.expiredLink };
    }

    if (lead.onboarding_status === "completed") {
      return {
        success: false,
        error: copy.alreadySubmitted,
      };
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        onboarding_data: data,
        onboarding_status: "completed",
        onboarding_completed_at: new Date().toISOString(),
        status: "onboarding_completed",
      })
      .eq("id", lead.id);

    if (updateError) throw updateError;

    revalidatePath(`/admin/leads/${lead.id}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin");

    console.log("[onboarding] Onboarding completed for lead:", lead.id);
    return { success: true };
  } catch (err) {
    console.error("[onboarding] submitOnboarding failed:", err);
    return {
      success: false,
      error: ONBOARDING_ACTION_COPY[locale].submissionFailed,
    };
  }
}
