import { NextRequest, NextResponse } from "next/server";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { resolveWorkspaceContext } from "@/lib/os/workspace";
import { hubspotRequest, HubSpotExecutionError } from "@/lib/operators/executors/hubspot";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type HubSpotContactsResponse = {
  results?: Array<{ id?: string; properties?: Record<string, string | null> }>;
};

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ status: "disconnected", error: "Supabase is not configured." }, { status: 503 });

  const workspaceId = (req.nextUrl.searchParams.get("workspaceId") || "").trim();
  const connectorKey = (req.nextUrl.searchParams.get("connectorKey") || "").trim();
  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
  if (!workspaceId || connectorKey !== "hubspot") return NextResponse.json({ status: "disconnected", error: "workspaceId and connectorKey=hubspot are required." }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ workspaceId, userId, userEmail, supabase, allowDevFallback: false });
  if (!context.ok) return NextResponse.json({ status: "disconnected", error: context.error }, { status: context.status });

  const definition = getConnectorDefinition("hubspot");
  try {
    const data = await hubspotRequest<HubSpotContactsResponse>(context.workspaceId, "GET", "/crm/v3/objects/contacts?limit=3&properties=email,firstname,lastname,company");
    const contacts = (data.results ?? []).map((contact) => ({
      id: contact.id ?? null,
      email: contact.properties?.email ?? null,
      firstName: contact.properties?.firstname ?? null,
      lastName: contact.properties?.lastname ?? null,
      company: contact.properties?.company ?? null,
    }));
    return NextResponse.json({ status: "healthy", connector: definition?.displayName ?? "HubSpot", provider: "HubSpot", normalized: true, count: contacts.length, contacts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof HubSpotExecutionError ? error.details.statusText || "HubSpot provider check failed." : "HubSpot provider check failed.";
    return NextResponse.json({ status: "provider_error", connector: "HubSpot", message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
