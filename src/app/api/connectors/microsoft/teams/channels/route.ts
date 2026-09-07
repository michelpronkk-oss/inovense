import { NextRequest, NextResponse } from "next/server";
import { MicrosoftTeamsGraphError } from "@/lib/connectors/microsoft-teams";
import { listWorkspaceTeamChannels, listWorkspaceTeams } from "@/lib/operators/executors/microsoft-teams";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

/**
 * Read-only Teams discovery for the connector settings UI: the joined teams
 * for the connected Microsoft account, and the channels of one team.
 *
 * Read-only, so workspace membership (not admin) is enough. Never returns
 * tokens, and never returns message content.
 */
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const teamId = (req.nextUrl.searchParams.get("teamId") || "").trim();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  try {
    if (teamId) {
      const channels = await listWorkspaceTeamChannels(context.workspaceId, teamId, supabase);
      return NextResponse.json({ channels });
    }
    const teams = await listWorkspaceTeams(context.workspaceId, supabase);
    return NextResponse.json({ teams });
  } catch (error) {
    if (error instanceof MicrosoftTeamsGraphError) {
      return NextResponse.json({ error: error.details.code, message: error.message }, { status: error.details.status ?? 502 });
    }
    return NextResponse.json({ error: "teams_request_failed", message: "Could not load Microsoft Teams data." }, { status: 502 });
  }
}
