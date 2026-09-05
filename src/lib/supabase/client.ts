"use client";

import { createBrowserClient } from "@supabase/ssr";

export class SupabaseBrowserConfigurationError extends Error {
  constructor() {
    super("Supabase browser configuration is invalid.");
    this.name = "SupabaseBrowserConfigurationError";
  }
}

function readBrowserConfig() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = configuredUrl?.trim();
  const anonKey = configuredAnonKey?.trim();

  // `NEXT_PUBLIC_*` values are compiled into the browser bundle. Keep this
  // validation close to client creation so a bad Vercel environment fails
  // predictably instead of surfacing Supabase's raw `Failed to fetch` text.
  if (!url || !anonKey || configuredUrl !== url || configuredAnonKey !== anonKey) {
    throw new SupabaseBrowserConfigurationError();
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
      throw new Error("Invalid Supabase URL");
    }
  } catch {
    throw new SupabaseBrowserConfigurationError();
  }

  return { url, anonKey };
}

/**
 * Browser Supabase client for the /app auth surface (login, register,
 * forgot/reset password, email verification). Uses the public anon key
 * only - never the service role key. Session cookies are written in the
 * `sb-<ref>-auth-token` format that the server-side verified-identity
 * helpers (`src/lib/os/workspace.ts`, `src/lib/supabase/server.ts`) read.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = readBrowserConfig();
  return createBrowserClient(url, anonKey);
}
