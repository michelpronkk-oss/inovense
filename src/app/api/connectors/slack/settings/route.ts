import { NextRequest, NextResponse } from "next/server";
import { listSlackChannels, SlackExecutionError, validateSlackAlertChannel } from "@/lib/operators/executors/slack";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { loadWorkspacePolicySettings, saveSlackNotificationSettings, type SlackNotificationSettings } from "@/lib/settings/workspace-policy";

type PatchBody = Partial<SlackNotificationSettings> & {
  workspaceId?: string;
  userEmail?: string;
  userId?: string;
};

function boolValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function stringOrNull(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const settings = await loadWorkspacePolicySettings({ supabase, workspaceId: context.workspaceId });
  return NextResponse.json({ settings: settings.slack, customerEmailMode: settings.customerEmailMode });
}

export async function PATCH(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const workspaceId = body.workspaceId?.trim() || "";
  const userId = body.userId?.trim() || "";
  const userEmail = body.userEmail?.trim().toLowerCase() || "";
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) {
    return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  }

  const patch: Partial<SlackNotificationSettings> = {};
  const channelId = stringOrNull(body.slackDefaultChannelId);
  const channelName = stringOrNull(body.slackDefaultChannelName);
  if (channelId !== undefined) patch.slackDefaultChannelId = channelId;
  if (channelName !== undefined) patch.slackDefaultChannelName = channelName;

  for (const key of [
    "slackNotificationsEnabled",
    "slackApprovalAlertsEnabled",
    "notifyOnRevenueApprovalCreated",
    "notifyOnApprovalApproved",
    "notifyOnApprovalRejected",
    "notifyOnExecutionFailed",
  ] as const) {
    const value = boolValue(body[key]);
    if (value !== undefined) patch[key] = value;
  }

  // Track what happened to the selected channel so the UI can show an honest
  // status. Saving a default channel auto-joins public channels first and never
  // saves an unusable channel. No Slack message is sent during setup.
  let channelStatus: string | undefined;
  if (patch.slackDefaultChannelId) {
    try {
      const channels = await listSlackChannels(context.workspaceId);
      const selected = channels.find((channel) => channel.id === patch.slackDefaultChannelId);
      if (!selected) {
        return NextResponse.json({ error: "slack_channel_not_found", message: "Slack channel was not found or is not accessible." }, { status: 404 });
      }
      if (selected.isArchived) {
        return NextResponse.json({ error: "slack_channel_archived", message: "This channel is archived. Choose an active channel for alerts." }, { status: 409 });
      }

      const validation = await validateSlackAlertChannel({
        workspaceId: context.workspaceId,
        channelId: selected.id,
        isPrivate: selected.isPrivate,
        isMember: selected.isMember,
      });

      if (!validation.ready) {
        if (validation.channelType === "private") {
          return NextResponse.json({
            error: "slack_private_channel_invite_required",
            message: "Invite Inovense to this private channel first, then refresh channels.",
            channelStatus: "invite_required",
          }, { status: 409 });
        }
        return NextResponse.json({
          error: "slack_channel_join_failed",
          message: validation.reason === "slack_rate_limited"
            ? "Slack rate limit reached. Try again in a moment."
            : "Inovense could not join this public channel automatically. Try again or pick another channel.",
          channelStatus: "join_failed",
          details: { reason: validation.reason },
        }, { status: 409 });
      }

      patch.slackDefaultChannelName = selected.name;
      channelStatus = validation.channelType === "public" && validation.joined ? "joined_public" : "channel_ready";
    } catch (error) {
      if (error instanceof SlackExecutionError) {
        const missingJoinScope = error.details.code === "missing_channels_join_scope";
        return NextResponse.json({
          error: error.details.code || "slack_channels_failed",
          message: missingJoinScope
            ? "Reconnect Slack with channels:join permission to let Inovense join public channels automatically."
            : error.message,
          channelStatus: missingJoinScope ? "reconnect_required" : undefined,
          details: error.details,
        }, { status: error.details.status ?? 502 });
      }
      return NextResponse.json({ error: "slack_channels_failed", message: "Could not validate Slack channel." }, { status: 502 });
    }
  }

  const settings = await saveSlackNotificationSettings({ supabase, workspaceId: context.workspaceId, patch });
  return NextResponse.json({ settings, channelStatus });
}
