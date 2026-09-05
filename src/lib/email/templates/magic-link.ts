/**
 * Supabase Auth dashboard-owned template: "Magic Link".
 *
 * STATUS: prepared but INACTIVE. Passwordless/OTP sign-in is not wired up
 * anywhere in this repo today -- `src/app/app/login/page.tsx` only calls
 * `supabase.auth.signInWithPassword`, and there is no
 * `supabase.auth.signInWithOtp(...)` call anywhere in `src/`. Do not enable
 * this dashboard template as a live flow without first building a
 * passwordless sign-in entry point; simply customizing this template does
 * not turn the feature on.
 *
 * If magic-link sign-in is built later: the client call would look like
 * `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo:
 * appHref("/auth/callback") } })`, which lands on the existing
 * `src/app/app/auth/callback/route.ts` PKCE handler unchanged.
 *
 * Paste into (only once the flow above exists): Supabase Dashboard ->
 * Authentication -> Email Templates -> "Magic Link".
 */
import { renderAuterimEmailHtml, renderAuterimEmailText } from "../auterim-email-layout";

export const STATUS = "inactive" as const;

export const SUBJECT = "Sign in to Auterim";

export const PREHEADER = "Use this secure link to sign in to Auterim.";

export const REQUIRED_VARIABLES = ["{{ .ConfirmationURL }}"] as const;

const content = {
  preheader: PREHEADER,
  eyebrow: "Sign-in link",
  heading: "Sign in to Auterim",
  bodyParagraphs: [
    "Use the button below to sign in to your Auterim account. This link can only be used once.",
  ],
  ctaText: "Sign in",
  ctaHref: "{{ .ConfirmationURL }}",
  securityNote: "If you didn't request this, you can safely ignore this email.",
  logoUrl: "https://auterim.com/brand/auterim-icon-64.png",
};

export const HTML = renderAuterimEmailHtml(content);
export const TEXT = renderAuterimEmailText(content);
