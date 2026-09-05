import { NextRequest, NextResponse } from "next/server";
import { applyConnectorTruthToState, getConnectorTruth } from "@/lib/connectors/truth";
import { isSupportedNangoConnector } from "@/lib/connectors/registry";
import { buildSeedState, reconcileConnectorsWithRegistry } from "@/lib/os/seed";
import type { OSState } from "@/lib/os/types";
import { resolveWorkspaceContext, type WorkspaceContext } from "@/lib/os/workspace";
import { APP_SESSION_COOKIE, createSessionToken, SESSION_MAX_AGE_SEC } from "@/lib/session";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

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

function workspaceUpdateFromState(state: OSState) {
  return {
    id: state.workspace.id,
    name: state.workspace.name,
    environment: state.workspace.environment,
    region: state.workspace.region,
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
      if (connector.id !== "gmail" && !isSupportedNangoConnector(connector.id)) return connector;
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

function roleLabelFor(roleKey: string | null | undefined, legacyRole: string | null | undefined) {
  if (roleKey === "owner") return "Owner";
  if (roleKey === "admin") return "Admin";
  return legacyRole || "Member";
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
  const workspaceResult = await supabase
    .from("os_workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (workspaceResult.error || !workspaceResult.data) {
    throw new StateRouteError(workspaceResult.error?.message || "Workspace fetch failed", 404);
  }

  const snapshotResult = await supabase
    .from("os_state_snapshots")
    .select("state")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  let state = asState(snapshotResult.data?.state) ?? await buildStateFromDatabase(workspaceId, supabase);
  const db = workspaceResult.data;

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
  };

  // A snapshot is workspace data, never an identity source. Always project
  // the current authenticated member onto it so a new customer cannot see a
  // seed "Workspace Admin" (or another browser user's cached profile).
  let memberQuery = supabase
    .from("os_workspace_members")
    .select("user_id,email,full_name,role,role_key")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .neq("status", "pending");
  memberQuery = context.userId
    ? memberQuery.eq("user_id", context.userId)
    : memberQuery.eq("email", context.memberEmail ?? context.userEmail ?? "");
  const memberResult = await memberQuery.maybeSingle();
  const member = memberResult.data;
  const memberEmail = member?.email ?? context.userEmail ?? state.currentUser.email;
  const memberName = member?.full_name?.trim() || context.userName?.trim() || memberEmail.split("@")[0] || "Workspace member";
  const roleLabel = roleLabelFor(member?.role_key, member?.role);
  state.currentUser = {
    ...state.currentUser,
    id: member?.user_id ?? context.userId ?? state.currentUser.id,
    name: memberName,
    email: memberEmail,
    roleLabel,
    initials: initialsFor(memberName),
  };
  state.teamMembers = [{
    id: state.currentUser.id,
    name: memberName,
    email: memberEmail,
    role: roleLabel,
    initials: state.currentUser.initials,
    color: "#4DE8E1",
    access: ["All operators", "Approvals", "Settings"],
    status: "online",
    active: true,
  }];

  state = { ...state, connectors: reconcileConnectorsWithRegistry(state.connectors) };
  const connectorTruth = await getConnectorTruth({ workspaceId, supabase });
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
    return NextResponse.json({ error: message }, { status });
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
