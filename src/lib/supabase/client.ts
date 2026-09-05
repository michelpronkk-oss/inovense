"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client for the /app auth surface (login, register,
 * forgot/reset password, email verification). Uses the public anon key
 * only - never the service role key. Session cookies are written in the
 * `sb-<ref>-auth-token` format that the server-side verified-identity
 * helpers (`src/lib/os/workspace.ts`, `src/lib/supabase/server.ts`) read.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing).");
  }
  return createBrowserClient(url, anonKey);
}
