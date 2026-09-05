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
 * `emailRedirectTo: appHref("/auth/callback")`. Because the client uses the
 * default PKCE flow, `{{ .ConfirmationURL }}` already resolves to
 * `.../auth/v1/verify?...&redirect_to=<app>/app/auth/callback`, which lands
 * on `src/app/app/auth/callback/route.ts`. That route exchanges the code for
 * a session and redirects to `/app` (onboarding/provisioning takes over from
 * there). Do not rebuild this link from `{{ .TokenHash }}` -- the
 * `ConfirmationURL` Supabase generates already honors the app's
 * `emailRedirectTo` and PKCE flow correctly.
 */
import { renderAuterimEmailHtml, renderAuterimEmailText } from "../auterim-email-layout";

export const STATUS = "active" as const;

export const SUBJECT = "Confirm your Auterim account";

export const PREHEADER = "Confirm your email to finish creating your Auterim workspace.";

/** Only variable this template needs. Do not add `{{ .TokenHash }}`/manual verify links here. */
export const REQUIRED_VARIABLES = ["{{ .ConfirmationURL }}"] as const;

const content = {
  preheader: PREHEADER,
  eyebrow: "Auterim account",
  heading: "Confirm your email",
  bodyParagraphs: [
    "You're one step away from setting up your Auterim workspace. Confirm your email address to continue.",
  ],
  ctaText: "Confirm email",
  ctaHref: "{{ .ConfirmationURL }}",
  securityNote: "If you didn't create an Auterim account, you can safely ignore this email.",
  logoUrl: "https://auterim.com/brand/auterim-icon-32.png",
};

export const HTML = renderAuterimEmailHtml(content);
export const TEXT = renderAuterimEmailText(content);
