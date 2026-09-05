import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin");
  if (origin === "https://auterim.com" || origin === "https://www.auterim.com") {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    };
  }
  return {};
}

/** A minimal, non-cacheable cross-subdomain session check for public CTAs. */
export async function GET(request: NextRequest) {
  const user = await getVerifiedSupabaseUser();
  return NextResponse.json(
    { authenticated: Boolean(user) },
    { headers: { "Cache-Control": "private, no-store", ...corsHeaders(request) } },
  );
}

