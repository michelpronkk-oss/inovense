import { NextRequest, NextResponse } from "next/server";
import {
  MicrosoftTeamsGraphError,
  getMicrosoftTeamsScopeState,
  readMicrosoftTeamsSettings,
  writeMicrosoftTeamsSettings,
} from "@/lib/connectors/microsoft-teams";
import { listWorkspaceTeamChannels, listWorkspaceTeams } from "@/lib/operators/executors/microsoft-teams";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { AuthorizationError, requireWorkspaceRoleForIdentity } from "@/lib/server/workspace-access";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

type PatchBody = {
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
  enabled?: boolean;
  defaultTeamId?: string | null;
  defaultChannelId?: string | null;
};

/**
 * Microsoft Teams connector settings.
 *
 * Teams settings live on the shared "microsoft" credential row's metadata, so
 * enabling/disabling Teams never touches the Microsoft 365 mail and calendar
 * access that credential also provides. Reading is member-level; changing what
 * Auterim may do with a connected account is owner/admin only.
 */

async function loadCredential(workspaceId: string, supabase: SupabaseAdmin) {
  const result = await supabase
    .from("os_connector_credentials")
    .select("scopes, metadata")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "microsoft")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ?? null;
}

function scopeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function publicSettings(row: { scopes?: unknown; metadata?: unknown } | null) {
  const settings = readMicrosoftTeamsSettings((row?.metadata ?? null) as Record<string, unknown> | null);
  const scopeState = getMicrosoftTeamsScopeState(scopeArray(row?.scopes));
  return {
    microsoftConnected: Boolean(row),
    enabled: settings.enabled,
    readGranted: scopeState.readGranted,
    sendGranted: scopeState.sendGranted,
    missingScopes: scopeState.missingScopes,
    defaultTeamId: settings.defaultTeamId,
    defaultTeamName: settings.defaultTeamName,
    defaultChannelId: settings.defaultChannelId,
    defaultChannelName: settings.defaultChannelName,
    defaultChannelMembershipType: settings.defaultChannelMembershipType,
  };
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  try {
    return NextResponse.json({ settings: publicSettings(await loadCredential(context.workspaceId, supabase)) });
  } catch {
    return NextResponse.json({ error: "teams_settings_unavailable", message: "Could not load Microsoft Teams settings." }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const workspaceId = body.workspaceId?.trim() || "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  try {
    await requireWorkspaceRoleForIdentity({ userId: context.userId, userEmail: context.userEmail }, context.workspaceId, ["owner", "admin"], supabase);
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ error: "forbidden_role", message: "Only a workspace owner or admin can change Microsoft Teams settings." }, { status });
  }

  let row: { scopes?: unknown; metadata?: unknown } | null;
  try {
    row = await loadCredential(context.workspaceId, supabase);
  } catch {
    return NextResponse.json({ error: "teams_settings_unavailable", message: "Could not load Microsoft Teams settings." }, { status: 502 });
  }
  if (!row) {
    return NextResponse.json({ error: "microsoft_not_connected", message: "Connect Microsoft before configuring Microsoft Teams." }, { status: 409 });
  }

  const current = readMicrosoftTeamsSettings((row.metadata ?? null) as Record<string, unknown> | null);
  const scopeState = getMicrosoftTeamsScopeState(scopeArray(row.scopes));
  const patch: Parameters<typeof writeMicrosoftTeamsSettings>[1] = {};

  if (body.enabled === true) {
    // Teams can never be switched on from settings alone - Microsoft must
    // have granted the Teams read scopes through the consent flow first.
    if (!scopeState.readGranted) {
      return NextResponse.json({
        error: "teams_permission_required",
        message: "Grant Microsoft Teams permissions before enabling Teams.",
        missingScopes: scopeState.missingScopes,
      }, { status: 409 });
    }
    patch.enabled = true;
  }
  if (body.enabled === false) {
    // Disabling Teams is a capability change only. The shared Microsoft
    // credential (and therefore Microsoft 365 mail and calendar) is never
    // deleted here.
    patch.enabled = false;
    patch.defaultTeamId = null;
    patch.defaultTeamName = null;
    patch.defaultChannelId = null;
    patch.defaultChannelName = null;
    patch.defaultChannelMembershipType = null;
  }

  const teamId = body.defaultTeamId === null ? null : body.defaultTeamId?.trim() || undefined;
  const channelId = body.defaultChannelId === null ? null : body.defaultChannelId?.trim() || undefined;

  if (teamId === null) {
    patch.defaultTeamId = null;
    patch.defaultTeamName = null;
    patch.defaultChannelId = null;
    patch.defaultChannelName = null;
    patch.defaultChannelMembershipType = null;
  } else if (teamId || channelId) {
    const targetTeamId = teamId ?? current.defaultTeamId;
    if (!targetTeamId) {
      return NextResponse.json({ error: "teams_team_required", message: "Select a team before selecting a channel." }, { status: 400 });
    }
    try {
      // Resolve the team from the connected account's own joined teams, so a
      // team id the user cannot actually see can never become a destination.
      const joinedTeams = await listWorkspaceTeams(context.workspaceId, supabase);
      const selectedTeam = joinedTeams.find((team) => team.id === targetTeamId);
      if (!selectedTeam) {
        return NextResponse.json({ error: "teams_team_not_found", message: "That Microsoft Teams team was not found or is not accessible." }, { status: 404 });
      }
      const channels = await listWorkspaceTeamChannels(context.workspaceId, targetTeamId, supabase);
      patch.defaultTeamId = targetTeamId;
      patch.defaultTeamName = selectedTeam.displayName;
      if (channelId === null) {
        patch.defaultChannelId = null;
        patch.defaultChannelName = null;
        patch.defaultChannelMembershipType = null;
      } else if (channelId) {
        // Only a channel the connected Microsoft account can actually see may
        // become the allowed destination.
        const selected = channels.find((channel) => channel.id === channelId);
        if (!selected) {
          return NextResponse.json({ error: "teams_channel_not_found", message: "That Microsoft Teams channel was not found or is not accessible." }, { status: 404 });
        }
        patch.defaultChannelId = selected.id;
        patch.defaultChannelName = selected.displayName;
        patch.defaultChannelMembershipType = selected.membershipType;
      }
      if (teamId && teamId !== current.defaultTeamId && channelId === undefined) {
        patch.defaultChannelId = null;
        patch.defaultChannelName = null;
        patch.defaultChannelMembershipType = null;
      }
    } catch (error) {
      if (error instanceof MicrosoftTeamsGraphError) {
        return NextResponse.json({ error: error.details.code, message: error.message }, { status: error.details.status ?? 502 });
      }
      return NextResponse.json({ error: "teams_settings_validation_failed", message: "Could not validate Microsoft Teams settings." }, { status: 502 });
    }
  }

  const metadata = writeMicrosoftTeamsSettings((row.metadata ?? null) as Record<string, unknown> | null, patch);
  const update = await supabase
    .from("os_connector_credentials")
    .update({ metadata })
    .eq("workspace_id", context.workspaceId)
    .eq("connector_key", "microsoft");
  if (update.error) {
    return NextResponse.json({ error: "teams_settings_save_failed", message: "Could not save Microsoft Teams settings." }, { status: 500 });
  }

  await supabase.from("os_execution_logs").insert({
    id: `log-teams-settings-${Date.now()}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    run_id: "connector",
    agent_id: "system",
    agent_mark: "OS",
    agent_color: "#4DE8E1",
    event: body.enabled === false ? "connector.microsoft_teams.disabled" : "connector.microsoft_teams.settings_updated",
    message: body.enabled === false
      ? "Microsoft Teams capability disabled. Microsoft 365 mail and calendar access was not changed."
      : "Microsoft Teams destination settings updated.",
    duration: "-",
    status: "ok",
  });

  return NextResponse.json({ settings: publicSettings({ scopes: row.scopes, metadata }) });
}
