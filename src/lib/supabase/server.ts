import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client bound to the request's cookies, for use in
 * Server Components, Route Handlers, and Server Actions on the /app auth
 * surface (login, register, forgot/reset password, email verification,
 * logout). Uses the public anon key plus the caller's session cookie -
 * never the service role key - so all reads/writes still go through
 * Supabase Auth + RLS as the signed-in user.
 *
 * In a plain Server Component render, Next.js does not allow setting
 * cookies, so `set`/`remove` are wrapped in a try/catch. Session refresh in
 * that case is a no-op for that render; middleware/route handlers that can
 * set cookies keep the session current.
 */
export async function createSupabaseServerActionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing).");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render where cookies cannot be
          // mutated. Safe to ignore - only session refresh is skipped.
        }
      },
    },
  });
}

/**
 * Returns the verified Supabase auth user for the current request, or null.
 * Always calls `auth.getUser()` (verifies the JWT against Supabase Auth),
 * never trusts a locally-decoded session/cookie value.
 */
export async function getVerifiedSupabaseUser() {
  const supabase = await createSupabaseServerActionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
