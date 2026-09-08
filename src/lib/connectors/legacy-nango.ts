// Legacy Nango connection detection for connectors that have moved to direct
// provider auth.
//
// HubSpot, Slack, and Trello used to store their connection as an os_connectors row
// carrying a Nango connection id, with the actual provider token held by Nango.
// That token material cannot be safely transferred into Auterim's own
// encrypted credential store: Auterim never negotiated it, cannot prove which
// scopes it carries, and a silent conversion would produce a credential the
// workspace never authorized Auterim to hold directly.
//
// So there is deliberately no conversion. A workspace still on the legacy row
// is reported as reconnect_required with an honest reason, and reconnecting
// through direct OAuth writes an os_connector_credentials row that takes
// precedence. The legacy row is removed at that point, so there is never a
// permanent hybrid where health reads one source and execution reads another.

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type LegacyNangoConnection = {
  present: boolean;
  connectedAt: string | null;
  providerEmail: string | null;
};

const EMPTY: LegacyNangoConnection = { present: false, connectedAt: null, providerEmail: null };

/**
 * True when this workspace still has a pre-migration Nango row for a connector
 * that is now direct-OAuth. Never returns token material.
 */
export async function getLegacyNangoConnection(input: {
  workspaceId: string;
  connectorKey: string;
  supabase?: SupabaseAdmin;
}): Promise<LegacyNangoConnection> {
  if (!input.workspaceId || !input.connectorKey) return EMPTY;
  const supabase = input.supabase ?? createSupabaseAdmin();
  const result = await supabase
    .from("os_connectors")
    .select("status,provider_email,connected_at,nango_connection_id")
    .eq("workspace_id", input.workspaceId)
    .eq("connector_key", input.connectorKey)
    .maybeSingle();
  // A missing table/row or a read failure must never be reported as "legacy
  // connection present" - that would invent a reconnect prompt out of an
  // infrastructure hiccup.
  if (result.error || !result.data) return EMPTY;
  if (!result.data.nango_connection_id) return EMPTY;
  return {
    present: true,
    connectedAt: typeof result.data.connected_at === "string" ? result.data.connected_at : null,
    providerEmail: typeof result.data.provider_email === "string" ? result.data.provider_email : null,
  };
}

/**
 * Remove the legacy Nango row after a successful direct reconnect, so exactly
 * one connection record survives per connector. Best effort: the direct
 * credential already takes precedence everywhere, so a failure here can never
 * produce a wrong health or execution decision.
 */
export async function clearLegacyNangoConnection(input: {
  workspaceId: string;
  connectorKey: string;
  supabase?: SupabaseAdmin;
}): Promise<void> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  try {
    await supabase
      .from("os_connectors")
      .delete()
      .eq("workspace_id", input.workspaceId)
      .eq("connector_key", input.connectorKey);
  } catch {
    /* the direct credential is already the only source execution reads */
  }
}
