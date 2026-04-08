"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function submitOnboarding(
  token: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  if (!token) {
    return { success: false, error: "Invalid link." };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("id, onboarding_status")
      .eq("onboarding_token", token)
      .single();

    if (fetchError || !lead) {
      return { success: false, error: "This link is invalid or has expired." };
    }

    if (lead.onboarding_status === "completed") {
      return {
        success: false,
        error: "This onboarding form has already been submitted.",
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
      error:
        "Submission failed. Please try again or contact us at hello@inovense.com.",
    };
  }
}
