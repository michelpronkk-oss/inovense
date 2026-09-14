import { NextRequest, NextResponse } from "next/server";
import { EARLY_ACCESS_INVITE_COOKIE, isEarlyAccessToken } from "@/lib/early-access/invites";

const ACCEPT_PATH = "/early-access/accept/session";
const TOKEN_COOKIE_PATH = "/early-access/accept";
const COOKIE_MAX_AGE = 8 * 24 * 60 * 60;

/**
 * Move the bearer token from the email URL into an HttpOnly, path-scoped
 * cookie, then immediately redirect to a clean URL before the app shell or
 * consent-based attribution tracker renders.
 */
export async function GET(request: NextRequest) {
  const tokens = request.nextUrl.searchParams.getAll("token");
  const token = tokens.length === 1 ? tokens[0] : null;
  const response = NextResponse.redirect(new URL(ACCEPT_PATH, request.url), 303);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  if (isEarlyAccessToken(token)) {
    response.cookies.set(EARLY_ACCESS_INVITE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: TOKEN_COOKIE_PATH,
      maxAge: COOKIE_MAX_AGE,
    });
  } else {
    // Opening a malformed or tokenless link must not leave an earlier invite
    // cookie eligible for acceptance.
    response.cookies.set(EARLY_ACCESS_INVITE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: TOKEN_COOKIE_PATH,
      maxAge: 0,
    });
  }

  return response;
}
