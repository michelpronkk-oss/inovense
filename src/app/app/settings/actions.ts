"use server";

import { createClient } from "@supabase/supabase-js";
import type { OSSettings, Workspace } from "@/lib/os/types";

type SaveSettingsInput = {
  workspace: Workspace;
  settings: OSSettings;
};

export async function saveWorkspaceSettings(input: SaveSettingsInput): Promise<{ success: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, error: "Supabase config missing." };

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const wsResult = await supabase.from("os_workspaces").upsert({
    id: input.workspace.id,
    name: input.workspace.name,
    environment: input.workspace.environment,
    region: input.workspace.region,
    plan: input.workspace.plan,
  });
  if (wsResult.error) return { success: false, error: wsResult.error.message };

  const settingsResult = await supabase.from("os_workspace_settings").upsert({
    workspace_id: input.workspace.id,
    approval_policy: input.settings.approvalPolicy,
    notifications: input.settings.notifications,
  });
  if (settingsResult.error) return { success: false, error: settingsResult.error.message };

  await supabase.from("os_execution_logs").insert({
    id: `log-settings-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "manual",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: "settings_updated",
    message: `Updated workspace settings for ${input.workspace.name}`,
    duration: "-",
    status: "ok",
  });

  return { success: true };
}

