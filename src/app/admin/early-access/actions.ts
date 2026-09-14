"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireInternalAdmin } from "@/lib/admin/auth";
import { getAllowedEarlyAccessTransition, EARLY_ACCESS_STATUSES } from "@/lib/admin/early-access";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

function requestId(formData: FormData) {
  const id = formData.get("id");
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

function detailPath(id: string, result: string): never {
  redirect(`/early-access/${id}?result=${encodeURIComponent(result)}`);
}

export async function updateEarlyAccessStatus(formData: FormData) {
  const admin = await requireInternalAdmin();
  const id = requestId(formData);
  const requestedStatus = formData.get("status");
  if (!id || typeof requestedStatus !== "string" || !EARLY_ACCESS_STATUSES.includes(requestedStatus as never) || !hasSupabaseAdminConfig()) {
    if (id) detailPath(id, "invalid");
    redirect("/early-access?result=invalid");
  }

  const db = createSupabaseAdmin();
  const current = await db.from("os_early_access_requests").select("status").eq("id", id).maybeSingle();
  if (current.error || !current.data) detailPath(id, "unavailable");
  const nextStatus = getAllowedEarlyAccessTransition(String(current.data.status), requestedStatus);
  if (!nextStatus) detailPath(id, "invalid-transition");

  const result = await db.from("os_early_access_requests").update({
    status: nextStatus,
    reviewed_at: new Date().toISOString(),
    reviewed_by: admin.userId,
  }).eq("id", id).eq("status", current.data.status).select("id").maybeSingle();
  if (result.error || !result.data) detailPath(id, "conflict");
  revalidatePath("/early-access");
  revalidatePath(`/early-access/${id}`);
  revalidatePath("/");
  detailPath(id, "status-updated");
}

export async function updateEarlyAccessNotes(formData: FormData) {
  const admin = await requireInternalAdmin();
  const id = requestId(formData);
  const notesValue = formData.get("notes");
  if (!id || typeof notesValue !== "string" || notesValue.length > 5000 || !hasSupabaseAdminConfig()) {
    if (id) detailPath(id, "invalid-notes");
    redirect("/early-access?result=invalid");
  }
  const db = createSupabaseAdmin();
  const result = await db.from("os_early_access_requests").update({
    notes: notesValue.trim() || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: admin.userId,
  }).eq("id", id).select("id").maybeSingle();
  if (result.error || !result.data) detailPath(id, "save-failed");
  revalidatePath("/early-access");
  revalidatePath(`/early-access/${id}`);
  detailPath(id, "notes-saved");
}
