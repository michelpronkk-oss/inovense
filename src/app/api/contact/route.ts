import { type NextRequest, NextResponse } from "next/server";
import { allowRateLimit, clientAddress, requestBodyWithinLimit } from "@/lib/server/request-guards";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!requestBodyWithinLimit(req, 32 * 1024)) {
      return NextResponse.json({ ok: false, error: "Request is too large" }, { status: 413 });
    }
    if (!allowRateLimit(`contact:${clientAddress(req)}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "Please wait before sending another message" }, { status: 429 });
    }
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

    // Keep public contact submissions out of production logs. The message may
    // contain personal data or credentials pasted by a visitor.

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
