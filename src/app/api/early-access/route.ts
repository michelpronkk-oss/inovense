import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { AUTERIM_EMAILS } from "@/lib/brand";
import { TRANSACTIONAL_FROM } from "@/lib/email/config";
import { submitEarlyAccessRequest } from "@/lib/early-access/service";
import { renderEarlyAccessConfirmation, renderEarlyAccessInternalNotification } from "@/lib/early-access/email";
import { createEarlyAccessSupabaseRepository } from "@/lib/early-access/supabase-repository";
import { allowRateLimit, readRequestBodyWithinLimit, requestBodyWithinLimit } from "@/lib/server/request-guards";
import { hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ALLOWED_ORIGINS = new Set([
  "auterim.com",
  "www.auterim.com",
  "app.auterim.com",
  "admin.auterim.com",
  "portal.auterim.com",
  "localhost",
  "127.0.0.1",
]);

function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return ALLOWED_ORIGINS.has(parsed.hostname.toLowerCase())
      && (local ? parsed.protocol === "http:" : parsed.protocol === "https:" && parsed.port === "");
  } catch {
    return false;
  }
}

function rateLimitKey(request: NextRequest): string {
  // Vercel writes x-real-ip at its trusted edge. For local/other supported
  // runtimes, use the final proxy hop, which is the value appended by ingress.
  const forwarded = request.headers.get("x-forwarded-for");
  const address = request.headers.get("x-real-ip")?.trim()
    || forwarded?.split(",").at(-1)?.trim()
    || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 24);
}

function safeFailure(kind: "persistence" | "confirmation" | "internal_notification") {
  console.warn(`[early_access.${kind}_failed]`);
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return NextResponse.json({ error: "This request could not be accepted." }, { status: 403 });
  if (!requestBodyWithinLimit(request, MAX_BODY_BYTES)) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  const key = rateLimitKey(request);
  if (!allowRateLimit(key, 5, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: "Please wait a few minutes before sending another request." }, { status: 429 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "The request format is invalid." }, { status: 415 });
  }
  let rawBody: string | null;
  try {
    rawBody = await readRequestBodyWithinLimit(request, MAX_BODY_BYTES);
  } catch {
    return NextResponse.json({ error: "The request format is invalid." }, { status: 400 });
  }
  if (rawBody === null) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "The request format is invalid." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Early Access is temporarily unavailable." }, { status: 503 });

  const repository = createEarlyAccessSupabaseRepository();
  const result = await submitEarlyAccessRequest(body, {
    repository,
    async sendConfirmation(submission) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new Error("resend_not_configured");
      const email = renderEarlyAccessConfirmation(submission);
      const { error } = await new Resend(apiKey).emails.send({
        from: TRANSACTIONAL_FROM,
        to: submission.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      if (error) throw new Error("resend_failed");
    },
    async notifyInternal(submission) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new Error("resend_not_configured");
      const email = renderEarlyAccessInternalNotification(submission);
      const { error } = await new Resend(apiKey).emails.send({
        from: TRANSACTIONAL_FROM,
        to: AUTERIM_EMAILS.hello,
        subject: email.subject,
        text: email.text,
      });
      if (error) throw new Error("resend_failed");
    },
    logFailure: safeFailure,
  });

  if (result.ok) return NextResponse.json({ ok: true });
  if (result.status === 400) return NextResponse.json({ error: "Review the highlighted fields.", fieldErrors: result.fieldErrors }, { status: 400 });
  return NextResponse.json({ error: "Your request could not be saved. Please try again." }, { status: 500 });
}
