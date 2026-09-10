import { NextRequest, NextResponse } from "next/server";
import { applyConnectorTruthToState, getConnectorTruth } from "@/lib/connectors/truth";
import { isSupportedNangoConnector } from "@/lib/connectors/registry";
import { buildSeedState, reconcileConnectorsWithRegistry } from "@/lib/os/seed";
import type { OSState } from "@/lib/os/types";
import { resolveWorkspaceContext, type WorkspaceContext } from "@/lib/os/workspace";
import { APP_SESSION_COOKIE, createSessionToken, SESSION_MAX_AGE_SEC } from "@/lib/session";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";
import { roleLabel } from "@/lib/workspace-permissions";
import { normalizeMemoryRow, resolveMemoryEntries, type MemoryRow } from "@/lib/memory/model";

type JsonRecord = Record<string, unknown>;

class StateRouteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function asState(value: unknown): OSState | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Partial<OSState>;
  if (!rec.workspace || !rec.currentUser || !Array.isArray(rec.connectors) || !Array.isArray(rec.agents)) {
    return null;
  }
  return rec as OSState;
}

function stringSettings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === "string"),
  ) as Record<string, string>;
}

function workspaceUpdateFromState(state: OSState) {
  return {
    id: state.workspace.id,
    name: state.workspace.name,
    environment: state.workspace.environment,
    region: state.workspace.region,
    logo_url: state.workspace.logoUrl ?? null,
    updated_at: new Date().toISOString(),
  };
}

const BILLING_WORKSPACE_KEYS: (keyof OSState["workspace"])[] = [
  "plan",
  "planTier",
  "billingStatus",
  "trialEndsAt",
  "dodoCustomerId",
  "dodoSubscriptionId",
  "dodoProductId",
];

function stripSnapshotTruth(state: OSState): OSState {
  const safeWorkspace = { ...state.workspace };
  for (const key of BILLING_WORKSPACE_KEYS) {
    delete safeWorkspace[key];
  }

  return {
    ...state,
    workspace: safeWorkspace,
    connectors: reconcileConnectorsWithRegistry(state.connectors).map((connector) => {
      if (connector.id !== "gmail" && connector.id !== "microsoft" && !isSupportedNangoConnector(connector.id)) return connector;
      return {
        ...connector,
        isConnected: false,
        status: "available",
        health: "disabled",
        lastSync: "-",
        lastSynced: "",
        eventsSynced: 0,
        records: "Not connected",
        source: undefined,
      };
    }),
  };
}

function initialsFor(name: string) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "A";
}

function isLegacySeedIdentity(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized === "workspace admin" || normalized === "admin" || normalized === "admin@workspace.com";
}

function roleLabelFor(roleKey: string | null | undefined, legacyRole: string | null | undefined) {
  return roleLabel(roleKey, legacyRole);
}

async function loadWorkspaceMemory(supabase: ReturnType<typeof createSupabaseAdmin>, workspaceId: string): Promise<{ data: MemoryRow[]; error: unknown }> {
  const extended = await supabase
    .from("os_memory_entries")
    .select("id,type,category,canonical_key,label,summary,content,tags,agent_scope,field_count,source_type,source_label,source_ref,source_connector,source_entity_id,reliability,confidence,first_observed_at,last_observed_at,last_confirmed_at,stale_after,operator_relevance,policy_relevant,evidence,supersedes_id,updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (!extended.error) return { data: (extended.data ?? []) as MemoryRow[], error: null };

  // Keep rollout safe when the application is deployed before the additive
  // migration reaches a database replica. The legacy row still renders, but
  // the governed fields are supplied by the adapter defaults.
  const legacy = await supabase
    .from("os_memory_entries")
    .select("id,type,label,summary,content,tags,agent_scope,field_count,updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  return { data: (legacy.data ?? []) as MemoryRow[], error: legacy.error ?? extended.error };
}

async function buildStateFromDatabase(workspaceId: string, supabase: ReturnType<typeof createSupabaseAdmin>): Promise<OSState> {
  const seeded = buildSeedState();
  // Seed fixtures are only a development shell. A real, newly provisioned
  // workspace must never look like a populated demo account.
  seeded.agents = [];
  seeded.agentRuns = [];
  seeded.workflows = [];
  seeded.approvals = [];
  seeded.memory = [];
  seeded.logs = [];
  seeded.policies = [];
  seeded.connectors = seeded.connectors.map((connector) => ({
    ...connector,
    isConnected: false,
    status: "available",
    health: "disabled",
    lastSync: "-",
    lastSynced: "",
    eventsSynced: 0,
    records: "Not connected",
    source: undefined,
  }));
  const agents = await supabase.from("os_agents").select("*").eq("workspace_id", workspaceId);

  if (!agents.error && agents.data?.length) {
    seeded.agents = agents.data.map((agent) => ({
      id: agent.id,
      name: agent.name,
      mark: agent.mark,
      color: agent.color,
      templateId: agent.template_id,
      status: agent.status,
      workspaceId: agent.workspace_id,
      currentTask: agent.current_task,
      deployedAt: agent.deployed_at,
      config: (agent.config ?? {}) as OSState["agents"][number]["config"],
      stats: (agent.stats ?? {}) as OSState["agents"][number]["stats"],
    }));
  }

  return seeded;
}

async function withAppSessionCookie(response: NextResponse, context: Extract<WorkspaceContext, { ok: true }>) {
  if (!context.userEmail || !process.env.SESSION_SECRET) return response;
  const token = await createSessionToken(context.userEmail);
  response.cookies.set(APP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  });
  return response;
}

async function loadWorkspaceState(input: { workspaceId?: string; userId?: string; userEmail?: string; userName?: string }) {
  const supabase = createSupabaseAdmin();
  const context = await resolveWorkspaceContext({ ...input, supabase });
  if (!context.ok) {
    throw new StateRouteError(context.error, context.status);
  }

  const workspaceId = context.workspaceId;
  let memberQuery = supabase
    .from("os_workspace_members")
    .select("user_id,email,full_name,role,role_key")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .neq("status", "pending");
  memberQuery = context.userId
    ? memberQuery.eq("user_id", context.userId)
    : memberQuery.eq("email", context.memberEmail ?? context.userEmail ?? "");

  // Once identity + membership have been verified, these reads are
  // independent. Start them together instead of building a serial waterfall.
  const [
    workspaceResult,
    snapshotResult,
    workspaceSettingsResult,
    memoryResult,
    operatorMemoryResult,
    memberResult,
    teamResult,
    connectorTruth,
  ] = await Promise.all([
    supabase.from("os_workspaces").select("*").eq("id", workspaceId).single(),
    supabase.from("os_state_snapshots").select("state").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("os_workspace_settings").select("approval_policy,notifications").eq("workspace_id", workspaceId).maybeSingle(),
    loadWorkspaceMemory(supabase, workspaceId),
    supabase.from("os_operator_memory").select("id,operator_key,memory_type,title,content,metadata,source_run_id,created_at,updated_at").eq("workspace_id", workspaceId).eq("approval_status", "approved").order("updated_at", { ascending: false }).limit(100),
    memberQuery.maybeSingle(),
    supabase.from("os_workspace_members").select("id,user_id,email,full_name,role,role_key,access,status,active").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
    getConnectorTruth({ workspaceId, supabase }),
  ]);

  if (workspaceResult.error || !workspaceResult.data) {
    throw new StateRouteError(workspaceResult.error?.message || "Workspace fetch failed", 404);
  }

  let state = asState(snapshotResult.data?.state) ?? await buildStateFromDatabase(workspaceId, supabase);
  const db = workspaceResult.data;
  const onboardingDataForSystems = db.onboarding_data && typeof db.onboarding_data === "object"
    ? db.onboarding_data as Record<string, unknown>
    : null;
  const onboardingSystems = Array.isArray(onboardingDataForSystems?.systems)
    ? onboardingDataForSystems.systems.filter((system): system is string => typeof system === "string")
    : [];

  state.workspace = {
    ...state.workspace,
    id: workspaceId,
    name: db.name ?? state.workspace.name,
    environment: db.environment ?? state.workspace.environment,
    region: db.region ?? state.workspace.region,
    plan: db.plan ?? state.workspace.plan,
    planTier: db.plan_tier ?? state.workspace.planTier,
    billingStatus: db.billing_status ?? state.workspace.billingStatus,
    trialEndsAt: db.trial_ends_at ?? undefined,
    dodoCustomerId: db.dodo_customer_id ?? undefined,
    dodoSubscriptionId: db.dodo_subscription_id ?? undefined,
    dodoProductId: db.dodo_product_id ?? undefined,
    logoUrl: db.logo_url ?? undefined,
    // Descriptive-only: what onboarding said this workspace already uses.
    // Never treated as real connector truth (see getConnectorTruth below).
    onboardingSystems,
  };
  state.settings = { ...state.settings, workspace: { ...state.settings.workspace, ...state.workspace } };

  // Settings are stored independently from the UI snapshot. Hydrate them on
  // every load so workspace controls remain durable across browsers/devices.
  if (!workspaceSettingsResult.error && workspaceSettingsResult.data) {
    state.settings = {
      ...state.settings,
      workspace: { ...state.settings.workspace, ...state.workspace },
      approvalPolicy: {
        ...state.settings.approvalPolicy,
        ...stringSettings(workspaceSettingsResult.data.approval_policy),
      },
      notifications: {
        ...state.settings.notifications,
        ...stringSettings(workspaceSettingsResult.data.notifications),
      },
    };
  }

  // Company memory is workspace-scoped and is deliberately independent from
  // a browser snapshot. This makes the onboarding brief and approved
  // operator learnings durable across sessions and devices.
  if (!memoryResult.error) {
    let memoryEntries = (memoryResult.data ?? []).map((entry) => normalizeMemoryRow(entry));
    const onboardingData = db.onboarding_data && typeof db.onboarding_data === "object"
      ? db.onboarding_data as Record<string, unknown>
      : null;
    if (memoryEntries.length === 0 && db.onboarding_completed_at && onboardingData) {
      const priority = onboardingData.first_priority === "revenue"
        ? "New leads"
        : onboardingData.first_priority === "client_flow"
          ? "Client handoffs"
          : onboardingData.first_priority === "operations"
            ? "Operations"
            : "Not specified";
      const systems = Array.isArray(onboardingData.systems)
        ? onboardingData.systems.filter((system): system is string => typeof system === "string")
        : [];
      const brief = {
        id: `mem-onboarding-${workspaceId}`,
        workspace_id: workspaceId,
        type: "process",
        canonical_key: "business.operating_profile",
        category: "business",
        source_type: "owner_confirmed",
        source_label: "Owner-confirmed onboarding",
        source_ref: `onboarding:${workspaceId}`,
        reliability: "verified",
        first_observed_at: new Date().toISOString(),
        last_confirmed_at: new Date().toISOString(),
        operator_relevance: ["revenue", "client_flow", "operations", "support"],
        policy_relevant: true,
        evidence: ["owner-confirmed onboarding form"],
        label: `${state.workspace.name} operating brief`,
        summary: `${priority} is the first operating priority.`,
        content: [
          `Workspace: ${state.workspace.name}`,
          `Industry: ${typeof onboardingData.industry === "string" ? onboardingData.industry : "Not provided"}`,
          `Team size: ${typeof onboardingData.team_size === "string" ? onboardingData.team_size : "Not provided"}`,
          `Website: ${typeof onboardingData.website === "string" ? onboardingData.website : "Not provided"}`,
          `First priority: ${priority}`,
          `Relevant systems: ${systems.length ? systems.join(", ") : "Not provided"}`,
          "Source: owner-confirmed onboarding.",
        ].join("\n"),
        tags: ["onboarding", ...(typeof onboardingData.first_priority === "string" ? [onboardingData.first_priority] : []), ...systems],
        agent_scope: typeof onboardingData.first_priority === "string" ? [onboardingData.first_priority] : [],
        field_count: 6,
        updated_at: new Date().toISOString(),
      };
      const insertedBrief = await supabase.from("os_memory_entries").upsert(brief, { onConflict: "id" }).select("id,type,category,canonical_key,label,summary,content,tags,agent_scope,field_count,source_type,source_label,source_ref,source_connector,source_entity_id,reliability,confidence,first_observed_at,last_observed_at,last_confirmed_at,stale_after,operator_relevance,policy_relevant,evidence,supersedes_id,updated_at").maybeSingle();
      if (!insertedBrief.error && insertedBrief.data) memoryEntries = [normalizeMemoryRow(insertedBrief.data as MemoryRow)];
    }
    state.memory = resolveMemoryEntries(memoryEntries);
  }

  // Operator learning is append-only audit data. Only approved learnings may
  // influence future work; rejected decisions remain in the audit trail.
  if (!operatorMemoryResult.error && operatorMemoryResult.data?.length) {
    const approvedLearnings = operatorMemoryResult.data.map((learning) => normalizeMemoryRow({
      id: learning.id,
      type: "agent",
      category: "operating_rules",
      canonical_key: `operator-learning:${learning.operator_key}:${learning.memory_type}:${learning.title}`,
      label: learning.title,
      summary: `Approved learning from ${learning.operator_key.replace(/_/g, " ")} operator.`,
      content: learning.content,
      tags: ["approved-learning", learning.memory_type],
      agent_scope: [learning.operator_key],
      field_count: 2,
      source_type: "derived",
      source_label: "Approved operator outcome",
      source_ref: learning.source_run_id ? `os_operator_runs:${learning.source_run_id}` : null,
      reliability: "derived",
      confidence: "medium",
      evidence: learning.source_run_id ? [`os_operator_runs:${learning.source_run_id}`] : [],
      metadata: learning.metadata,
      updated_at: learning.updated_at,
    }));
    state.memory = resolveMemoryEntries([...state.memory, ...approvedLearnings]);
  }

  // A snapshot is workspace data, never an identity source. Always project
  // the current authenticated member onto it so a new customer cannot see a
  // seed "Workspace Admin" (or another browser user's cached profile).
  const member = memberResult.data;
  // The verified Auth email is authoritative for the signed-in identity.
  // A historical membership row can contain an old invite/seed address and
  // must never make the profile chrome display somebody else's email.
  const memberEmail = context.userEmail ?? member?.email ?? state.currentUser.email;
  const verifiedFallbackName = context.userName?.trim() || memberEmail.split("@")[0] || "Workspace member";
  const memberName = isLegacySeedIdentity(member?.full_name) ? verifiedFallbackName : member?.full_name?.trim() || verifiedFallbackName;
  const roleLabel = roleLabelFor(member?.role_key, member?.role);
  const profileUserId = member?.user_id ?? context.userId ?? state.currentUser.id;
  const [profileResult, preferencesResult] = await Promise.all([
    supabase
      .from("os_user_profiles")
      .select("full_name,avatar_url,notification_approvals,notification_digest,notification_alerts")
      .eq("user_id", profileUserId)
      .maybeSingle(),
    supabase
      .from("os_dashboard_preferences")
      .select("time_range,view_mode")
      .eq("workspace_id", workspaceId)
      .eq("user_id", profileUserId)
      .maybeSingle(),
  ]);
  const profile = profileResult.data;
  const preferences = preferencesResult.data;
  const profileName = isLegacySeedIdentity(profile?.full_name) ? verifiedFallbackName : profile?.full_name?.trim() || memberName;
  state.currentUser = {
    ...state.currentUser,
    id: profileUserId,
    name: profileName,
    email: memberEmail,
    roleLabel,
    initials: initialsFor(profileName),
    avatarUrl: profile?.avatar_url ?? undefined,
    notifications: {
      approvals: profile?.notification_approvals ?? state.currentUser.notifications.approvals,
      digest: profile?.notification_digest ?? state.currentUser.notifications.digest,
      alerts: profile?.notification_alerts ?? state.currentUser.notifications.alerts,
    },
  };
  if (preferences?.time_range && preferences?.view_mode) {
    state.dashboard = {
      ...state.dashboard,
      timeRange: preferences.time_range as OSState["dashboard"]["timeRange"],
      viewMode: preferences.view_mode as OSState["dashboard"]["viewMode"],
    };
  }
  if (!teamResult.error && teamResult.data) {
    state.teamMembers = teamResult.data.map((teamMember) => {
      const name = isLegacySeedIdentity(teamMember.full_name)
        ? (teamMember.email?.split("@")[0] || "Workspace member")
        : teamMember.full_name?.trim() || teamMember.email?.split("@")[0] || "Workspace member";
      const access = Array.isArray(teamMember.access)
        ? teamMember.access.filter((item): item is string => typeof item === "string")
        : [];
      return {
        id: teamMember.id,
        name,
        email: teamMember.email,
        role: roleLabelFor(teamMember.role_key, teamMember.role),
        initials: initialsFor(name),
        color: teamMember.role_key === "owner" ? "#4DE8E1" : teamMember.role_key === "admin" ? "#A78BFA" : "#5B8DEF",
        access,
        status: teamMember.status as OSState["teamMembers"][number]["status"],
        active: teamMember.active,
      };
    });
  }

  state = { ...state, connectors: reconcileConnectorsWithRegistry(state.connectors) };
  state = applyConnectorTruthToState(state, connectorTruth);

  return { workspaceId, state, context };
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({
      fallback: true,
      message: "Supabase is not configured. Using local preview state.",
    }, { status: 503 });
  }

  try {
    const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
    const userEmail = req.nextUrl.searchParams.get("userEmail") ?? undefined;
    const userName = req.nextUrl.searchParams.get("userName") ?? undefined;

    const boot = await loadWorkspaceState({ workspaceId, userId, userEmail, userName });
    return withAppSessionCookie(
      NextResponse.json({ fallback: false, workspaceId: boot.workspaceId, state: boot.state }),
      boot.context
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown bootstrap error";
    const status = error instanceof StateRouteError ? error.status : 500;
    console.warn("[os-state] bootstrap failed", { status, error: message });
    const customerMessage = status === 403
      ? "You don’t have access to this workspace."
      : status === 401
        ? "Your session could not be verified. Please sign in again."
        : status === 404
          ? "This workspace is no longer available."
          : "We couldn’t load your workspace. Refresh to try again.";
    return NextResponse.json({ message: customerMessage }, { status });
  }
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({
      fallback: true,
      message: "Supabase is not configured. State remains local-only.",
    }, { status: 503 });
  }

  try {
    const body = (await req.json()) as JsonRecord;
    const state = asState(body.state);
    if (!state) {
      return NextResponse.json({ error: "Invalid OS state payload." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const context = await resolveWorkspaceContext({
      workspaceId: state.workspace.id,
      userId: state.currentUser.id,
      userEmail: state.currentUser.email,
      userName: state.currentUser.name,
      supabase,
    });
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const wsResult = await supabase.from("os_workspaces").upsert(
      workspaceUpdateFromState({ ...state, workspace: { ...state.workspace, id: context.workspaceId } }),
      { onConflict: "id" }
    );
    if (wsResult.error) {
      return NextResponse.json({ error: wsResult.error.message }, { status: 500 });
    }

    await supabase.from("os_workspace_settings").upsert({
      workspace_id: context.workspaceId,
      approval_policy: state.settings.approvalPolicy,
      notifications: state.settings.notifications,
    }, { onConflict: "workspace_id" });

    await supabase.from("os_state_snapshots").upsert({
      workspace_id: context.workspaceId,
      state: stripSnapshotTruth({ ...state, workspace: { ...state.workspace, id: context.workspaceId } }),
    }, { onConflict: "workspace_id" });

    return withAppSessionCookie(NextResponse.json({ ok: true }), context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
