"use server";

import { Resend } from "resend";
import { nlIntakeSchema, type NlIntakeFormData } from "./nl-schema";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/* ─── Email formatters ──────────────────────────────────────────────────── */

function formatNlConfirmationText(data: NlIntakeFormData): string {
  return `
Hoi ${data.fullName},

We hebben je aanvraag voor ${data.company} ontvangen. Iemand van het team beoordeelt hem persoonlijk en neemt binnen 24 uur contact met je op.

Als er een fit is, is de volgende stap meestal een kort voorstel of een inventarisatiegesprek. Als er iets verandert voor die tijd, kun je gewoon op dit bericht antwoorden.

Inovense
hello@inovense.com
  `.trim();
}

function formatNlConfirmationHtml(data: NlIntakeFormData): string {
  const firstName = data.fullName.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Aanvraag ontvangen</title>
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
              <p style="margin:0 0 10px 0;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">Aanvraag ontvangen</p>

              <!-- Heading -->
              <h1 style="margin:0 0 20px 0;font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:#fafafa;">We nemen contact op, ${firstName}.</h1>

              <!-- Body copy -->
              <p style="margin:0 0 30px 0;font-size:14px;line-height:1.75;color:#a1a1aa;">Je aanvraag voor <span style="color:#fafafa;font-weight:500;">${data.company}</span> is bij ons. We beoordelen elk verzoek persoonlijk en nemen binnen 24 uur contact met je op. Als er een fit is, is de volgende stap meestal een kort voorstel of een inventarisatiegesprek.</p>

              <!-- Hairline divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td bgcolor="#27272a" style="height:1px;background-color:#27272a;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Section label -->
              <p style="margin:0 0 14px 0;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#52525b;">Wat er nu gebeurt</p>

              <!-- Bullet list -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:10px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="14" style="padding-top:6px;vertical-align:top;">
                          <div style="width:4px;height:4px;border-radius:50%;background-color:#49A0A4;margin-top:1px;"></div>
                        </td>
                        <td style="font-size:13px;line-height:1.65;color:#71717a;">We lezen elke aanvraag zelf door voor we reageren.</td>
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
                        <td style="font-size:13px;line-height:1.65;color:#71717a;">Verwacht een reactie op dit adres binnen 24 uur.</td>
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
                        <td style="font-size:13px;line-height:1.65;color:#71717a;">Als er iets verandert voor die tijd, kun je hier gewoon op antwoorden.</td>
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
                    <p style="margin:0;font-size:11px;color:#3f3f46;">NL</p>
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

function formatNlTeamNotificationText(data: NlIntakeFormData): string {
  return `
[NL] Nieuwe aanvraag via inovense.com/nl/intake
=================================================

VAN
Naam:       ${data.fullName}
Bedrijf:    ${data.company}
E-mail:     ${data.email}
Website:    ${data.website || "Niet opgegeven"}

PROJECT
Service:    ${data.serviceLane}
Type:       ${data.projectType}
Budget:     ${data.budget}
Tijdlijn:   ${data.timeline}

PROJECTOMSCHRIJVING
${data.details}

=================================================
Ingediend via inovense.com/nl/intake
  `.trim();
}

/* ─── Action ────────────────────────────────────────────────────────────── */

export async function submitNlIntake(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = nlIntakeSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Controleer je gegevens en probeer het opnieuw.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[nl-intake] RESEND_API_KEY is not set");
    return {
      success: false,
      error: "Indiening mislukt. Stuur ons een e-mail op hello@inovense.com.",
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
      subject: `[NL] Nieuwe aanvraag: ${parsed.data.company} - ${parsed.data.serviceLane}`,
      text: formatNlTeamNotificationText(parsed.data),
    });

    if (error) {
      console.error("[nl-intake] Resend error:", error);
      return {
        success: false,
        error: "E-mailbezorging mislukt. Probeer opnieuw of neem direct contact op.",
      };
    }

    // Write lead to Supabase with nl_web source
    try {
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
        lead_source: "nl_web",
      });
      if (sbError) {
        console.error("[nl-intake] Supabase insert error:", sbError.message, sbError);
      } else {
        console.log("[nl-intake] Lead written to Supabase for:", parsed.data.email);
      }
    } catch (err) {
      console.error("[nl-intake] Supabase write failed:", err);
    }

    // Dutch confirmation email to the submitter
    resend.emails.send({
      from,
      to: parsed.data.email,
      replyTo: process.env.INTAKE_TO_EMAIL ?? "hello@inovense.com",
      subject: `We hebben je aanvraag ontvangen, ${parsed.data.fullName.split(" ")[0]}.`,
      text: formatNlConfirmationText(parsed.data),
      html: formatNlConfirmationHtml(parsed.data),
    }).catch((err) => {
      console.error("[nl-intake] Confirmation email failed:", err);
    });

    return { success: true };
  } catch (err) {
    console.error("[nl-intake] Unexpected error:", err);
    return {
      success: false,
      error: "Er is iets misgegaan. Probeer het opnieuw of mail hello@inovense.com.",
    };
  }
}
