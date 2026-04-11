import type { LeadStatus } from "./supabase-server";
import {
  getClientLocaleForLeadSource,
  isDutchClientLeadSource,
  type ClientLocale,
} from "./client-locale";
import { normalizeCurrencyCode } from "./currency";

export type EmailTemplateType =
  | "fit_followup"
  | "proposal_sent"
  | "payment_request"
  | "onboarding_sent"
  | "decline";

export type EmailTemplateLocale = ClientLocale;

export type EmailTemplateDef = {
  type: EmailTemplateType;
  label: string;
  eyebrow: string;
  heading: (firstName: string) => string;
  defaultSubject: (firstName: string, company: string) => string;
  defaultBody: (firstName: string, company: string) => string;
  statusOnSend?: LeadStatus;
  hasCta?: boolean;
  ctaText?: string;
};

export type DepositPaidConfirmationTemplate = {
  eyebrow: string;
  heading: (firstName: string) => string;
  subject: (company: string) => string;
  body: (company: string) => string;
};

const DEPOSIT_PAID_CONFIRMATION_TEMPLATE_EN: DepositPaidConfirmationTemplate = {
  eyebrow: "Payment confirmed",
  heading: (firstName) => `Deposit received, ${firstName}.`,
  subject: (company) => `Deposit confirmed for ${company}`,
  body: (company) =>
    `We've received the deposit for ${company}, and your project slot is now secured.\n\nWe'll move into onboarding and kickoff preparation next. If there is anything you want us to factor in before kickoff, just reply to this email.`,
};

const DEPOSIT_PAID_CONFIRMATION_TEMPLATE_NL: DepositPaidConfirmationTemplate = {
  eyebrow: "Betaling bevestigd",
  heading: (firstName) => `Aanbetaling ontvangen, ${firstName}.`,
  subject: (company) => `Aanbetaling bevestigd voor ${company}`,
  body: (company) =>
    `We hebben de aanbetaling voor ${company} ontvangen en je projectslot is nu bevestigd.\n\nHierna gaan we door naar onboarding en kickoffvoorbereiding. Als je vooraf nog context wilt delen, kun je gewoon op deze e-mail reageren.`,
};

const EMAIL_TEMPLATES_EN: Record<EmailTemplateType, EmailTemplateDef> = {
  fit_followup: {
    type: "fit_followup",
    label: "Fit follow-up",
    eyebrow: "Quick update",
    heading: (firstName) => `Good news, ${firstName}.`,
    defaultSubject: (_, company) => `We've reviewed your brief for ${company}`,
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
    ctaText: "View proposal",
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
    ctaText: "Pay deposit",
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
    ctaText: "Complete onboarding brief",
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

const EMAIL_TEMPLATES_NL: Record<EmailTemplateType, EmailTemplateDef> = {
  fit_followup: {
    type: "fit_followup",
    label: "Fit follow-up",
    eyebrow: "Vervolg",
    heading: (firstName) => `Er is een duidelijke fit, ${firstName}.`,
    defaultSubject: (_, company) =>
      `We hebben je projectaanvraag voor ${company} beoordeeld`,
    defaultBody: (_, company) =>
      `We hebben je projectaanvraag voor ${company} beoordeeld en zien een duidelijke fit.\n\nVoordat we de scope definitief maken, plannen we een korte strategische call van 20 minuten.\n\nAntwoord op deze mail met twee momenten die voor je werken. Dan bevestigen we direct.`,
  },
  proposal_sent: {
    type: "proposal_sent",
    label: "Proposal ready",
    eyebrow: "Voorstel",
    heading: (firstName) => `Je voorstel staat klaar, ${firstName}.`,
    defaultSubject: (_, company) => `Voorstel voor ${company}`,
    defaultBody: (_, company) =>
      `Je voorstel voor ${company} staat klaar. Je vindt er scope, planning en investering in complete vorm.\n\nNeem het door en laat weten of je iets wilt aanscherpen. We kunnen het ook kort samen doornemen.`,
    statusOnSend: "proposal_sent",
    hasCta: true,
    ctaText: "Bekijk voorstel",
  },
  payment_request: {
    type: "payment_request",
    label: "Payment request",
    eyebrow: "Betaling",
    heading: (firstName) => `Klaar om te starten, ${firstName}?`,
    defaultSubject: (_, company) => `Aanbetaling voor ${company}`,
    defaultBody: (_, company) =>
      `De aanbetaling voor ${company} staat klaar.\n\nZodra de betaling binnen is, reserveren we de startdatum en zetten we onboarding direct live.\n\nVragen over de factuur of planning? Antwoord op deze mail.`,
    statusOnSend: "payment_requested",
    hasCta: true,
    ctaText: "Betaal aanbetaling",
  },
  onboarding_sent: {
    type: "onboarding_sent",
    label: "Onboarding link",
    eyebrow: "Onboarding",
    heading: (firstName) => `Nog een stap en we starten, ${firstName}.`,
    defaultSubject: (_, company) => `Onboarding voor ${company}`,
    defaultBody: (_, company) =>
      `Om scherp te starten staat de onboarding voor ${company} klaar.\n\nHet invullen duurt ongeveer 10 minuten en geeft ons alles om snel en nauwkeurig te leveren.\n\nOpen de link hieronder en rond hem af.`,
    statusOnSend: "onboarding_sent",
    hasCta: true,
    ctaText: "Start onboarding",
  },
  decline: {
    type: "decline",
    label: "Decline",
    eyebrow: "Update",
    heading: (firstName) => `Een korte update, ${firstName}.`,
    defaultSubject: (_, company) => `Update op je projectaanvraag voor ${company}`,
    defaultBody: (_, company) =>
      `Dank voor je projectaanvraag voor ${company}. Na een zorgvuldige beoordeling zien we op dit moment geen sterke match.\n\nWe nemen alleen projecten aan waar we volledig waarde kunnen leveren.\n\nWe wensen je veel succes met de juiste partner voor deze fase.`,
    statusOnSend: "lost",
  },
};

export const EMAIL_TEMPLATES = EMAIL_TEMPLATES_EN;
export const EMAIL_TEMPLATE_LIST = Object.values(EMAIL_TEMPLATES);

export function isDutchLeadSource(leadSource: string | null | undefined): boolean {
  return isDutchClientLeadSource(leadSource);
}

export function getEmailTemplateLocaleForLeadSource(
  leadSource: string | null | undefined
): EmailTemplateLocale {
  return getClientLocaleForLeadSource(leadSource);
}

export function getEmailTemplatesForLeadSource(
  leadSource: string | null | undefined
): Record<EmailTemplateType, EmailTemplateDef> {
  return isDutchLeadSource(leadSource) ? EMAIL_TEMPLATES_NL : EMAIL_TEMPLATES_EN;
}

export function getEmailTemplateListForLeadSource(
  leadSource: string | null | undefined
): EmailTemplateDef[] {
  return Object.values(getEmailTemplatesForLeadSource(leadSource));
}

export function getDepositPaidConfirmationTemplateForLeadSource(
  leadSource: string | null | undefined
): DepositPaidConfirmationTemplate {
  return isDutchLeadSource(leadSource)
    ? DEPOSIT_PAID_CONFIRMATION_TEMPLATE_NL
    : DEPOSIT_PAID_CONFIRMATION_TEMPLATE_EN;
}

export function formatMoneyAmount(
  value: number,
  currencyCode: string | null | undefined,
  locale: EmailTemplateLocale = "en"
): string {
  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  const resolvedCurrencyCode = normalizeCurrencyCode(currencyCode);
  return new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    style: "currency",
    currency: resolvedCurrencyCode,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatEuroAmount(
  value: number,
  locale: EmailTemplateLocale = "en"
): string {
  return formatMoneyAmount(value, "EUR", locale);
}

export function applyPaymentAmountToBody(
  body: string,
  amount: number,
  locale: EmailTemplateLocale = "en",
  currencyCode: string | null | undefined = "EUR"
): string {
  const formatted = formatMoneyAmount(amount, currencyCode, locale);
  const trimmed = body.trim();
  const prefix = locale === "nl" ? `Aanbetaling: ${formatted}.` : `Deposit due: ${formatted}.`;

  if (!trimmed) {
    return prefix;
  }

  if (trimmed.includes("{{deposit_amount}}")) {
    return trimmed.replaceAll("{{deposit_amount}}", formatted);
  }

  if (trimmed.includes("{{payment_amount}}")) {
    return trimmed.replaceAll("{{payment_amount}}", formatted);
  }

  if ((locale === "nl" ? /aanbetaling:/i : /deposit due:/i).test(trimmed)) {
    return trimmed;
  }

  return `${prefix}\n\n${trimmed}`;
}

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
  lang = "en",
}: {
  eyebrow: string;
  heading: string;
  body: string;
  cta?: { text: string; href: string };
  baseUrl?: string;
  lang?: EmailTemplateLocale;
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
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#09090b" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">

          <tr>
            <td bgcolor="#49A0A4" style="height:2px;background-color:#49A0A4;border-radius:2px 2px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td bgcolor="#18181b" style="background-color:#18181b;border:1px solid #27272a;border-top:none;border-radius:0 0 12px 12px;padding:36px 36px 32px 36px;">
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

              <p style="margin:0 0 10px 0;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">${esc(eyebrow)}</p>
              <h1 style="margin:0 0 20px 0;font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:#fafafa;">${esc(heading)}</h1>
              ${paragraphs}
              ${ctaBlock}
            </td>
          </tr>

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
