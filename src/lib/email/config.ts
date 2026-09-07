/**
 * Canonical Resend sender identities for Auterim transactional email.
 *
 * These are hardcoded, not environment-configured. `RESEND_FROM_EMAIL` used
 * to be read directly at each call site, which meant a stale Vercel env
 * value pointing at the old inovense.com domain could silently break every
 * sender at once (the "inovense.com domain is not verified" delivery
 * failure). Only `auterim.com` is a verified Resend sending domain, so the
 * safe sender identity is a source constant, not a runtime override.
 */
import { AUTERIM_EMAILS, AUTERIM_NAME } from "@/lib/brand";

export const TRANSACTIONAL_FROM = `${AUTERIM_NAME} <${AUTERIM_EMAILS.notifications}>`;
export const SUPPORT_FROM = `${AUTERIM_NAME} Support <${AUTERIM_EMAILS.support}>`;
