import { NextResponse } from "next/server";
import { websiteAccess, websiteErrorResponse, readWebsiteJson } from "@/lib/connectors/website-route-auth";
import { issueWebsiteVerificationChallenge, verifyWebsiteChallenge } from "@/lib/connectors/website-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readWebsiteJson(request);
    if (!body) return NextResponse.json({ error: "Invalid or oversized request." }, { status: 400 });
    const access = await websiteAccess({ workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined, admin: true });
    if (body.action === "challenge") {
      const method = body.method === "dns_txt" || body.method === "html_meta" || body.method === "html_file" ? body.method : "dns_txt";
      return NextResponse.json(await issueWebsiteVerificationChallenge({ workspaceId: access.workspaceId, sourceId: String(body.sourceId ?? ""), method, supabase: access.supabase }));
    }
    if (body.action === "verify" && typeof body.challengeId === "string" && typeof body.sourceId === "string" && typeof body.token === "string") {
      return NextResponse.json({ ok: true, source: await verifyWebsiteChallenge({ workspaceId: access.workspaceId, sourceId: body.sourceId, challengeId: body.challengeId, token: body.token, supabase: access.supabase }) });
    }
    return NextResponse.json({ error: "Unsupported website verification action." }, { status: 400 });
  } catch (error) { return websiteErrorResponse(error); }
}
