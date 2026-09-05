/**
 * Supabase Auth dashboard-owned template: "Reset password".
 *
 * Static, not executed at runtime -- see the note in `./confirm-signup.ts`
 * for why this lives as a TS file instead of being wired into app code.
 *
 * Paste into: Supabase Dashboard -> Authentication -> Email Templates ->
 * "Reset password".
 *
 * Fires from: `supabase.auth.resetPasswordForEmail(...)` in
 * `src/app/app/forgot-password/page.tsx`, which passes
 * `redirectTo: appHref("/auth/callback?next=/reset-password")`.
 * `{{ .ConfirmationURL }}` therefore lands on
 * `src/app/app/auth/callback/route.ts`, which exchanges the recovery code
 * for a session and forwards to `/reset-password`
 * (`src/app/app/reset-password/page.tsx`, which calls
 * `supabase.auth.updateUser({ password })` using that session). Do not
 * rebuild this link from `{{ .TokenHash }}`.
 */
import { renderAuterimEmailHtml, renderAuterimEmailText } from "../auterim-email-layout";

export const STATUS = "active" as const;

export const SUBJECT = "Reset your Auterim password";

export const PREHEADER = "Use this secure link to reset your Auterim password.";

export const REQUIRED_VARIABLES = ["{{ .ConfirmationURL }}"] as const;

const content = {
  preheader: PREHEADER,
  eyebrow: "Password reset",
  heading: "Reset your password",
  bodyParagraphs: ["We received a request to reset the password for your Auterim account."],
  ctaText: "Reset password",
  ctaHref: "{{ .ConfirmationURL }}",
  securityNote: "If you didn't request this, you can ignore this email. Your password will remain unchanged.",
  logoUrl: "https://auterim.com/brand/auterim-icon-32.png",
};

export const HTML = renderAuterimEmailHtml(content);
export const TEXT = renderAuterimEmailText(content);
