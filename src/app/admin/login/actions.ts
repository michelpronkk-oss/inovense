"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerActionClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("auterim_admin_session");
  cookieStore.delete("inovense_admin_session");
  redirect("/login");
}
