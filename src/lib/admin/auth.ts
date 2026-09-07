import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

export type InternalAdminRole = "super_admin" | "ops" | "support" | "finance" | "viewer";
export type InternalAdmin = { userId: string; email: string; role: InternalAdminRole };

/** Server-only, fail-closed authorization. Workspace membership is never consulted. */
export const getInternalAdmin = cache(async (): Promise<InternalAdmin | null> => {
  if (!hasSupabaseAdminConfig()) return null;
  const user = await getVerifiedSupabaseUser().catch(() => null);
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) return null;
  const { data, error } = await createSupabaseAdmin()
    .from("os_internal_admins")
    .select("user_id,email,role,is_active")
    .eq("is_active", true)
    .or(`user_id.eq.${user.id},email.ilike.${email}`)
    .limit(2);
  if (error || !data?.length) return null;
  const record = data.find((item) => item.user_id === user.id || String(item.email).toLowerCase() === email);
  if (!record) return null;
  return { userId: user.id, email, role: record.role as InternalAdminRole };
});

export async function requireInternalAdmin(): Promise<InternalAdmin> {
  const admin = await getInternalAdmin();
  if (!admin) redirect("/login");
  return admin;
}
