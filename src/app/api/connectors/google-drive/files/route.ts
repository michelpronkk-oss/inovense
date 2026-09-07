import { NextRequest, NextResponse } from "next/server";
import { defaultGoogleDriveSettings, getStoredGoogleDriveCredential, listGoogleDriveFilesInFolders, normalizeGoogleDriveFile, resolveGoogleDriveAccessToken, searchGoogleDriveFiles } from "@/lib/connectors/google-drive";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { resolveWorkspaceContext } from "@/lib/os/workspace";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = createSupabaseAdmin(); const context = await resolveWorkspaceContext({ workspaceId: req.nextUrl.searchParams.get("workspaceId") || undefined, supabase });
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const credential = await getStoredGoogleDriveCredential(context.workspaceId, supabase); if (!credential) return NextResponse.json({ error: "Google Drive is not connected." }, { status: 404 });
  const settings = defaultGoogleDriveSettings(credential.metadata); if (!settings.enabled || !settings.folders.length) return NextResponse.json({ error: "Select a Google Drive folder before reading files." }, { status: 409 });
  try { const token = await resolveGoogleDriveAccessToken({ workspaceId: context.workspaceId, credential, supabase }); const query = req.nextUrl.searchParams.get("q")?.trim(); const result = query ? { files: await searchGoogleDriveFiles(token, settings.folders, query, 20), nextPageToken: null } : await listGoogleDriveFilesInFolders(token, settings.folders, { pageToken: req.nextUrl.searchParams.get("pageToken"), modifiedSince: req.nextUrl.searchParams.get("modifiedSince"), maxResults: 50 }); return NextResponse.json({ files: result.files.map((file) => normalizeGoogleDriveFile(file, settings.folders.map((folder) => folder.folderId).join(","))), nextPageToken: result.nextPageToken }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not list Google Drive files." }, { status: 502 }); }
}
