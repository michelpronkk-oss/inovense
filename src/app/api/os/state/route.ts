import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSeedState } from "@/lib/os/seed";
import type { OSState } from "@/lib/os/types";

type JsonRecord = Record<string, unknown>;

function isUuid(v: string | null | undefined): v is string {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration missing.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function asState(value: unknown): OSState | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Partial<OSState>;
  if (!rec.workspace || !rec.currentUser || !Array.isArray(rec.connectors) || !Array.isArray(rec.agents)) {
    return null;
  }
  return rec as OSState;
}

function makeWorkspaceId(nameOrEmail: string): string {
  const base = nameOrEmail
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24) || "preview";
  return `ws-${base}`;
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
  "plan", "planTier", "billingStatus", "trialEndsAt",
  "dodoCustomerId", "dodoSubscriptionId", "dodoProductId",
];

function stripBillingFromSnapshot(state: OSState): OSState {
  const safeWorkspace = { ...state.workspace };
  for (const key of BILLING_WORKSPACE_KEYS) {
    delete safeWorkspace[key];
  }
  return { ...state, workspace: safeWorkspace };
}

async function bootstrapWorkspace(input: { workspaceId?: string; userId?: string; userEmail?: string; userName?: string }) {
  const supabase = createSupabaseAdmin();

  const userEmail = (input.userEmail || "").trim().toLowerCase();
  let workspaceId = input.workspaceId?.trim() || "";

  if (!workspaceId && (userEmail || isUuid(input.userId))) {
    let membershipQuery = supabase
      .from("os_workspace_members")
      .select("workspace_id")
      .limit(1);

    if (isUuid(input.userId) && userEmail) {
      membershipQuery = membershipQuery.or(`user_id.eq.${input.userId},email.eq.${userEmail}`);
    } else if (isUuid(input.userId)) {
      membershipQuery = membershipQuery.eq("user_id", input.userId);
    } else if (userEmail) {
      membershipQuery = membershipQuery.eq("email", userEmail);
    }

    const membership = await membershipQuery.maybeSingle();
    workspaceId = membership.data?.workspace_id ?? "";
  }

  if (!workspaceId) {
    workspaceId = makeWorkspaceId(userEmail || input.userName || "workspace");
  }

  // ignoreDuplicates: true — only inserts for new workspaces, never updates
  // billing fields on existing rows.
  const wsUpsert = await supabase.from("os_workspaces").upsert({
    id: workspaceId,
    name: "Workspace",
    environment: "setup",
    region: "eu-west-1",
    plan: "preview",
    plan_tier: "preview",
    billing_status: "preview",
    operators_limit: 1,
    connectors_limit: "0",
    actions_limit: 0,
    log_retention_days: 0,
    can_use_real_connectors: false,
    can_run_real_actions: false,
    support_level: "none",
  }, { onConflict: "id", ignoreDuplicates: true });

  if (wsUpsert.error) throw new Error(wsUpsert.error.message);

  if (userEmail) {
    await supabase.from("os_workspace_members").upsert({
      workspace_id: workspaceId,
      user_id: isUuid(input.userId) ? input.userId : null,
      email: userEmail,
      full_name: input.userName || userEmail.split("@")[0],
      role: "Operator - Admin",
      access: ["All operators", "Approvals", "Settings"],
      status: "online",
      active: true,
    }, { onConflict: "workspace_id,email" });
  }

  if (isUuid(input.userId)) {
    await supabase.from("os_user_profiles").upsert({
      user_id: input.userId,
      workspace_id: workspaceId,
      full_name: input.userName || "Workspace Admin",
      role_label: "Operator - Admin",
      initials: (input.userName || "WA").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      notification_approvals: true,
      notification_digest: true,
      notification_alerts: true,
    });
  }

  await supabase.from("os_workspace_settings").upsert({
    workspace_id: workspaceId,
    approval_policy: {},
    notifications: {},
  }, { onConflict: "workspace_id" });

  const workspaceResult = await supabase
    .from("os_workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (workspaceResult.error || !workspaceResult.data) {
    throw new Error(workspaceResult.error?.message || "Workspace fetch failed");
  }

  const snapshotResult = await supabase
    .from("os_state_snapshots")
    .select("state")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const snapshotState = asState(snapshotResult.data?.state);
  let state = snapshotState;

  if (!state) {
    const [agents, runs, workflows, approvals, logs, memory, connectors, policies, connectorCredentials] = await Promise.all([
      supabase.from("os_agents").select("*").eq("workspace_id", workspaceId),
      supabase.from("os_agent_runs").select("*"),
      supabase.from("os_workflows").select("*"),
      supabase.from("os_approvals").select("*"),
      supabase.from("os_execution_logs").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("os_memory_entries").select("*").order("updated_at", { ascending: false }).limit(300),
      supabase.from("os_connectors").select("*"),
      supabase.from("os_policies").select("*"),
      supabase.from("os_connector_credentials").select("connector_key, provider_email, status, workspace_id").eq("workspace_id", workspaceId),
    ]);

    const seeded = buildSeedState();
    if (!agents.error && agents.data?.length) {
      seeded.agents = agents.data.map((a) => ({
        id: a.id,
        name: a.name,
        mark: a.mark,
        color: a.color,
        templateId: a.template_id,
        status: a.status,
        workspaceId: a.workspace_id,
        currentTask: a.current_task,
        deployedAt: a.deployed_at,
        config: (a.config ?? {}) as OSState["agents"][number]["config"],
        stats: (a.stats ?? {}) as OSState["agents"][number]["stats"],
      }));
    }
    if (!runs.error && runs.data?.length) {
      seeded.agentRuns = runs.data.map((r) => ({
        id: r.id,
        agentId: r.agent_id,
        agentMark: r.agent_mark,
        agentColor: r.agent_color,
        agentName: r.agent_name,
        workflowId: r.workflow_id ?? undefined,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at ?? undefined,
        steps: Array.isArray(r.steps) ? r.steps : [],
        approvalId: r.approval_id ?? undefined,
        output: (r.output ?? undefined) as OSState["agentRuns"][number]["output"],
        triggeredBy: r.triggered_by,
      }));
    }
    if (!workflows.error && workflows.data?.length) {
      seeded.workflows = workflows.data.map((w) => ({
        id: w.id,
        name: w.name,
        trigger: w.trigger,
        agentId: w.agent_id,
        agentColor: w.agent_color,
        agentLabel: w.agent_label,
        status: w.status,
        totalRuns: w.total_runs,
        successRate: Number(w.success_rate),
        avgDuration: w.avg_duration,
        lastRun: w.last_run,
        createdAt: w.created_at,
      }));
    }
    if (!approvals.error && approvals.data?.length) {
      seeded.approvals = approvals.data.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        body: a.body,
        agentId: a.agent_id,
        agentMark: a.agent_mark,
        agentColor: a.agent_color,
        runId: a.run_id ?? undefined,
        status: a.status,
        createdAt: a.created_at,
        resolvedAt: a.resolved_at ?? undefined,
        resolvedBy: a.resolved_by ?? undefined,
        continuationPayload: (a.continuation_payload ?? undefined) as Record<string, unknown> | undefined,
        policyChecks: a.policy_reason ? [String(a.policy_reason)] : undefined,
      }));
    }
    if (!logs.error && logs.data?.length) {
      seeded.logs = logs.data.map((l) => ({
        id: l.id,
        ts: l.ts,
        runId: l.run_id,
        agentId: l.agent_id,
        agentMark: l.agent_mark,
        agentColor: l.agent_color,
        event: l.event,
        message: l.message,
        duration: l.duration,
        status: l.status,
      }));
    }
    if (!memory.error && memory.data?.length) {
      seeded.memory = memory.data.map((m) => ({
        id: m.id,
        type: m.type,
        label: m.label,
        summary: m.summary,
        content: m.content,
        tags: Array.isArray(m.tags) ? m.tags : [],
        agentScope: Array.isArray(m.agent_scope) ? m.agent_scope : [],
        fieldCount: m.field_count,
        updatedAt: m.updated_at,
      }));
    }
    if (!connectors.error && connectors.data?.length) {
      seeded.connectors = connectors.data.map((c) => ({
        id: c.id,
        name: c.name,
        letter: c.letter,
        color: c.color,
        category: c.category,
        description: c.name,
        status: c.connected ? "connected" : "available",
        health: c.connected ? "healthy" : "disabled",
        lastSync: c.last_sync ?? "-",
        syncMode: "manual",
        syncFreq: c.sync_freq ?? "Manual",
        permissions: Array.isArray(c.permissions) ? c.permissions : [],
        readScopes: [],
        writeScopes: [],
        approvalRequiredFor: [],
        blockedActions: [],
        operatorsAllowed: [],
        records: c.records ?? "",
        lastSynced: "",
        eventsSynced: 0,
        authErrors: 0,
        recentSyncEvents: [],
        isConnected: Boolean(c.connected),
        source: (Boolean(c.connected) ? "nango" : undefined) as "nango" | undefined,
      }));
    }
    if (!connectorCredentials.error && connectorCredentials.data?.length) {
      const gmailCred = connectorCredentials.data.find((row) => row.connector_key === "gmail" && row.status === "connected");
      if (gmailCred) {
        seeded.connectors = seeded.connectors.map((connector) => connector.id === "gmail"
          ? {
            ...connector,
            isConnected: true,
            status: "connected",
            health: "healthy",
            records: gmailCred.provider_email ? `Real account connected: ${gmailCred.provider_email}` : "Real account connected",
            source: "native" as const,
          }
          : connector);
      }
    }
    if (!policies.error && policies.data?.length) {
      seeded.policies = policies.data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        enabled: p.active,
        category: p.category ?? "internal",
        actionType: p.action ?? "internal.logWrite",
        appliesToAgents: Array.isArray(p.scope) ? p.scope : ["all"],
        appliesToConnectors: ["all"],
        conditions: {},
        decision: p.effect ?? "allow",
        reviewerRole: p.reviewer_role ?? undefined,
        limitValue: p.limit_value ?? undefined,
        allowlist: [],
        blockedReason: "",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        active: p.active,
        action: p.action,
        effect: p.effect,
        scope: Array.isArray(p.scope) ? p.scope : ["all"],
      }));
    }
    state = seeded;
  }

  // DB always wins for billing — overlay canonical fields last, regardless of snapshot.
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

  return { workspaceId, state };
}

export async function GET(req: NextRequest) {
  if (!hasSupabaseConfig()) {
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

    const boot = await bootstrapWorkspace({ workspaceId, userId, userEmail, userName });
    return NextResponse.json({ fallback: false, workspaceId: boot.workspaceId, state: boot.state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown bootstrap error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseConfig()) {
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

    const wsResult = await supabase.from("os_workspaces").upsert(
      workspaceUpdateFromState(state),
      { onConflict: "id" }
    );
    if (wsResult.error) {
      return NextResponse.json({ error: wsResult.error.message }, { status: 500 });
    }

    await supabase.from("os_workspace_settings").upsert({
      workspace_id: state.workspace.id,
      approval_policy: state.settings.approvalPolicy,
      notifications: state.settings.notifications,
    }, { onConflict: "workspace_id" });

    await supabase.from("os_state_snapshots").upsert({
      workspace_id: state.workspace.id,
      state: stripBillingFromSnapshot(state),
    }, { onConflict: "workspace_id" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
