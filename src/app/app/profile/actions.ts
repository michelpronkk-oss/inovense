"use server";

import { createClient } from "@supabase/supabase-js";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceMember, AuthorizationError } from "@/lib/server/workspace-access";

type SaveProfileInput = {
  workspaceId: string;
  /**
   * @deprecated no longer trusted. A user may only ever update their own
   * profile - the target user id always comes from the verified session.
   */
  userId: string;
  name: string;
  email: string;
  roleLabel: string;
  initials: string;
  notifications: {
    approvals: boolean;
    digest: boolean;
    alerts: boolean;
  };
  dashboard: {
    timeRange: "24h" | "7d" | "30d" | "quarter";
    viewMode: "operator" | "workflow";
  };
};

export async function saveProfileSettings(input: SaveProfileInput): Promise<{ success: boolean; message: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, message: "Profile storage is not configured. Your changes were not saved." };

  // A profile can only ever be edited by its own (verified) owner. The
  // client-supplied userId is intentionally ignored to prevent one user
  // from overwriting another user's profile by guessing their id.
  const verifiedUser = await getVerifiedSupabaseUser();
  if (!verifiedUser) {
    return { success: true, message: "Saved locally. Sign in to sync your profile." };
  }

  try {
    await requireWorkspaceMember(verifiedUser.id, input.workspaceId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, message: "You are not a member of this workspace." };
    }
    return { success: false, message: "Could not verify your workspace membership." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const userId = verifiedUser.id;

  const profileUpsert = await supabase.from("os_user_profiles").upsert({
    user_id: userId,
    workspace_id: input.workspaceId,
    full_name: input.name,
    role_label: input.roleLabel,
    initials: input.initials,
    notification_approvals: input.notifications.approvals,
    notification_digest: input.notifications.digest,
    notification_alerts: input.notifications.alerts,
  });
  if (profileUpsert.error) return { success: false, message: profileUpsert.error.message };

  // `os_workspace_members.full_name` is the source used during workspace
  // hydration. Keep it in sync with the personal profile, but never accept
  // a client-supplied role or membership target.
  const memberUpdate = await supabase
    .from("os_workspace_members")
    .update({ full_name: input.name })
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", userId);
  if (memberUpdate.error) return { success: false, message: memberUpdate.error.message };

  const prefUpsert = await supabase.from("os_dashboard_preferences").upsert({
    workspace_id: input.workspaceId,
    user_id: userId,
    time_range: input.dashboard.timeRange,
    view_mode: input.dashboard.viewMode,
  });
  if (prefUpsert.error) return { success: false, message: prefUpsert.error.message };

  await supabase.from("os_execution_logs").insert({
    id: `log-profile-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "manual",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "profile_updated",
    message: `Updated profile for ${input.email}`,
    duration: "-",
    status: "ok",
  });

  return { success: true, message: "Profile saved." };
}
