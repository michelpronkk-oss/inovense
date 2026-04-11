"use server";

import { Resend } from "resend";
import { intakeSchema, type IntakeFormData } from "./schema";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getLeadMarketSeedFromLeadSource } from "@/lib/market";

/* ─── Email formatters ──────────────────────────────────────────────────── */

function formatConfirmationText(data: IntakeFormData): string {
  return `
Hi ${data.fullName},

We've received your brief for ${data.company}. Someone on the team will review it personally and get back to you within 24 hours.

If there's a fit, the next step is usually a short proposal or a scoping call. If anything changes before then, just reply here.

Inovense
hello@inovense.com
  `.trim();
}

function formatConfirmationHtml(data: IntakeFormData): string {
  const firstName = data.fullName.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Brief received</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#09090b" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">

          <!-- Top accent bar -->
          <tr>
            <td bgcolor="#49A0A4" style="height:2px;background-color:#49A0A4;border-radius:2px 2px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Card body -->
          <tr>
            <td bgcolor="#18181b" style="background-color:#18181b;border:1px solid #27272a;border-top:none;border-radius:0 0 12px 12px;padding:36px 36px 32px 36px;">

              <!-- Logo -->
              <div style="margin:0 0 32px 0;">
                <img src="https://inovense.com/logo.png" alt="Inovense" width="110" height="26" border="0" style="display:block;width:110px;height:26px;border:0;outline:none;text-decoration:none;" />
              </div>

              <!-- Eyebrow -->
              <p style="margin:0 0 10px 0;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">Brief received</p>

              <!-- Heading -->
              <h1 style="margin:0 0 20px 0;font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:#fafafa;">We'll be in touch, ${firstName}.</h1>

              <!-- Body copy -->
              <p style="margin:0 0 30px 0;font-size:14px;line-height:1.75;color:#a1a1aa;">Your brief for <span style="color:#fafafa;font-weight:500;">${data.company}</span> is with us. We review every request ourselves and will get back to you within 24 hours. If there's a fit, the next step is usually a short proposal or a scoping call.</p>

              <!-- Hairline divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td bgcolor="#27272a" style="height:1px;background-color:#27272a;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Section label -->
              <p style="margin:0 0 14px 0;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#52525b;">What happens next</p>

              <!-- Bullet list -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:10px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="14" style="padding-top:6px;vertical-align:top;">
                          <div style="width:4px;height:4px;border-radius:50%;background-color:#49A0A4;margin-top:1px;"></div>
                        </td>
                        <td style="font-size:13px;line-height:1.65;color:#71717a;">We read every brief ourselves before responding.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:10px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="14" style="padding-top:6px;vertical-align:top;">
                          <div style="width:4px;height:4px;border-radius:50%;background-color:#49A0A4;margin-top:1px;"></div>
                        </td>
                        <td style="font-size:13px;line-height:1.65;color:#71717a;">Expect a reply to this address within 24 hours.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="14" style="padding-top:6px;vertical-align:top;">
                          <div style="width:4px;height:4px;border-radius:50%;background-color:#49A0A4;margin-top:1px;"></div>
                        </td>
                        <td style="font-size:13px;line-height:1.65;color:#71717a;">If anything changes before then, just reply here.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer row -->
          <tr>
            <td style="padding:20px 4px 0 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:#3f3f46;">Inovense &nbsp;&middot;&nbsp; <a href="mailto:hello@inovense.com" style="color:#52525b;text-decoration:none;">hello@inovense.com</a></p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:11px;color:#3f3f46;">US &amp; UK</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>`;
}

function formatEmailText(data: IntakeFormData): string {
  return `
New Inovense Intake Submission
==============================

FROM
Name:     ${data.fullName}
Company:  ${data.company}
Email:    ${data.email}
Website:  ${data.website || "Not provided"}

PROJECT
Service lane:   ${data.serviceLane}
Project type:   ${data.projectType}
Budget:         ${data.budget}
Timeline:       ${data.timeline}

PROJECT BRIEF
${data.details}

==============================
Submitted via inovense.com/intake
  `.trim();
}

/* ─── Action ────────────────────────────────────────────────────────────── */

export async function submitIntake(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = intakeSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please check your entries and try again.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[intake] RESEND_API_KEY is not set");
    return {
      success: false,
      error: "Submission failed. Please email us at hello@inovense.com.",
    };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Inovense Intake <onboarding@resend.dev>";
  const to = process.env.INTAKE_TO_EMAIL ?? "hello@inovense.com";

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: parsed.data.email,
      subject: `New intake: ${parsed.data.company} - ${parsed.data.serviceLane}`,
      text: formatEmailText(parsed.data),
    });

    if (error) {
      console.error("[intake] Resend error:", error);
      return {
        success: false,
        error: "Email delivery failed. Please try again or contact us directly.",
      };
    }

    // Write lead to Supabase — awaited so the insert completes before the
    // serverless function returns. Failures are logged but never block the user
    // since the email notification already succeeded.
    try {
      const leadSource = "website";
      const marketSeed = getLeadMarketSeedFromLeadSource(leadSource);
      const supabase = createSupabaseServerClient();
      const { error: sbError } = await supabase.from("leads").insert({
        full_name: parsed.data.fullName,
        company_name: parsed.data.company,
        work_email: parsed.data.email,
        website_or_social: parsed.data.website || null,
        service_lane: parsed.data.serviceLane,
        project_type: parsed.data.projectType,
        budget_range: parsed.data.budget,
        timeline: parsed.data.timeline,
        project_details: parsed.data.details,
        status: "new",
        lead_source: leadSource,
        local_currency_code: marketSeed.local_currency_code,
        currency_source: marketSeed.currency_source,
        country_code: marketSeed.country_code,
        country_source: marketSeed.country_source,
      });
      if (sbError) {
        console.error("[intake] Supabase insert error:", sbError.message, sbError);
      } else {
        console.log("[intake] Lead written to Supabase for:", parsed.data.email);
      }
    } catch (err) {
      console.error("[intake] Supabase write failed:", err);
    }

    // Confirmation email to the submitter — fire and forget, non-blocking
    resend.emails.send({
      from,
      to: parsed.data.email,
      replyTo: process.env.INTAKE_TO_EMAIL ?? "hello@inovense.com",
      subject: `We've received your brief, ${parsed.data.fullName.split(" ")[0]}.`,
      text: formatConfirmationText(parsed.data),
      html: formatConfirmationHtml(parsed.data),
    }).catch((err) => {
      console.error("[intake] Confirmation email failed:", err);
    });

    return { success: true };
  } catch (err) {
    console.error("[intake] Unexpected error:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again or email hello@inovense.com.",
    };
  }
}
