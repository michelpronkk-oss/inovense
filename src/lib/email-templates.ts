import type { LeadStatus } from "./supabase-server";

export type EmailTemplateType =
  | "fit_followup"
  | "proposal_sent"
  | "payment_request"
  | "onboarding_sent"
  | "decline";

export type EmailTemplateDef = {
  type: EmailTemplateType;
  label: string;
  eyebrow: string;
  heading: (firstName: string) => string;
  defaultSubject: (firstName: string, company: string) => string;
  defaultBody: (firstName: string, company: string) => string;
  statusOnSend?: LeadStatus;
  /** Whether this template includes a CTA button (e.g. onboarding link). */
  hasCta?: boolean;
};

export const EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateDef> = {
  fit_followup: {
    type: "fit_followup",
    label: "Fit follow-up",
    eyebrow: "Quick update",
    heading: (firstName) => `Good news, ${firstName}.`,
    defaultSubject: (_, company) =>
      `We've reviewed your brief for ${company}`,
    defaultBody: (_, company) =>
      `We've reviewed your brief for ${company} and there's a clear fit here.\n\nBefore we put anything formal together, we'd like to ask a few quick questions to make sure we scope this correctly. Would you have 20 minutes this week for a short call? Just reply here and we'll send over a few times.`,
  },
  proposal_sent: {
    type: "proposal_sent",
    label: "Proposal ready",
    eyebrow: "Proposal",
    heading: (firstName) => `Your proposal is ready, ${firstName}.`,
    defaultSubject: (_, company) => `Proposal for ${company}`,
    defaultBody: (_, company) =>
      `We've put together a proposal for ${company} based on your brief. It covers scope, timeline, and investment in full.\n\nHave a read and let us know if anything needs adjusting. We're happy to walk through it on a call if that helps.`,
    statusOnSend: "proposal_sent",
    hasCta: true,
  },
  payment_request: {
    type: "payment_request",
    label: "Payment request",
    eyebrow: "Payment",
    heading: (firstName) => `Ready to move forward, ${firstName}?`,
    defaultSubject: (_, company) => `Invoice for ${company}`,
    defaultBody: (_, company) =>
      `We've prepared the invoice for ${company}'s project. Once the deposit is received, we'll lock in your start date and get things moving.\n\nIf you have any questions about the invoice or the next steps, just reply here.`,
    statusOnSend: "payment_requested",
    hasCta: true,
  },
  onboarding_sent: {
    type: "onboarding_sent",
    label: "Onboarding link",
    eyebrow: "Onboarding",
    heading: (firstName) => `One step before we start, ${firstName}.`,
    defaultSubject: (_, company) => `Your onboarding brief for ${company}`,
    defaultBody: (_, company) =>
      `To make sure we hit the ground running, we've prepared a short onboarding brief for ${company}. It takes about 10 minutes and helps us deliver faster and more accurately.\n\nPlease complete it using the link below.`,
    statusOnSend: "onboarding_sent",
    hasCta: true,
  },
  decline: {
    type: "decline",
    label: "Decline",
    eyebrow: "Update",
    heading: (firstName) => `A quick update, ${firstName}.`,
    defaultSubject: (_, company) => `Regarding your brief for ${company}`,
    defaultBody: (_, company) =>
      `Thank you for sending in your brief for ${company}. After reviewing it carefully, we don't think we're the right fit for this one.\n\nWe're selective about the work we take on, and we'd rather be honest with you than waste your time. We hope you find the right partner for this.`,
    statusOnSend: "lost",
  },
};

export const EMAIL_TEMPLATE_LIST = Object.values(EMAIL_TEMPLATES);

export function formatEuroAmount(value: number): string {
  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function applyPaymentAmountToBody(body: string, amount: number): string {
  const formatted = formatEuroAmount(amount);
  const trimmed = body.trim();

  if (!trimmed) {
    return `Deposit due: ${formatted}.`;
  }

  if (trimmed.includes("{{deposit_amount}}")) {
    return trimmed.replaceAll("{{deposit_amount}}", formatted);
  }

  if (trimmed.includes("{{payment_amount}}")) {
    return trimmed.replaceAll("{{payment_amount}}", formatted);
  }

  if (/deposit due:/i.test(trimmed)) {
    return trimmed;
  }

  return `Deposit due: ${formatted}.\n\n${trimmed}`;
}

/* ─── HTML builder ──────────────────────────────────────────────────────── */

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmailHtml({
  eyebrow,
  heading,
  body,
  cta,
  baseUrl = "https://inovense.com",
}: {
  eyebrow: string;
  heading: string;
  body: string;
  cta?: { text: string; href: string };
  baseUrl?: string;
}): string {
  const paragraphs = body
    .split("\n\n")
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.75;color:#a1a1aa;">${esc(p.trim()).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  const ctaBlock = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 20px 0;">
        <tr>
          <td bgcolor="#27272a" style="height:1px;background-color:#27272a;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td bgcolor="#49A0A4" style="border-radius:8px;">
            <a href="${esc(cta.href)}" style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:600;color:#09090b;text-decoration:none;letter-spacing:0.01em;">${esc(cta.text)}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#09090b" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
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
                <img
                  src="${baseUrl}/logo.png"
                  alt="Inovense"
                  width="110"
                  height="26"
                  border="0"
                  style="display:block;width:110px;height:26px;border:0;outline:none;text-decoration:none;"
                />
              </div>

              <!-- Eyebrow -->
              <p style="margin:0 0 10px 0;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">${esc(eyebrow)}</p>

              <!-- Heading -->
              <h1 style="margin:0 0 20px 0;font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:#fafafa;">${esc(heading)}</h1>

              <!-- Body paragraphs -->
              ${paragraphs}

              <!-- Optional CTA -->
              ${ctaBlock}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 4px 0 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:#3f3f46;">Inovense &nbsp;&middot;&nbsp; <a href="mailto:hello@inovense.com" style="color:#52525b;text-decoration:none;">hello@inovense.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
