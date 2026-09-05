/**
 * Supabase Auth dashboard-owned template: "Confirm signup".
 *
 * This file is NOT imported/executed by the app at runtime. Supabase Auth
 * email templates are static HTML/text configured in the Supabase dashboard
 * and rendered by GoTrue using Go template syntax (`{{ .ConfirmationURL }}`
 * etc). This file exists purely so the finished copy-paste-ready template
 * lives in version control instead of only in the dashboard.
 *
 * Paste into: Supabase Dashboard -> Authentication -> Email Templates ->
 * "Confirm signup".
 *
 * Fires from: `supabase.auth.signUp(...)` in
 * `src/app/app/register/page.tsx`, which passes
 * `emailRedirectTo: appHref("/auth/callback")`. The email CTA must use a
 * token hash rather than `{{ .ConfirmationURL }}`: a PKCE code can only be
 * exchanged by the originating browser, while email confirmation commonly
 * opens in a different browser or device. The callback verifies the token
 * hash server-side and sets the session cookie.
 */
import { renderAuterimEmailHtml, renderAuterimEmailText } from "../auterim-email-layout";

export const STATUS = "active" as const;

export const SUBJECT = "Confirm your Auterim account";

export const PREHEADER = "Confirm your email to finish creating your Auterim workspace.";

/** Keep the confirmation portable across browsers and email clients. */
export const REQUIRED_VARIABLES = ["{{ .RedirectTo }}", "{{ .TokenHash }}"] as const;

const content = {
  preheader: PREHEADER,
  eyebrow: "Auterim account",
  heading: "Confirm your email",
  bodyParagraphs: [
    "You're one step away from setting up your Auterim workspace. Confirm your email address to continue.",
  ],
  ctaText: "Confirm email",
  ctaHref: "{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email",
  securityNote: "If you didn't create an Auterim account, you can safely ignore this email.",
  logoUrl: "https://auterim.com/brand/auterim-icon-32.png",
};

export const HTML = renderAuterimEmailHtml(content);
export const TEXT = renderAuterimEmailText(content);
