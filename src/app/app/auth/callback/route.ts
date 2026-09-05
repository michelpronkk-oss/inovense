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
    return NextResponse.redirect(new URL(`${appHref("/login")}?error=${encodeURIComponent(errorDescription)}`));
  }

  if (code) {
    const supabase = await createSupabaseServerActionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`${appHref("/login")}?error=${encodeURIComponent(error.message)}`));
    }
  }

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  return NextResponse.redirect(new URL(appHref(safeNext)));
}
