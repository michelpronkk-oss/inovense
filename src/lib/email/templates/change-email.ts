/**
 * Supabase Auth dashboard-owned template: "Change Email Address".
 *
 * STATUS: prepared but INACTIVE. There is no "change email" UI anywhere
 * under `/app` today (checked `src/app/app/profile/` and
 * `src/app/app/settings/`) and no `supabase.auth.updateUser({ email })` call
 * anywhere in `src/`. Do not enable this as a live flow without first
 * building that UI; customizing this template alone does not turn the
 * feature on.
 *
 * If email-change is built later: if Supabase's "Secure email change"
 * setting is enabled, GoTrue sends this SAME template to both the current
 * and the new email address (each with its own `{{ .ConfirmationURL }}`),
 * requiring confirmation from both addresses before the change applies --
 * the copy below is written generically so it is correct for either send.
 *
 * Paste into (only once the flow above exists): Supabase Dashboard ->
 * Authentication -> Email Templates -> "Change Email Address".
 */
import { renderAuterimEmailHtml, renderAuterimEmailText } from "../auterim-email-layout";

export const STATUS = "inactive" as const;

export const SUBJECT = "Confirm your new Auterim email address";

export const PREHEADER = "Confirm this email address change on your Auterim account.";

export const REQUIRED_VARIABLES = ["{{ .ConfirmationURL }}"] as const;

const content = {
  preheader: PREHEADER,
  eyebrow: "Account security",
  heading: "Confirm your new email address",
  bodyParagraphs: [
    "We received a request to change the email address on your Auterim account. This is a security-sensitive change -- confirming will update the email address you use to sign in.",
  ],
  ctaText: "Confirm email change",
  ctaHref: "{{ .ConfirmationURL }}",
  securityNote:
    "If you didn't request this change, do not click the button above -- contact support@auterim.com right away.",
  logoUrl: "https://auterim.com/brand/auterim-icon-64.png",
};

export const HTML = renderAuterimEmailHtml(content);
export const TEXT = renderAuterimEmailText(content);
