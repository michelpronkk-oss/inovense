import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auterim-signup-confirmation-"));

try {
  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.auterim.com";

  const urlsSource = read("src/lib/urls.ts")
    .replace(
      'import { AUTERIM_APP_URL, AUTERIM_MARKETING_URL } from "@/lib/brand";',
      'const AUTERIM_APP_URL = "https://app.auterim.com"; const AUTERIM_MARKETING_URL = "https://auterim.com";',
    );
  const urlsModulePath = path.join(tempDir, "urls.mjs");
  fs.writeFileSync(
    urlsModulePath,
    esbuild.transformSync(urlsSource, { loader: "ts", format: "esm", target: "node18" }).code,
    "utf8",
  );
  const { authCallbackHref, safeAppPath } = await import(`${pathToFileURL(urlsModulePath).href}?urls=${Date.now()}`);

  assert.equal(authCallbackHref(), "https://app.auterim.com/auth/callback?next=%2F");
  assert.equal(
    authCallbackHref("/invite/accept?token=invite-token&source=email"),
    "https://app.auterim.com/auth/callback?next=%2Finvite%2Faccept%3Ftoken%3Dinvite-token%26source%3Demail",
  );
  assert.equal(safeAppPath("//evil.example"), null, "protocol-relative redirects must be rejected");
  assert.equal(safeAppPath("/\\\\evil.example"), null, "backslash redirects must be rejected");

  const malformed = new URL("https://app.auterim.com/auth/callback?next=%2F?token_hash=hash&type=email");
  assert.equal(malformed.searchParams.get("token_hash"), null, "the historical second '?' loses token_hash parsing");
  const corrected = new URL("https://app.auterim.com/auth/callback?next=%2F&token_hash=hash&type=email");
  assert.equal(corrected.searchParams.get("token_hash"), "hash");

  const template = read("src/lib/email/templates/confirm-signup.ts");
  assert.match(template, /ctaHref: "\{\{ \.RedirectTo \}\}&token_hash=\{\{ \.TokenHash \}\}&type=email"/);
  assert.doesNotMatch(template, /ctaHref: "\{\{ \.RedirectTo \}\}\?token_hash/);

  const routeSource = read("src/app/app/auth/callback/route.ts")
    .replace(
      'import { NextRequest, NextResponse } from "next/server";',
      'const NextResponse = { redirect(url) { return { location: String(url) }; } };',
    )
    .replace('import type { EmailOtpType } from "@supabase/supabase-js";', "type EmailOtpType = string;")
    .replace(
      'import { createSupabaseServerActionClient } from "@/lib/supabase/server";',
      'const createSupabaseServerActionClient = globalThis.__createSupabaseServerActionClient;',
    )
    .replace(
      'import { appHref, safeAppPath } from "@/lib/urls";',
      'const appHref = (value) => new URL(value, "https://app.auterim.com").href; const safeAppPath = (value) => value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\\\") ? value : null;',
    );
  const routeModulePath = path.join(tempDir, "callback.mjs");
  fs.writeFileSync(
    routeModulePath,
    esbuild.transformSync(routeSource, { loader: "ts", format: "esm", target: "node18" }).code,
    "utf8",
  );

  const calls = [];
  globalThis.__createSupabaseServerActionClient = async () => ({
    auth: {
      exchangeCodeForSession: async (code) => {
        calls.push({ method: "exchangeCodeForSession", code });
        return { error: null };
      },
      verifyOtp: async (params) => {
        calls.push({ method: "verifyOtp", params });
        return { error: null };
      },
    },
  });
  const { GET } = await import(`${pathToFileURL(routeModulePath).href}?callback=${Date.now()}`);

  const codeResult = await GET({
    nextUrl: new URL("https://app.auterim.com/auth/callback?code=pkce-code&next=%2Fonboarding"),
  });
  assert.equal(codeResult.location, "https://app.auterim.com/onboarding");
  assert.deepEqual(calls.shift(), { method: "exchangeCodeForSession", code: "pkce-code" });

  const tokenResult = await GET({
    nextUrl: new URL("https://app.auterim.com/auth/callback?next=%2F&token_hash=verified-hash&type=email"),
  });
  assert.equal(tokenResult.location, "https://app.auterim.com/");
  assert.deepEqual(calls.shift(), {
    method: "verifyOtp",
    params: { token_hash: "verified-hash", type: "email" },
  });

  const openRedirectResult = await GET({
    nextUrl: new URL("https://app.auterim.com/auth/callback?code=pkce-code&next=https%3A%2F%2Fevil.example"),
  });
  assert.equal(openRedirectResult.location, "https://app.auterim.com/");
  calls.shift();

  const malformedResult = await GET({
    nextUrl: new URL("https://app.auterim.com/auth/callback?next=%2F"),
  });
  assert.equal(malformedResult.location, "https://app.auterim.com/login?error=invalid_or_expired_link");
  assert.equal(calls.length, 0, "malformed callbacks must not call Supabase or create a session");

  const layout = read("src/app/app/layout.tsx");
  const gateway = read("src/lib/server/app-gateway.ts");
  assert.match(layout, /resolveAppGateway/);
  assert.match(gateway, /provisionInitialWorkspace/);
  assert.match(gateway, /onboardingCompletedAt/);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("signup-confirmation-flow-smoke: URL construction, PKCE exchange, token-hash verification, safe redirects, malformed callback rejection, and onboarding gateway contracts passed.");
