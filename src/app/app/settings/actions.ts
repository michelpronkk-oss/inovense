"use server";

import { createClient } from "@supabase/supabase-js";
import type { OSSettings, Workspace } from "@/lib/os/types";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";

type SaveSettingsInput = {
  workspace: Workspace;
  settings: OSSettings;
};

export async function saveWorkspaceSettings(input: SaveSettingsInput): Promise<{ success: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { success: false, error: "Supabase config missing." };

  // Workspace configuration is an admin/owner-only action. Identity and
  // authorization are re-derived from the verified session - the client
  // supplied `input.workspace.id` is only used as the target to check
  // membership against, never trusted on its own.
  const verifiedUser = await getVerifiedSupabaseUser();
  if (!verifiedUser) return { success: false, error: "Sign in to update workspace settings." };

  try {
    await requireWorkspaceAdmin(verifiedUser.id, input.workspace.id);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: "You do not have permission to update this workspace." };
    }
    return { success: false, error: "Could not verify your workspace permissions." };
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const wsResult = await supabase.from("os_workspaces").upsert({
    id: input.workspace.id,
    name: input.workspace.name,
    environment: input.workspace.environment,
    region: input.workspace.region,
    logo_url: input.workspace.logoUrl ?? null,
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
