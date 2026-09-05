/**
 * Supabase Auth dashboard-owned template: "Reauthentication".
 *
 * STATUS: prepared but INACTIVE. No `supabase.auth.reauthenticate()` or OTP
 * verification call exists anywhere in `src/` today. Do not enable this as
 * a live flow without first building a reauthentication step; customizing
 * this template alone does not turn the feature on.
 *
 * This template is code-based, not link-based: `{{ .Token }}` is a
 * short-lived one-time code the user types back into the product (there is
 * no `{{ .ConfirmationURL }}` for this template type), so it intentionally
 * does not reuse the CTA-button layout from `../auterim-email-layout`.
 *
 * Paste into (only once the flow above exists): Supabase Dashboard ->
 * Authentication -> Email Templates -> "Reauthentication".
 */
import { AUTERIM_EMAIL_COLORS } from "../auterim-email-layout";

export const STATUS = "inactive" as const;

export const SUBJECT = "Your Auterim verification code";

export const PREHEADER = "Use this code to verify it's really you.";

export const REQUIRED_VARIABLES = ["{{ .Token }}"] as const;

const C = AUTERIM_EMAIL_COLORS;
const FONT_SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const FONT_MONO = `ui-monospace,SFMono-Regular,Menlo,monospace`;

export const HTML = `<!DOCTYPE html>
<html lang="en" style="background-color:${C.bg};">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark light" />
<meta name="supported-color-schemes" content="dark light" />
<title>Your Auterim verification code</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:${FONT_SANS};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${PREHEADER}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="${C.bg}" style="background-color:${C.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">

          <tr>
            <td style="padding:0 4px 20px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="https://auterim.com/brand/auterim-icon-64.png" alt="Auterim" width="28" height="28" style="display:block;width:28px;height:28px;border:0;border-radius:7px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:14px;font-weight:700;letter-spacing:0.06em;color:${C.ink};">AUTERIM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="${C.acc}" style="height:2px;background-color:${C.acc};border-radius:2px 2px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td bgcolor="${C.card}" style="background-color:${C.card};border:1px solid ${C.cardBorder};border-top:none;border-radius:0 0 12px 12px;padding:36px 32px;">
              <p style="margin:0 0 10px 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${C.mute};">Account security</p>
              <h1 style="margin:0 0 18px 0;font-size:24px;font-weight:600;line-height:1.3;letter-spacing:-0.01em;color:${C.ink};">Verify it's you</h1>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:${C.dim};">Enter this code to confirm this sensitive action on your Auterim account.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:22px;">
                <tr>
                  <td bgcolor="${C.bg}" style="background-color:${C.bg};border:1px solid ${C.rule};border-radius:10px;padding:18px 20px;text-align:center;">
                    <span style="font-family:${FONT_MONO};font-size:30px;font-weight:600;letter-spacing:0.3em;color:${C.acc};">{{ .Token }}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.6;color:${C.mute};">This code expires shortly. Auterim staff will never ask you for this code. If you didn't request this, you can ignore this email.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 6px 0 6px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${C.mute};">Auterim &mdash; The AI workforce built around your business.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const TEXT = [
  "AUTERIM",
  "",
  "Verify it's you",
  "",
  "Enter this code to confirm this sensitive action on your Auterim account.",
  "",
  "Your code: {{ .Token }}",
  "",
  "This code expires shortly. Auterim staff will never ask you for this code. If you didn't request this, you can ignore this email.",
  "",
  "--",
  "Auterim -- The AI workforce built around your business.",
].join("\n");
