"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { requireInternalAdmin } from "@/lib/admin/auth";
import { getAllowedEarlyAccessTransition, EARLY_ACCESS_STATUSES } from "@/lib/admin/early-access";
import { createEarlyAccessToken, hashEarlyAccessToken, logEarlyAccessInviteEvent } from "@/lib/early-access/invites";
import { renderEarlyAccessInviteEmail } from "@/lib/email/auth-emails";
import { TRANSACTIONAL_FROM } from "@/lib/email/config";
import { appHref } from "@/lib/urls";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

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

function inviteResultForError(message: string): string {
  if (message.includes("early_access_invite_rate_limited")) return "invite-rate-limited";
  if (message.includes("early_access_invite_send_in_progress")) return "invite-send-in-progress";
  if (message.includes("early_access_request_not_reviewable")) return "invite-invalid-status";
  if (message.includes("early_access_request_not_found")) return "unavailable";
  return "invite-unavailable";
}

export async function approveAndSendEarlyAccessInvite(formData: FormData) {
  const admin = await requireInternalAdmin();
  const id = requestId(formData);
  if (!id) redirect("/early-access?result=invalid");
  if (!hasSupabaseAdminConfig()) detailPath(id, "invite-unavailable");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logEarlyAccessInviteEvent("early_access_invite_send_failed", { requestId: id, userId: admin.userId, errorCode: "resend_not_configured" });
    revalidatePath(`/early-access/${id}`);
    detailPath(id, "invite-send-failed");
  }

  const token = createEarlyAccessToken();
  const supabase = await createSupabaseServerActionClient();
  const prepared = await supabase.rpc("prepare_early_access_invite", {
    p_request_id: id,
    p_token_hash: hashEarlyAccessToken(token),
    p_expires_at: new Date(Date.now() + INVITE_LIFETIME_MS).toISOString(),
  });
  if (prepared.error) detailPath(id, inviteResultForError(prepared.error.message ?? ""));
  const invite = Array.isArray(prepared.data) ? prepared.data[0] : prepared.data;
  if (!invite || typeof invite.invite_id !== "string" || typeof invite.request_email !== "string" || typeof invite.request_name !== "string") {
    detailPath(id, "invite-unavailable");
  }

  const inviteId = invite.invite_id as string;
  const isResend = Boolean(invite.is_resend);
  logEarlyAccessInviteEvent("early_access_invite_created", { inviteId, requestId: id, userId: admin.userId });

  const acceptUrl = new URL(appHref("/early-access/accept"));
  acceptUrl.searchParams.set("token", token);
  const message = renderEarlyAccessInviteEmail({ firstName: invite.request_name, acceptUrl: acceptUrl.toString() });
  let sendErrorCode: "resend_not_configured" | "resend_error" | null = null;
  try {
    const delivery = await new Resend(apiKey).emails.send({
      from: TRANSACTIONAL_FROM,
      to: invite.request_email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (delivery.error) sendErrorCode = "resend_error";
  } catch {
    sendErrorCode = "resend_error";
  }

  if (sendErrorCode) {
    try {
      await supabase.rpc("fail_early_access_invite_send", { p_invite_id: inviteId, p_error_code: sendErrorCode });
    } catch {
      // Keep the applicant-facing response generic if cleanup itself fails.
    }
    logEarlyAccessInviteEvent("early_access_invite_send_failed", { inviteId, requestId: id, userId: admin.userId, errorCode: sendErrorCode });
    revalidatePath("/early-access");
    revalidatePath(`/early-access/${id}`);
    detailPath(id, "invite-send-failed");
  }

  const finalized = await supabase.rpc("finalize_early_access_invite_send", { p_invite_id: inviteId });
  if (finalized.error || finalized.data !== true) {
    // The provider accepted the send but the database confirmation is
    // uncertain. Keep the pending record unusable and tell the admin to
    // refresh before trying again. A later retry rotates it safely.
    console.warn("[early_access_invite_finalize_uncertain]", JSON.stringify({ inviteId, requestId: id, userId: admin.userId }));
    revalidatePath(`/early-access/${id}`);
    detailPath(id, "invite-send-finalizing");
  }

  logEarlyAccessInviteEvent("early_access_invite_sent", { inviteId, requestId: id, userId: admin.userId });
  if (isResend) logEarlyAccessInviteEvent("early_access_invite_resent", { inviteId, requestId: id, userId: admin.userId });
  revalidatePath("/early-access");
  revalidatePath(`/early-access/${id}`);
  revalidatePath("/");
  detailPath(id, isResend ? "invite-resent" : "invite-sent");
}

export async function revokeEarlyAccessInvite(formData: FormData) {
  const admin = await requireInternalAdmin();
  const inviteIdValue = formData.get("inviteId");
  const inviteId = typeof inviteIdValue === "string" && /^[0-9a-f-]{36}$/i.test(inviteIdValue) ? inviteIdValue : null;
  if (!inviteId) redirect("/early-access?result=invalid");
  if (!hasSupabaseAdminConfig()) redirect("/early-access?result=invite-revoke-failed");

  const inviteLookup = await createSupabaseAdmin().from("os_early_access_invites").select("request_id").eq("id", inviteId).maybeSingle();
  if (inviteLookup.error || !inviteLookup.data?.request_id) redirect("/early-access?result=invite-revoke-failed");
  const requestIdValue = String(inviteLookup.data.request_id);

  const supabase = await createSupabaseServerActionClient();
  const result = await supabase.rpc("revoke_early_access_invite", { p_invite_id: inviteId });
  if (result.error) {
    const message = result.error.message ?? "";
    detailPath(requestIdValue, message.includes("already_accepted") ? "invite-already-accepted" : "invite-revoke-failed");
  }
  if (result.data !== requestIdValue) detailPath(requestIdValue, "invite-revoke-failed");
  logEarlyAccessInviteEvent("early_access_invite_revoked", { inviteId, requestId: requestIdValue, userId: admin.userId });
  revalidatePath("/early-access");
  revalidatePath(`/early-access/${requestIdValue}`);
  detailPath(requestIdValue, "invite-revoked");
}
