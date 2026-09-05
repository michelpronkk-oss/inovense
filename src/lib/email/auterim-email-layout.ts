/**
 * Shared Auterim transactional email layout.
 *
 * Used by code-owned auth-adjacent emails (currently: the team invite email
 * sent from `src/app/app/team/actions.ts`). This is a plain string-builder —
 * no email framework, no JSX, matching the existing Resend-via-raw-HTML
 * convention already used elsewhere in the repo (see
 * `src/lib/email-templates.ts`, `src/app/api/contact/route.ts`).
 *
 * Design tokens are pulled from the real site source of truth:
 * `src/components/home-v3/auterim-v3.css` (`:root`). Do not hand-edit colors
 * here without checking that file first.
 *
 * IMPORTANT: The Supabase-dashboard-owned templates in `./templates/*.ts`
 * (confirm signup, reset password, magic link, change email,
 * reauthentication) intentionally do NOT import this module — Supabase
 * Auth email templates are static HTML pasted into the dashboard and use Go
 * template syntax (`{{ .ConfirmationURL }}`), not this app's runtime. Those
 * files mirror this layout's visual structure by hand. If you change the
 * visual design here, update those files to match.
 */

const COLOR = {
  bg: "#080B10",
  card: "#0B1017",
  cardBorder: "#1B222C",
  ink: "#F6F8FB",
  dim: "#A7B1BE",
  mute: "#6F7C8C",
  acc: "#37E6D4",
  accHi: "#6FF2E5",
  accInk: "#04130F", // text color on top of the accent-colored button
  gate: "#FFCC66",
  rule: "#1B222C",
} as const;

const FONT_SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

export type AuterimEmailContent = {
  /** Hidden preview text shown in inbox lists (Gmail/Apple Mail/Outlook). */
  preheader: string;
  /** Small uppercase label above the heading, e.g. "Auterim account". */
  eyebrow: string;
  heading: string;
  /** One or more paragraphs. Each string in the array renders as its own <p>. */
  bodyParagraphs: string[];
  ctaText: string;
  ctaHref: string;
  /** Optional short note rendered under the button, e.g. invite email-binding note. */
  secondaryNote?: string;
  /** Optional security/ignore-this-email note, rendered in a muted block. */
  securityNote?: string;
  /** Absolute URL to the Auterim mark PNG (self-contained dark badge, safe for light/dark clients). */
  logoUrl: string;
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAuterimEmailHtml(content: AuterimEmailContent): string {
  const paragraphs = content.bodyParagraphs
    .map((p) => `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:${COLOR.dim};">${esc(p)}</p>`)
    .join("");

  const secondaryNote = content.secondaryNote
    ? `<p style="margin:0 0 4px 0;font-size:13px;line-height:1.6;color:${COLOR.mute};">${esc(content.secondaryNote)}</p>`
    : "";

  const securityNote = content.securityNote
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
        <tr>
          <td bgcolor="${COLOR.bg}" style="background-color:${COLOR.bg};border:1px solid ${COLOR.rule};border-radius:10px;padding:14px 16px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:${COLOR.mute};">${esc(content.securityNote)}</p>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" style="background-color:${COLOR.bg};">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark light" />
<meta name="supported-color-schemes" content="dark light" />
<title>${esc(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.bg};font-family:${FONT_SANS};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(content.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="${COLOR.bg}" style="background-color:${COLOR.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">

          <tr>
            <td style="padding:0 4px 20px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${content.logoUrl}" alt="Auterim" width="28" height="28" style="display:block;width:28px;height:28px;border:0;border-radius:7px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:14px;font-weight:700;letter-spacing:0.06em;color:${COLOR.ink};">AUTERIM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="${COLOR.acc}" style="height:2px;background-color:${COLOR.acc};border-radius:2px 2px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td bgcolor="${COLOR.card}" style="background-color:${COLOR.card};border:1px solid ${COLOR.cardBorder};border-top:none;border-radius:0 0 12px 12px;padding:36px 32px;">
              <p style="margin:0 0 10px 0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${COLOR.mute};">${esc(content.eyebrow)}</p>
              <h1 style="margin:0 0 18px 0;font-size:24px;font-weight:600;line-height:1.3;letter-spacing:-0.01em;color:${COLOR.ink};">${esc(content.heading)}</h1>
              ${paragraphs}

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 18px 0;">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td bgcolor="${COLOR.acc}" style="background-color:${COLOR.acc};border-radius:10px;">
                          <a href="${esc(content.ctaHref)}" style="display:inline-block;padding:14px 26px;color:${COLOR.accInk};text-decoration:none;font-size:15px;font-weight:700;font-family:${FONT_SANS};">${esc(content.ctaText)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${secondaryNote}

              <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:${COLOR.mute};">If the button doesn&rsquo;t work, copy and paste this link into your browser:<br />
                <a href="${esc(content.ctaHref)}" style="color:${COLOR.accHi};word-break:break-all;">${esc(content.ctaHref)}</a>
              </p>

              ${securityNote}
            </td>
          </tr>

          <tr>
            <td style="padding:22px 6px 0 6px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${COLOR.mute};">Auterim &mdash; The AI workforce built around your business.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderAuterimEmailText(content: AuterimEmailContent): string {
  const lines = [
    "AUTERIM",
    "",
    content.heading,
    "",
    ...content.bodyParagraphs,
    "",
    `${content.ctaText}: ${content.ctaHref}`,
  ];

  if (content.secondaryNote) {
    lines.push("", content.secondaryNote);
  }

  if (content.securityNote) {
    lines.push("", content.securityNote);
  }

  lines.push("", "--", "Auterim -- The AI workforce built around your business.");

  return lines.join("\n");
}

export const AUTERIM_EMAIL_COLORS = COLOR;
