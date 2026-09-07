import { NextRequest, NextResponse } from "next/server";
import { defaultGoogleDriveSettings, getGoogleDriveFileMetadata, getStoredGoogleDriveCredential, hasGoogleDriveScope, resolveGoogleDriveAccessToken, writeGoogleDriveSettings, type GoogleDriveFolderScope } from "@/lib/connectors/google-drive";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { AuthorizationError, requireWorkspaceAdmin } from "@/lib/server/workspace-access";

async function contextFor(req: NextRequest) {
  const supabase = createSupabaseAdmin(); const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  return { supabase, context };
}
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { supabase, context } = await contextFor(req); if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const credential = await getStoredGoogleDriveCredential(context.workspaceId, supabase); const settings = defaultGoogleDriveSettings(credential?.metadata); return NextResponse.json({ googleConnected: Boolean(credential), driveScopeGranted: hasGoogleDriveScope(credential?.scopes), settings });
}
export async function PATCH(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({})) as { workspaceId?: string; enabled?: boolean; folders?: GoogleDriveFolderScope[]; driveId?: string | null };
  const supabase = createSupabaseAdmin(); const context = await resolveWorkspaceContext({ workspaceId: body.workspaceId, supabase }); if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  try { await requireWorkspaceAdmin(context.userId, context.workspaceId, supabase); } catch (error) { return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : "Could not verify workspace permissions." }, { status: error instanceof AuthorizationError ? error.status : 500 }); }
  const credential = await getStoredGoogleDriveCredential(context.workspaceId, supabase); if (!credential) return NextResponse.json({ error: "Connect Google before configuring Drive." }, { status: 409 });
  if (!hasGoogleDriveScope(credential.scopes)) return NextResponse.json({ error: "Drive permission is required. Reconnect Google first." }, { status: 403 });
  let verifiedFolders: GoogleDriveFolderScope[] | undefined;
  if (body.folders) {
    if (!Array.isArray(body.folders) || body.folders.length > 5) return NextResponse.json({ error: "Select no more than five Drive folders." }, { status: 400 });
    try { const token = await resolveGoogleDriveAccessToken({ workspaceId: context.workspaceId, credential, supabase }); verifiedFolders = []; for (const folder of body.folders) { const metadata = await getGoogleDriveFileMetadata(token, folder.folderId); if (metadata.mimeType !== "application/vnd.google-apps.folder" || metadata.trashed) throw new Error("One selected Drive folder is no longer accessible."); verifiedFolders.push({ folderId: metadata.id, folderName: (metadata.name ?? folder.folderName).slice(0, 200), driveId: metadata.driveId ?? folder.driveId ?? null }); } } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify the selected Drive folders." }, { status: 403 }); }
  }
  const metadata = writeGoogleDriveSettings(credential.metadata, {
    enabled: body.enabled ?? (verifiedFolders ? verifiedFolders.length > 0 : undefined),
    folders: verifiedFolders,
    driveId: body.driveId !== undefined ? body.driveId : verifiedFolders ? verifiedFolders[0]?.driveId ?? null : undefined,
  });
  const updated = await supabase.from("os_connector_credentials").update({ metadata }).eq("workspace_id", context.workspaceId).eq("connector_key", "gmail"); if (updated.error) return NextResponse.json({ error: "Could not save Drive settings." }, { status: 500 });
  return NextResponse.json({ settings: defaultGoogleDriveSettings(metadata) });
}
