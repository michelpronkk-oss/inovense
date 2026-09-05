"use server";

import { getVerifiedSupabaseUser } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireWorkspaceAdmin, AuthorizationError, resolveActiveWorkspaceId } from "@/lib/server/workspace-access";

export type OnboardingDraft = { fullName: string; workspaceName: string; websiteUrl: string; industry: string; teamSize: string; priority: "revenue" | "client_flow" | "operations" | ""; systems: string[]; step: number };
export type OnboardingResult = { ok: true; workspaceId: string; ownerEmail: string; ownerName: string } | { ok: false; error: string };
const ONBOARDING_VERSION = 2;

function cleanDraft(input: Partial<OnboardingDraft>): OnboardingDraft {
  return { fullName: input.fullName?.trim() ?? "", workspaceName: input.workspaceName?.trim() ?? "", websiteUrl: input.websiteUrl?.trim() ?? "", industry: input.industry?.trim() ?? "", teamSize: input.teamSize?.trim() ?? "", priority: input.priority === "revenue" || input.priority === "client_flow" || input.priority === "operations" ? input.priority : "", systems: Array.isArray(input.systems) ? input.systems.filter((item) => ["gmail", "hubspot", "slack", "trello"].includes(item)) : [], step: Math.min(5, Math.max(1, Number(input.step) || 1)) };
}

async function authorizedWorkspace() {
  const user = await getVerifiedSupabaseUser();
  if (!user) return { error: "Sign in to continue." } as const;
  const admin = createSupabaseAdmin();
  const workspaceId = await resolveActiveWorkspaceId(user.id, admin);
  if (!workspaceId) return { error: "No workspace found for your account yet. Refresh and try again." } as const;
  try { await requireWorkspaceAdmin(user.id, workspaceId, admin); } catch (error) { return { error: error instanceof AuthorizationError ? "Only a workspace admin can complete setup." : "Could not verify your workspace permissions." } as const; }
  return { user, admin, workspaceId } as const;
}

export async function getOnboardingDraftAction(): Promise<{ ok: true; draft: OnboardingDraft } | { ok: false; error: string }> {
  const access = await authorizedWorkspace();
  if ("error" in access) return { ok: false, error: access.error ?? "Could not access your workspace." };
  const [workspaceResult, profileResult] = await Promise.all([
    access.admin.from("os_workspaces").select("name,onboarding_data").eq("id", access.workspaceId).single(),
    access.admin.from("os_user_profiles").select("full_name").eq("user_id", access.user.id).maybeSingle(),
  ]);
  if (workspaceResult.error) return { ok: false, error: workspaceResult.error.message };
  const data = (workspaceResult.data.onboarding_data ?? {}) as Record<string, unknown>;
  const metadataName = (access.user.user_metadata?.full_name as string | undefined) ?? (access.user.user_metadata?.name as string | undefined) ?? "";
  return { ok: true, draft: cleanDraft({ fullName: profileResult.data?.full_name ?? metadataName, workspaceName: workspaceResult.data.name, websiteUrl: typeof data.website === "string" ? data.website : typeof data.websiteUrl === "string" ? data.websiteUrl : "", industry: typeof data.industry === "string" ? data.industry : "", teamSize: typeof data.team_size === "string" ? data.team_size : "", priority: typeof data.first_priority === "string" ? data.first_priority as OnboardingDraft["priority"] : "", systems: Array.isArray(data.systems) ? data.systems.filter((v): v is string => typeof v === "string") : [], step: typeof data.onboarding_step === "number" ? data.onboarding_step : 1 }) };
}

export async function saveOnboardingDraftAction(input: Partial<OnboardingDraft>): Promise<OnboardingResult> {
  const access = await authorizedWorkspace();
  if ("error" in access) return { ok: false, error: access.error ?? "Could not access your workspace." };
  const draft = cleanDraft(input);
  const current = await access.admin.from("os_workspaces").select("onboarding_data").eq("id", access.workspaceId).single();
  if (current.error) return { ok: false, error: current.error.message };
  const onboardingData = { ...(current.data.onboarding_data ?? {}), website: draft.websiteUrl, industry: draft.industry, team_size: draft.teamSize, first_priority: draft.priority, recommended_operator: draft.priority ? ({ revenue: "Revenue Operator", client_flow: "Client Flow Operator", operations: "Operations Operator" }[draft.priority]) : "", systems: draft.systems, onboarding_step: draft.step };
  const workspaceUpdate = await access.admin.from("os_workspaces").update({ ...(draft.workspaceName ? { name: draft.workspaceName } : {}), onboarding_data: onboardingData }).eq("id", access.workspaceId);
  if (workspaceUpdate.error) return { ok: false, error: workspaceUpdate.error.message };
  if (draft.fullName) {
    const profile = await access.admin.from("os_user_profiles").update({ full_name: draft.fullName }).eq("user_id", access.user.id);
    if (profile.error) return { ok: false, error: profile.error.message };
    await access.admin.from("os_workspace_members").update({ full_name: draft.fullName }).eq("workspace_id", access.workspaceId).eq("user_id", access.user.id);
  }
  return { ok: true, workspaceId: access.workspaceId, ownerEmail: access.user.email ?? "", ownerName: draft.fullName || "Workspace owner" };
}

export async function completeOnboardingAction(input: OnboardingDraft): Promise<OnboardingResult> {
  const draft = cleanDraft({ ...input, step: 5 });
  if (!draft.fullName || !draft.workspaceName || !draft.industry || !draft.teamSize || !draft.priority) return { ok: false, error: "Complete the required profile details before activating." };
  const saved = await saveOnboardingDraftAction(draft);
  if (!saved.ok) return saved;
  const access = await authorizedWorkspace();
  if ("error" in access) return { ok: false, error: access.error ?? "Could not access your workspace." };
  const activated = await access.admin.from("os_workspaces").update({ onboarding_completed_at: new Date().toISOString(), onboarding_version: ONBOARDING_VERSION }).eq("id", access.workspaceId).is("onboarding_completed_at", null);
  if (activated.error) return { ok: false, error: activated.error.message };

  // The onboarding brief is the first trusted company context. It is
  // server-written with a stable ID so retries update this brief rather than
  // multiplying memory entries.
  const priorityLabel = { revenue: "New leads", client_flow: "Client handoffs", operations: "Operations" }[draft.priority];
  const memory = await access.admin.from("os_memory_entries").upsert({
    id: `mem-onboarding-${access.workspaceId}`,
    workspace_id: access.workspaceId,
    type: "process",
    label: `${draft.workspaceName} operating brief`,
    summary: `${priorityLabel} is the first operating priority.`,
    content: [
      `Workspace: ${draft.workspaceName}`,
      `Industry: ${draft.industry}`,
      `Team size: ${draft.teamSize}`,
      `Website: ${draft.websiteUrl || "Not provided"}`,
      `First priority: ${priorityLabel}`,
      `Relevant systems: ${draft.systems.length ? draft.systems.join(", ") : "Not provided"}`,
      "Source: owner-confirmed onboarding.",
    ].join("\n"),
    tags: ["onboarding", draft.priority, ...draft.systems],
    agent_scope: [draft.priority],
    field_count: 6,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (memory.error) return { ok: false, error: memory.error.message };

  return saved;
}
