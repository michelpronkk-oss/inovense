import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || name.length > 200) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    }
    if (!message || message.length < 10 || message.length > 5000) {
      return NextResponse.json({ ok: false, error: "Message must be between 10 and 5000 characters" }, { status: 400 });
    }

    // Forward to internal notification address via a simple log
    // Wire up to Resend / Supabase / email provider when ready
    console.log("[contact]", { name, email, company: body.company ?? "", message });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
