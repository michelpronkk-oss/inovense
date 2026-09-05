import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { requireWorkspaceAdmin, AuthorizationError } from "@/lib/server/workspace-access";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const FILE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const user = await getVerifiedSupabaseUser();
  if (!user) return NextResponse.json({ error: "Sign in to update workspace identity." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const workspaceId = typeof form?.get("workspaceId") === "string" ? String(form.get("workspaceId")).trim() : "";
  const file = form?.get("file");
  if (!workspaceId || !(file instanceof File)) return NextResponse.json({ error: "A workspace and image file are required." }, { status: 400 });
  if (!FILE_TYPES[file.type] || file.size === 0 || file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "Use a PNG, JPG, WebP, or SVG logo up to 2 MB." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  try {
    await requireWorkspaceAdmin(user.id, workspaceId, supabase);
  } catch (error) {
    const message = error instanceof AuthorizationError ? error.message : "Could not verify workspace permissions.";
    return NextResponse.json({ error: message }, { status: error instanceof AuthorizationError ? error.status : 500 });
  }

  const extension = FILE_TYPES[file.type];
  const path = `${workspaceId}/identity.${extension}`;
  const upload = await supabase.storage.from("workspace-assets").upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: true,
    cacheControl: "3600",
  });
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from("workspace-assets").getPublicUrl(path);
  const logoUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
  const update = await supabase.from("os_workspaces").update({ logo_url: logoUrl }).eq("id", workspaceId);
  if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });

  return NextResponse.json({ logoUrl });
}
