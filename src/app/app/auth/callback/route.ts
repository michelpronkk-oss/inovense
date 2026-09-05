import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { appHref } from "@/lib/urls";

/**
 * Handles Supabase email-link redirects: signup verification, password
 * recovery, and invite emails all land here with a `code` query param
 * (PKCE flow). Exchanges it for a real session (sets the verified session
 * cookie), then forwards to the intended destination.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  if (errorDescription) {
    console.warn("[auth.callback] provider returned an error");
    return NextResponse.redirect(new URL(`${appHref("/login")}?error=invalid_or_expired_link`));
  }

  if (code) {
    const supabase = await createSupabaseServerActionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("[auth.callback] session exchange failed", {
        code: error.code ?? "unknown",
        status: error.status ?? null,
      });
      return NextResponse.redirect(new URL(`${appHref("/login")}?error=invalid_or_expired_link`));
    }
  }

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  return NextResponse.redirect(new URL(appHref(safeNext)));
}
