"use server";

import { createClient } from "@supabase/supabase-js";

type SaveProfileInput = {
  workspaceId: string;
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

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function saveProfileSettings(input: SaveProfileInput): Promise<{ success: boolean; message: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: true, message: "Saved locally. Server sync is not configured." };

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  if (!isUuid(input.userId)) {
    return { success: true, message: "Saved locally. Connect authenticated user to sync profile." };
  }

  const profileUpsert = await supabase.from("os_user_profiles").upsert({
    user_id: input.userId,
    workspace_id: input.workspaceId,
    full_name: input.name,
    role_label: input.roleLabel,
    initials: input.initials,
    notification_approvals: input.notifications.approvals,
    notification_digest: input.notifications.digest,
    notification_alerts: input.notifications.alerts,
  });
  if (profileUpsert.error) return { success: false, message: profileUpsert.error.message };

  const prefUpsert = await supabase.from("os_dashboard_preferences").upsert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
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

