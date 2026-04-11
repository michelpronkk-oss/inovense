import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const sessionKey = typeof body.session_key === "string" ? body.session_key.trim() : null;
    if (!sessionKey || sessionKey.length > 128) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const isNew = body.is_new_session === true;

    const supabase = createSupabaseServerClient();

    if (isNew) {
      // Idempotent insert: if session_key already exists, no-op (ignoreDuplicates).
      await supabase
        .from("traffic_sessions")
        .upsert(
          {
            session_key: sessionKey,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            landing_path: typeof body.landing_path === "string" ? body.landing_path.slice(0, 512) : null,
            last_path: typeof body.last_path === "string" ? body.last_path.slice(0, 512) : null,
            referrer_host: typeof body.referrer_host === "string" ? body.referrer_host.slice(0, 256) : null,
            utm_source: typeof body.utm_source === "string" ? body.utm_source.slice(0, 128) : null,
            utm_medium: typeof body.utm_medium === "string" ? body.utm_medium.slice(0, 128) : null,
            utm_campaign: typeof body.utm_campaign === "string" ? body.utm_campaign.slice(0, 128) : null,
            utm_content: typeof body.utm_content === "string" ? body.utm_content.slice(0, 128) : null,
            utm_term: typeof body.utm_term === "string" ? body.utm_term.slice(0, 128) : null,
            first_touch_source: typeof body.first_touch_source === "string" ? body.first_touch_source : null,
            last_touch_source: typeof body.last_touch_source === "string" ? body.last_touch_source : null,
            pageviews: 1,
          },
          { onConflict: "session_key", ignoreDuplicates: true }
        );
    } else {
      // Existing session page navigation: update last_seen + last_path only.
      await supabase
        .from("traffic_sessions")
        .update({
          last_seen_at: new Date().toISOString(),
          last_path: typeof body.last_path === "string" ? body.last_path.slice(0, 512) : null,
        })
        .eq("session_key", sessionKey);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[traffic/hit]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
