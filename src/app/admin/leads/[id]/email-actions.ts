"use server";

import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  applyPaymentAmountToBody,
  buildEmailHtml,
  getDepositPaidConfirmationTemplateForLeadSource,
  getFinalPaymentReceivedTemplateForLeadSource,
  getEmailTemplateLocaleForLeadSource,
  getEmailTemplatesForLeadSource,
  type EmailTemplateType,
} from "@/lib/email-templates";

const DEPOSIT_PAID_CONFIRMATION_EMAIL_TYPE = "deposit_paid_confirmation";
const FINAL_PAYMENT_RECEIVED_EMAIL_TYPE = "final_payment_received_confirmation";

export async function sendDepositPaidConfirmationEmail(
  leadId: string
): Promise<{
  success: boolean;
  alreadySent?: boolean;
  warning?: string;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Email service is not configured." };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("id, full_name, company_name, work_email, lead_source")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      return { success: false, error: "Lead not found." };
    }

    const { data: existingLog, error: existingLogError } = await supabase
      .from("lead_email_log")
      .select("id")
      .eq("lead_id", leadId)
      .eq("email_type", DEPOSIT_PAID_CONFIRMATION_EMAIL_TYPE)
      .limit(1);

    if (existingLogError) {
      console.error(
        "[crm-email] Failed to verify deposit confirmation history:",
        existingLogError.message
      );
    }

    if ((existingLog ?? []).length > 0) {
      return { success: true, alreadySent: true };
    }

    const firstName = lead.full_name.split(" ")[0];
    const locale = getEmailTemplateLocaleForLeadSource(lead.lead_source);
    const template = getDepositPaidConfirmationTemplateForLeadSource(
      lead.lead_source
    );
    const subject = template.subject(lead.company_name);
    const body = template.body(lead.company_name);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://inovense.com";

    const html = buildEmailHtml({
      eyebrow: template.eyebrow,
      heading: template.heading(firstName),
      body,
      baseUrl,
      lang: locale,
    });

    const plainText = [
      template.eyebrow.toUpperCase(),
      "",
      template.heading(firstName),
      "",
      body,
      "",
      "Inovense",
      "hello@inovense.com",
    ]
      .join("\n")
      .trim();

    const resend = new Resend(apiKey);
    const from =
      process.env.RESEND_FROM_EMAIL ?? "Inovense <onboarding@resend.dev>";
    const replyTo = process.env.INTAKE_TO_EMAIL ?? "hello@inovense.com";

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

    const { error: logError } = await supabase.from("lead_email_log").insert({
      lead_id: leadId,
      email_type: DEPOSIT_PAID_CONFIRMATION_EMAIL_TYPE,
      subject,
      sent_to: lead.work_email,
    });

    if (logError) {
      console.error("[crm-email] Failed to write email log:", logError.message);
      return {
        success: true,
        warning: "Email sent, but logging failed.",
      };
    }

    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin");

    console.log(
      `[crm-email] Sent ${DEPOSIT_PAID_CONFIRMATION_EMAIL_TYPE} to ${lead.work_email} for lead ${leadId}`
    );

    return { success: true };
  } catch (err) {
    console.error("[crm-email] sendDepositPaidConfirmationEmail failed:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function sendFinalPaymentReceivedEmail(
  leadId: string
): Promise<{
  success: boolean;
  alreadySent?: boolean;
  warning?: string;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Email service is not configured." };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("id, full_name, company_name, work_email, lead_source")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      return { success: false, error: "Lead not found." };
    }

    const { data: existingLog, error: existingLogError } = await supabase
      .from("lead_email_log")
      .select("id")
      .eq("lead_id", leadId)
      .eq("email_type", FINAL_PAYMENT_RECEIVED_EMAIL_TYPE)
      .limit(1);

    if (existingLogError) {
      console.error(
        "[crm-email] Failed to verify final payment confirmation history:",
        existingLogError.message
      );
    }

    if ((existingLog ?? []).length > 0) {
      return { success: true, alreadySent: true };
    }

    const firstName = lead.full_name.split(" ")[0];
    const locale = getEmailTemplateLocaleForLeadSource(lead.lead_source);
    const template = getFinalPaymentReceivedTemplateForLeadSource(
      lead.lead_source
    );
    const subject = template.subject(lead.company_name);
    const body = template.body(lead.company_name);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://inovense.com";
    const html = buildEmailHtml({
      eyebrow: template.eyebrow,
      heading: template.heading(firstName),
      body,
      baseUrl,
      lang: locale,
    });

    const plainText = [
      template.eyebrow.toUpperCase(),
      "",
      template.heading(firstName),
      "",
      body,
      "",
      "Inovense",
      "hello@inovense.com",
    ]
      .join("\n")
      .trim();

    const resend = new Resend(apiKey);
    const from =
      process.env.RESEND_FROM_EMAIL ?? "Inovense <onboarding@resend.dev>";
    const replyTo = process.env.INTAKE_TO_EMAIL ?? "hello@inovense.com";

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

    const { error: logError } = await supabase.from("lead_email_log").insert({
      lead_id: leadId,
      email_type: FINAL_PAYMENT_RECEIVED_EMAIL_TYPE,
      subject,
      sent_to: lead.work_email,
    });

    if (logError) {
      console.error("[crm-email] Failed to write email log:", logError.message);
      return {
        success: true,
        warning: "Email sent, but logging failed.",
      };
    }

    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin");

    console.log(
      `[crm-email] Sent ${FINAL_PAYMENT_RECEIVED_EMAIL_TYPE} to ${lead.work_email} for lead ${leadId}`
    );

    return { success: true };
  } catch (err) {
    console.error("[crm-email] sendFinalPaymentReceivedEmail failed:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

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

  if (!subject.trim() || !body.trim()) {
    return { success: false, error: "Subject and body are required." };
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select(
        "id, full_name, company_name, work_email, status, onboarding_token, onboarding_status, proposal_token, proposal_deposit, deposit_amount, payment_link, lead_source, local_currency_code"
      )
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      return { success: false, error: "Lead not found." };
    }

    const firstName = lead.full_name.split(" ")[0];
    const locale = getEmailTemplateLocaleForLeadSource(lead.lead_source);
    const template = getEmailTemplatesForLeadSource(lead.lead_source)[emailType];
    if (!template) {
      return { success: false, error: "Invalid email template." };
    }

    const effectiveDepositAmount = lead.deposit_amount ?? lead.proposal_deposit;
    const normalizedDepositAmount =
      effectiveDepositAmount != null && Number.isFinite(Number(effectiveDepositAmount))
        ? Number(effectiveDepositAmount)
        : null;

    if (emailType === "payment_request" && normalizedDepositAmount == null) {
      return {
        success: false,
        error:
          "Set a proposal deposit or payment override before sending a payment request.",
      };
    }

    if (emailType === "payment_request" && !lead.payment_link) {
      return {
        success: false,
        error: "Add a payment link to this lead before sending a payment request.",
      };
    }

    const resolvedBody =
      emailType === "payment_request" && normalizedDepositAmount != null
        ? applyPaymentAmountToBody(
            body,
            normalizedDepositAmount,
            locale,
            lead.local_currency_code,
            lead.lead_source
          )
        : body;

    // For onboarding_sent: ensure a token exists, generate if missing
    let onboardingToken = lead.onboarding_token;
    if (emailType === "onboarding_sent") {
      if (!onboardingToken) {
        onboardingToken = crypto.randomUUID();
      }
      await supabase
        .from("leads")
        .update({
          onboarding_status: "sent",
          onboarding_sent_at: new Date().toISOString(),
          onboarding_token: onboardingToken,
        })
        .eq("id", leadId);
    }

    // For proposal_sent: ensure a token exists, generate if missing
    let proposalToken = lead.proposal_token;
    if (emailType === "proposal_sent") {
      if (!proposalToken) {
        proposalToken = crypto.randomUUID();
      }
      await supabase
        .from("leads")
        .update({ proposal_token: proposalToken })
        .eq("id", leadId);
    }

    // Always use the canonical public URL — never derive from request headers,
    // which would produce localhost or Vercel preview URLs in client emails.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://inovense.com";

    // Build CTA per template type
    let cta: { text: string; href: string } | undefined;
    if (emailType === "onboarding_sent" && onboardingToken) {
      cta = {
        text: template.ctaText ?? "Complete onboarding brief",
        href: `${baseUrl}/onboarding/${onboardingToken}`,
      };
    } else if (emailType === "proposal_sent" && proposalToken) {
      cta = {
        text: template.ctaText ?? "View proposal",
        href: `${baseUrl}/proposal/${proposalToken}`,
      };
    } else if (emailType === "payment_request" && lead.payment_link) {
      cta = {
        text: template.ctaText ?? "Pay deposit",
        href: lead.payment_link,
      };
    }

    // Build HTML and plain text
    const html = buildEmailHtml({
      eyebrow: template.eyebrow,
      heading: template.heading(firstName),
      body: resolvedBody,
      cta,
      baseUrl,
      lang: locale,
    });

    const plainText = [
      `${template.eyebrow.toUpperCase()}`,
      ``,
      `${template.heading(firstName)}`,
      ``,
      resolvedBody,
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
    const statusUpdate = template.statusOnSend ? { status: template.statusOnSend } : null;
    const proposalUpdate =
      emailType === "proposal_sent"
        ? { proposal_sent_at: new Date().toISOString(), proposal_token: proposalToken, proposal_status: "sent" }
        : null;

    if (statusUpdate || proposalUpdate) {
      await supabase
        .from("leads")
        .update({ ...statusUpdate, ...proposalUpdate })
        .eq("id", leadId);
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
