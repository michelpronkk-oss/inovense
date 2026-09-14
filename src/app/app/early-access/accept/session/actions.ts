"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EARLY_ACCESS_INVITE_COOKIE, isEarlyAccessToken, logEarlyAccessInviteEvent } from "@/lib/early-access/invites";
import { createSupabaseServerActionClient, getVerifiedSupabaseUser } from "@/lib/supabase/server";

const SESSION_PATH = "/early-access/accept/session";
const COOKIE_PATH = "/early-access/accept";

function clearInviteCookie(store: Awaited<ReturnType<typeof cookies>>) {
  store.set(EARLY_ACCESS_INVITE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

export async function switchEarlyAccessAccountAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EARLY_ACCESS_INVITE_COOKIE)?.value;
  const returnPath = isEarlyAccessToken(token) ? `/early-access/accept?token=${encodeURIComponent(token)}` : SESSION_PATH;
  const supabase = await createSupabaseServerActionClient();
  await supabase.auth.signOut();
  redirect(`/login?from=${encodeURIComponent(returnPath)}`);
}

export async function acceptEarlyAccessInviteAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EARLY_ACCESS_INVITE_COOKIE)?.value;
  if (!isEarlyAccessToken(token)) redirect(`${SESSION_PATH}?error=invalid`);
  const returnPath = `/early-access/accept?token=${encodeURIComponent(token)}`;
  const user = await getVerifiedSupabaseUser().catch(() => null);
  if (!user) redirect(`/login?from=${encodeURIComponent(returnPath)}`);

  const supabase = await createSupabaseServerActionClient();
  const { data, error } = await supabase.rpc("accept_early_access_invite", { p_token: token });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("early_access_invite_expired")) {
      logEarlyAccessInviteEvent("early_access_invite_expired");
      redirect(`${SESSION_PATH}?error=expired`);
    }
    if (message.includes("early_access_invite_revoked")) redirect(`${SESSION_PATH}?error=revoked`);
    if (message.includes("early_access_invite_email_mismatch")) redirect(`${SESSION_PATH}?error=email-mismatch`);
    if (message.includes("early_access_email_not_verified")) redirect(`${SESSION_PATH}?error=email-unverified`);
    if (message.includes("early_access_invite_already_accepted")) redirect(`${SESSION_PATH}?error=accepted`);
    redirect(`${SESSION_PATH}?error=unavailable`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.workspace_id !== "string") redirect(`${SESSION_PATH}?error=unavailable`);

  clearInviteCookie(cookieStore);
  logEarlyAccessInviteEvent("early_access_invite_accepted", {
    userId: user.id,
    workspaceId: row.workspace_id,
  });
  // Enter through the canonical onboarding route. The app gateway still
  // sends a previously completed workspace to its normal home and never
  // starts a trial.
  redirect("/onboarding");
}

export async function continueAfterAcceptedEarlyAccessInviteAction() {
  const user = await getVerifiedSupabaseUser().catch(() => null);
  const cookieStore = await cookies();
  const token = cookieStore.get(EARLY_ACCESS_INVITE_COOKIE)?.value;
  if (!isEarlyAccessToken(token)) redirect(`${SESSION_PATH}?error=invalid`);
  if (!user) redirect(`/login?from=${encodeURIComponent(`/early-access/accept?token=${token}`)}`);

  // Recheck through the same idempotent RPC before clearing the replayed
  // bearer. It returns the already-linked workspace only to the user who
  // originally accepted this invite.
  const supabase = await createSupabaseServerActionClient();
  const { data, error } = await supabase.rpc("accept_early_access_invite", { p_token: token });
  if (error) redirect(`${SESSION_PATH}?error=unavailable`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.already_accepted !== true || typeof row.workspace_id !== "string") {
    redirect(`${SESSION_PATH}?error=accepted`);
  }

  clearInviteCookie(cookieStore);
  logEarlyAccessInviteEvent("early_access_invite_accepted", { userId: user.id, workspaceId: row.workspace_id });
  redirect("/onboarding");
}
