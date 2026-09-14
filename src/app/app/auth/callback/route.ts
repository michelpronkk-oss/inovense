import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { appHref, safeAppPath } from "@/lib/urls";
import { EARLY_ACCESS_INVITE_COOKIE, isEarlyAccessToken } from "@/lib/early-access/invites";

const EARLY_ACCESS_TOKEN_COOKIE_PATH = "/early-access/accept";

/**
 * Handles Supabase email-link redirects: signup verification, password
 * recovery, and invite emails all land here with a `code` query param
 * (PKCE flow). Exchanges it for a real session (sets the verified session
 * cookie), then forwards to the intended destination.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const tokenHash = req.nextUrl.searchParams.get("token_hash");
  const requestedType = req.nextUrl.searchParams.get("type");
  const next = req.nextUrl.searchParams.get("next");
  const errorDescription = req.nextUrl.searchParams.get("error_description");
  const safeNext = safeAppPath(next);
  const loginWithError = () => {
    const loginUrl = new URL(appHref("/login"));
    loginUrl.searchParams.set("error", "invalid_or_expired_link");
    if (safeNext && safeNext !== "/") loginUrl.searchParams.set("from", safeNext);
    return NextResponse.redirect(loginUrl);
  };

  if (errorDescription) {
    console.warn("[auth.callback] provider returned an error");
    return loginWithError();
  }

  if (tokenHash) {
    // Token-hash verification does not depend on a browser-local PKCE
    // verifier. This makes a signup confirmation safe to open from an email
    // client, another browser, or another device.
    const supportedTypes = new Set<EmailOtpType>([
      "signup",
      "invite",
      "magiclink",
      "recovery",
      "email_change",
      "email",
    ]);
    const type: EmailOtpType = requestedType && supportedTypes.has(requestedType as EmailOtpType)
      ? requestedType as EmailOtpType
      : "email";
    const supabase = await createSupabaseServerActionClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      console.warn("[auth.callback] token verification failed", {
        code: error.code ?? "unknown",
        status: error.status ?? null,
      });
      return loginWithError();
    }
  } else if (code) {
    const supabase = await createSupabaseServerActionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("[auth.callback] session exchange failed", {
        code: error.code ?? "unknown",
        status: error.status ?? null,
      });
      return loginWithError();
    }
  } else {
    console.warn("[auth.callback] missing verification code");
    return loginWithError();
  }

  // Always enter through the app gateway after verification. The gateway
  // provisions exactly one owner workspace when needed and then decides
  // whether this account belongs in onboarding or the product. Sending every
  // callback straight to onboarding could otherwise revive an old draft.
  const destination = safeNext ?? "/";
  const nextUrl = new URL(destination, appHref("/"));
  if (nextUrl.pathname === "/early-access/accept") {
    const tokens = nextUrl.searchParams.getAll("token");
    const token = tokens.length === 1 ? tokens[0] : null;
    if (isEarlyAccessToken(token)) {
      // Supabase signup verification may be opened on another device. Carry
      // the invite through its safe internal `next` destination, exchange the
      // token into an HttpOnly cookie here, and redirect without it.
      const response = NextResponse.redirect(new URL("/early-access/accept/session", appHref("/")), 303);
      response.cookies.set(EARLY_ACCESS_INVITE_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: EARLY_ACCESS_TOKEN_COOKIE_PATH,
        maxAge: 8 * 24 * 60 * 60,
      });
      response.headers.set("Referrer-Policy", "no-referrer");
      response.headers.set("Cache-Control", "no-store, max-age=0");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
  }
  return NextResponse.redirect(new URL(appHref(destination)));
}
