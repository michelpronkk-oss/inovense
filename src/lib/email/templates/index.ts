/**
 * Supabase Auth dashboard-owned email templates.
 *
 * Each sibling file exports `SUBJECT`, `PREHEADER`, `HTML`, `TEXT`,
 * `REQUIRED_VARIABLES`, and `STATUS` ("active" | "inactive") for one
 * Supabase Auth email template. None of this is imported by app runtime
 * code -- these are copy-paste sources for the Supabase Dashboard
 * (Authentication -> Email Templates -> <template name>), kept in version
 * control so the design/copy has one source of truth. See each file's
 * top-of-file comment for exactly which template it maps to, which app flow
 * triggers it, and whether it is currently active in this product.
 *
 * Active (a real flow in this app sends this today):
 *  - confirm-signup.ts  -> "Confirm signup"
 *  - reset-password.ts  -> "Reset password"
 *
 * Prepared but inactive (template ready; no flow in this app triggers it
 * yet -- do not enable in the dashboard without first building the
 * corresponding product flow):
 *  - magic-link.ts       -> "Magic Link"
 *  - change-email.ts     -> "Change Email Address"
 *  - reauthentication.ts -> "Reauthentication"
 *
 * Not covered here: Supabase's dashboard-owned "Invite user" template. The
 * app no longer triggers it at all (see `src/app/app/team/actions.ts` and
 * `src/lib/email/auth-emails.ts`) -- team invites are sent as a single
 * custom Resend email instead, so there is nothing to paste into that
 * dashboard slot for this product's invite flow.
 */
export * as confirmSignup from "./confirm-signup";
export * as resetPassword from "./reset-password";
export * as magicLink from "./magic-link";
export * as changeEmail from "./change-email";
export * as reauthentication from "./reauthentication";
