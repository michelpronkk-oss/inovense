"use server";

import { Resend } from "resend";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  EMAIL_TEMPLATES,
  buildEmailHtml,
  type EmailTemplateType,
} from "@/lib/email-templates";

export async function sendLeadEmail(
  leadId: string,
  emailType: EmailTemplateType,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Email service is not configured." };
  }

  const template = EMAIL_TEMPLATES[emailType];
  if (!template) {
    return { success: false, error: "Invalid email template." };
  }

  if (!subject.trim() || !body.trim()) {
    return { success: false, error: "Subject and body are required." };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select(
        "id, full_name, company_name, work_email, status, onboarding_token, onboarding_status"
      )
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      return { success: false, error: "Lead not found." };
    }

    const firstName = lead.full_name.split(" ")[0];

    // For onboarding_sent: ensure a token exists, generate if missing
    let onboardingToken = lead.onboarding_token;
    if (emailType === "onboarding_sent") {
      const onboardingUpdate: Record<string, unknown> = {
        onboarding_status: "sent",
        onboarding_sent_at: new Date().toISOString(),
      };
      if (!onboardingToken) {
        onboardingToken = crypto.randomUUID();
        onboardingUpdate.onboarding_token = onboardingToken;
      }
      await supabase
        .from("leads")
        .update(onboardingUpdate)
        .eq("id", leadId);
    }

    // Build CTA for onboarding_sent
    let cta: { text: string; href: string } | undefined;
    if (emailType === "onboarding_sent" && onboardingToken) {
      const headersList = await headers();
      const host = headersList.get("host") ?? "inovense.com";
      const proto = headersList.get("x-forwarded-proto") ?? "https";
      cta = {
        text: "Complete onboarding brief",
        href: `${proto}://${host}/onboarding/${onboardingToken}`,
      };
    }

    // Build HTML and plain text
    const html = buildEmailHtml({
      eyebrow: template.eyebrow,
      heading: template.heading(firstName),
      body,
      cta,
    });

    const plainText = [
      `${template.eyebrow.toUpperCase()}`,
      ``,
      `${template.heading(firstName)}`,
      ``,
      body,
      cta ? `\n${cta.text}:\n${cta.href}` : "",
      ``,
      `Inovense`,
      `hello@inovense.com`,
    ]
      .join("\n")
      .trim();

    // Send via Resend
    const resend = new Resend(apiKey);
    const from =
      process.env.RESEND_FROM_EMAIL ?? "Inovense <onboarding@resend.dev>";
    const replyTo =
      process.env.INTAKE_TO_EMAIL ?? "hello@inovense.com";

    const { error: sendError } = await resend.emails.send({
      from,
      to: lead.work_email,
      replyTo,
      subject,
      html,
      text: plainText,
    });

    if (sendError) {
      console.error("[crm-email] Resend error:", sendError);
      return {
        success: false,
        error: "Email delivery failed. Please try again.",
      };
    }

    // Log the send
    const { error: logError } = await supabase
      .from("lead_email_log")
      .insert({
        lead_id: leadId,
        email_type: emailType,
        subject,
        sent_to: lead.work_email,
      });

    if (logError) {
      // Non-blocking - log but don't fail the action
      console.error("[crm-email] Failed to write email log:", logError.message);
    }

    // Update lead fields tied to this email type
    const leadUpdates: Record<string, unknown> = {};
    if (template.statusOnSend) {
      leadUpdates.status = template.statusOnSend;
    }
    if (emailType === "proposal_sent") {
      leadUpdates.proposal_sent_at = new Date().toISOString();
    }
    if (Object.keys(leadUpdates).length > 0) {
      await supabase.from("leads").update(leadUpdates).eq("id", leadId);
    }

    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin");

    console.log(
      `[crm-email] Sent ${emailType} to ${lead.work_email} for lead ${leadId}`
    );

    return { success: true };
  } catch (err) {
    console.error("[crm-email] sendLeadEmail failed:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
