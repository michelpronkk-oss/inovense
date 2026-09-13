import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { AUTERIM_EMAILS } from "@/lib/brand";
import { TRANSACTIONAL_FROM } from "@/lib/email/config";
import { allowRateLimit, clientAddress, requestBodyWithinLimit } from "@/lib/server/request-guards";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;
const ALLOWED_REASONS = new Set(["", "early-access", "pricing", "support", "partnership", "other"]);
const ALLOWED_ORIGINS = new Set(["auterim.com", "www.auterim.com", "app.auterim.com", "admin.auterim.com", "portal.auterim.com", "localhost", "127.0.0.1"]);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function originIsAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const local = hostname === "localhost" || hostname === "127.0.0.1";
    return ALLOWED_ORIGINS.has(hostname) && (local ? parsed.protocol === "http:" : parsed.protocol === "https:" && parsed.port === "");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!originIsAllowed(req)) return NextResponse.json({ ok: false, error: "This request could not be accepted." }, { status: 403 });
  if (!requestBodyWithinLimit(req, MAX_BODY_BYTES)) return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  if (!allowRateLimit(`contact:${clientAddress(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Please wait before sending another message." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  const values = body as Record<string, unknown>;
  const name = typeof values.name === "string" ? values.name.trim() : "";
  const email = typeof values.email === "string" ? values.email.trim() : "";
  const company = typeof values.company === "string" ? values.company.trim() : "";
  const reason = typeof values.reason === "string" ? values.reason.trim() : "";
  const message = typeof values.message === "string" ? values.message.trim() : "";

  if (!name || name.length > 200 || /[\r\n]/.test(name)) return NextResponse.json({ ok: false, error: "Enter a valid name." }, { status: 400 });
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(email)) return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  if (company.length > 200 || /[\r\n]/.test(company)) return NextResponse.json({ ok: false, error: "Company name is too long." }, { status: 400 });
  if (!ALLOWED_REASONS.has(reason)) return NextResponse.json({ ok: false, error: "Select a valid message reason." }, { status: 400 });
  if (message.length < 10 || message.length > 5000) return NextResponse.json({ ok: false, error: "Message must be between 10 and 5000 characters." }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: "The contact form is temporarily unavailable. Please email hello@auterim.com." }, { status: 503 });

  const text = [`Name: ${name}`, `Email: ${email}`, `Company: ${company || "Not provided"}`, `Reason: ${reason || "Not specified"}`, "", message].join("\n");
  const html = `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Company:</strong> ${escapeHtml(company || "Not provided")}</p><p><strong>Reason:</strong> ${escapeHtml(reason || "Not specified")}</p><hr><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: TRANSACTIONAL_FROM,
      to: process.env.INTAKE_TO_EMAIL || AUTERIM_EMAILS.hello,
      replyTo: email,
      subject: `Auterim contact: ${reason || "General"}`,
      text,
      html,
    });
    if (error) throw new Error("contact_delivery_failed");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not send your message just now. Please try again or email hello@auterim.com." }, { status: 502 });
  }
}
