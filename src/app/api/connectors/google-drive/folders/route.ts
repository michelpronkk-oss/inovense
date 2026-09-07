import { NextRequest, NextResponse } from "next/server";
import { getStoredGoogleDriveCredential, listGoogleDriveFolders, resolveGoogleDriveAccessToken } from "@/lib/connectors/google-drive";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { AuthorizationError, requireWorkspaceAdmin } from "@/lib/server/workspace-access";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = createSupabaseAdmin(); const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  try { await requireWorkspaceAdmin(context.userId, context.workspaceId, supabase); } catch (error) { return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : "Could not verify workspace permissions." }, { status: error instanceof AuthorizationError ? error.status : 500 }); }
  const credential = await getStoredGoogleDriveCredential(context.workspaceId, supabase); if (!credential) return NextResponse.json({ error: "Connect Google before selecting a Drive folder." }, { status: 404 });
  try { const token = await resolveGoogleDriveAccessToken({ workspaceId: context.workspaceId, credential, supabase }); const result = await listGoogleDriveFolders(token, { parentId: req.nextUrl.searchParams.get("parentId"), driveId: req.nextUrl.searchParams.get("driveId"), pageToken: req.nextUrl.searchParams.get("pageToken"), maxResults: 50 }); return NextResponse.json({ folders: result.folders.map((folder) => ({ folderId: folder.id, folderName: folder.name, driveId: folder.driveId ?? null })), nextPageToken: result.nextPageToken }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not list Google Drive folders." }, { status: 502 }); }
}
