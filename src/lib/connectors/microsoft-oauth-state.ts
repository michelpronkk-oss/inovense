import "server-only";

import { createPkceCodeChallenge, hashOAuthState } from "@/lib/connectors/oauth-state";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export async function persistMicrosoftOAuthState(input: {
  state: string;
  nonce: string;
  workspaceId: string;
  userEmail: string;
  scopeProfile: "base" | "teams";
  codeChallenge: string;
  supabase: SupabaseAdmin;
}): Promise<void> {
  const result = await input.supabase.from("os_microsoft_oauth_states").insert({
    state_hash: hashOAuthState(input.state),
    nonce: input.nonce,
    workspace_id: input.workspaceId,
    user_email: input.userEmail.toLowerCase(),
    scope_profile: input.scopeProfile,
    code_challenge: input.codeChallenge,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (result.error) throw new Error("microsoft_oauth_state_persist_failed");
}

export async function consumeMicrosoftOAuthState(input: {
  state: string;
  nonce: string;
  codeVerifier: string;
  supabase: SupabaseAdmin;
}): Promise<boolean> {
  const challenge = createPkceCodeChallenge(input.codeVerifier);
  const result = await input.supabase.from("os_microsoft_oauth_states").update({ consumed_at: new Date().toISOString() })
    .eq("state_hash", hashOAuthState(input.state))
    .eq("nonce", input.nonce)
    .eq("code_challenge", challenge)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("state_hash")
    .maybeSingle();
  if (result.error) throw new Error("microsoft_oauth_state_consume_failed");
  return Boolean(result.data);
}
