"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getLeadMarketSeedFromLeadSource } from "@/lib/market";
import { logActivityEventSafe } from "@/lib/activity-events";

export async function createManualLead(fields: {
  full_name: string;
  company_name: string;
  work_email: string;
  website_or_social: string;
  service_lane: string;
  project_type: string;
  budget_range: string;
  timeline: string;
  project_details: string;
  lead_source: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!fields.full_name.trim()) {
    return { success: false, error: "Full name is required." };
  }
  if (!fields.company_name.trim()) {
    return { success: false, error: "Company is required." };
  }
  if (!fields.work_email.trim()) {
    return { success: false, error: "Email is required." };
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.work_email.trim());
  if (!emailOk) {
    return { success: false, error: "Enter a valid email address." };
  }
  if (!fields.service_lane) {
    return { success: false, error: "Service lane is required." };
  }
  if (!fields.lead_source) {
    return { success: false, error: "Lead source is required." };
  }

  try {
    const supabase = createSupabaseServerClient();
    const marketSeed = getLeadMarketSeedFromLeadSource(fields.lead_source);

    const { data, error } = await supabase
      .from("leads")
      .insert({
        full_name: fields.full_name.trim(),
        company_name: fields.company_name.trim(),
        work_email: fields.work_email.trim().toLowerCase(),
        website_or_social: fields.website_or_social.trim() || null,
        service_lane: fields.service_lane,
        project_type: fields.project_type.trim() || "",
        budget_range: fields.budget_range.trim() || "",
        timeline: fields.timeline.trim() || "",
        project_details: fields.project_details.trim() || "",
        lead_source: fields.lead_source,
        local_currency_code: marketSeed.local_currency_code,
        currency_source: marketSeed.currency_source,
        country_code: marketSeed.country_code,
        country_source: marketSeed.country_source,
        status: "new",
        project_status: "not_started",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[admin] createManualLead failed:", error?.message);
      return {
        success: false,
        error: error?.message
          ? `DB error: ${error.message}`
          : "Failed to create lead. Please try again.",
      };
    }

    revalidatePath("/admin/leads");
    revalidatePath("/admin");

    await logActivityEventSafe({
      entityType: "lead",
      entityId: data.id,
      eventType: "lead.created",
      toStatus: "new",
      market: marketSeed.country_code,
      metadata: {
        source: fields.lead_source,
        creation_mode: "manual",
      },
    });

    return { success: true, id: data.id };
  } catch (err) {
    console.error("[admin] createManualLead error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
