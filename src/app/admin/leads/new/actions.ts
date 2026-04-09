"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

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
        status: "new",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[admin] createManualLead failed:", error?.message);
      return { success: false, error: "Failed to create lead. Please try again." };
    }

    revalidatePath("/admin/leads");
    revalidatePath("/admin");

    return { success: true, id: data.id };
  } catch (err) {
    console.error("[admin] createManualLead error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
