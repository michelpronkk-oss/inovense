"use server";

import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireWorkspaceAdmin, AuthorizationError, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";

export type OnboardingPayload = {
  companyName: string;
  websiteUrl?: string;
  useCase?: string;
  preferredDemoPath?: string;
  safetyMode?: string;
  approvalOwner?: string;
};

export type CompleteOnboardingResult =
  | { ok: true; workspaceId: string; ownerName: string; ownerEmail: string }
  | { ok: false; error: string };

const ONBOARDING_VERSION = 1;

/**
 * Persists onboarding completion server-side (os_workspaces.onboarding_completed_at
 * / onboarding_data). This is the authoritative record checked by the app
 * route guard (src/lib/server/app-gateway.ts) - the client-side OS state
 * (`completeOnboarding` in app-provider) may keep its own cached copy for
 * instant UI feedback, but it is never trusted on its own.
 */
export async function completeOnboardingAction(payload: OnboardingPayload): Promise<CompleteOnboardingResult> {
  const user = await getVerifiedSupabaseUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const admin = createSupabaseAdmin();

  let workspaceId: string | null;
  try {
    workspaceId = await resolveActiveWorkspaceId(user.id, admin);
  } catch {
    return { ok: false, error: "Could not resolve your workspace." };
  }
  if (!workspaceId) {
    return { ok: false, error: "No workspace found for your account yet. Refresh and try again." };
  }

  try {
    await requireWorkspaceAdmin(user.id, workspaceId, admin);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, error: "Only a workspace admin can complete setup." };
    }
    return { ok: false, error: "Could not verify your workspace permissions." };
  }

  const companyName = payload.companyName.trim();
  if (!companyName) return { ok: false, error: "Add a company name to create the workspace." };

  // The first approval owner is always the verified person who created this
  // workspace. It is a safe default, not an onboarding decision that can be
  // spoofed with a client-supplied email address.
  const ownerEmail = user.email ?? "";
  const ownerName =
    (user.user_metadata?.full_name as string | undefined)?.trim()
    || (user.user_metadata?.name as string | undefined)?.trim()
    || ownerEmail.split("@")[0]
    || "Workspace owner";

  const { error } = await admin
    .from("os_workspaces")
    .update({
      name: companyName,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_version: ONBOARDING_VERSION,
      onboarding_data: {
        companyName,
        websiteUrl: payload.websiteUrl ?? "",
        useCase: payload.useCase ?? "",
        preferredDemoPath: payload.preferredDemoPath ?? "",
        safetyMode: payload.safetyMode ?? "",
        approvalOwner: ownerEmail,
      },
    })
    .eq("id", workspaceId);

  if (error) return { ok: false, error: error.message };

  return { ok: true, workspaceId, ownerName, ownerEmail };
}
