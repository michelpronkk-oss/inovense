"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from "react";
import type {
  OSState,
  Agent,
  ExecutionLog,
  DeployConfig,
  AgentRun,
  Connector,
  Policy,
  TeamMember,
  OSSettings,
  CurrentUser,
  DashboardState,
  Workspace,
  OnboardingState,
} from "@/lib/os/types";
import { buildSeedState, reconcileConnectorsWithRegistry } from "@/lib/os/seed";
import { AGENT_TEMPLATES } from "@/lib/os/templates";
import { continueRunAfterApproval, runAgent as runAgentRuntime, type AgentRuntimeResult } from "@/lib/os/agents/agent-runtime";
import { installWorkflowFromSuggestion, type SuggestedWorkflow } from "@/lib/os/workflow-recommendations";
import { getEntitlements, type Entitlements } from "@/lib/os/entitlements";
import { reportLegacyMigrationEvent } from "@/lib/migration-telemetry";

const STORAGE_KEY = "auterim-os-state-v7";
const LEGACY_STORAGE_KEYS = ["inovense-os-state-v7", "inovense-os-state-v1"];
const DEV_USER_KEY = "auterim-os-dev-user-v1";
const LEGACY_DEV_USER_KEY = "inovense-os-dev-user-v1";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

type OSAction =
  | { type: "HYDRATE"; state: OSState }
  | { type: "COMPLETE_ONBOARDING"; onboarding: OnboardingState; workspace: Workspace; currentUser: CurrentUser; connectors: string[]; preferredOperator: string; mainGoals: string[]; approvalOwner: string; preferredDemoPath: NonNullable<OnboardingState["preferredDemoPath"]>; safetyMode: "safe" | "assisted" }
  | { type: "SET_ACTIVATION"; value: NonNullable<OSSettings["activation"]>; log?: ExecutionLog }
  | { type: "DEPLOY_AGENT"; agent: Agent }
  | { type: "APPROVE"; approvalId: string; runId?: string; agentId: string }
  | { type: "SKIP"; approvalId: string; runId?: string; agentId: string }
  | { type: "TOGGLE_AGENT_PAUSE"; agentId: string }
  | { type: "RUN_WORKFLOW"; workflowId: string }
  | { type: "INSTALL_WORKFLOW"; workflow: OSState["workflows"][number]; log: ExecutionLog }
  | { type: "UPSERT_POLICY"; policy: Policy; log: ExecutionLog }
  | { type: "SET_POLICY_ACTIVE"; policyId: string; active: boolean; log: ExecutionLog }
  | { type: "INVITE_MEMBER"; member: TeamMember; log: ExecutionLog }
  | { type: "UPDATE_MEMBER"; memberId: string; patch: Partial<TeamMember>; log: ExecutionLog }
  | { type: "SET_SETTINGS_SECTION"; section: keyof OSSettings; value: OSSettings[keyof OSSettings]; log: ExecutionLog }
  | { type: "SET_CURRENT_USER"; value: CurrentUser; log: ExecutionLog }
  | { type: "SET_DASHBOARD"; value: DashboardState }
  | { type: "SET_WORKSPACE"; value: Workspace; log: ExecutionLog }
  | { type: "APPEND_LOG"; log: ExecutionLog }
  | { type: "UPDATE_CONNECTOR"; connectorId: string; patch: Partial<Connector>; log?: ExecutionLog }
  | { type: "APPLY_RUNTIME_RESULT"; result: AgentRuntimeResult }
  | { type: "UPSERT_RUN"; run: AgentRun }
  | { type: "ADD_MEMORY"; entries: OSState["memory"] };

function reducer(state: OSState, action: OSAction): OSState {
  switch (action.type) {
    case "HYDRATE":
      return { ...action.state, connectors: reconcileConnectorsWithRegistry(action.state.connectors) };
    case "COMPLETE_ONBOARDING": {
      const nowIso = new Date().toISOString();
      const preferredMap: Record<string, string> = {
        "Revenue Operator": "revenue",
        "Marketing Operator": "marketing",
        "Client Flow Operator": "client",
        "Operations Operator": "operations",
        "Support Operator": "support",
      };
      const templateId = preferredMap[action.preferredOperator] ?? "revenue";
      const template = AGENT_TEMPLATES[templateId];
      const hasRealConnector = (connectorId: string) => state.connectors.some((connector) =>
        connector.id === connectorId
        && connector.isConnected
        && (connector.source === "native" || connector.source === "nango")
      );
      const missingRevenueRequirements = action.preferredOperator === "Revenue Operator"
        ? [
          !hasRealConnector("gmail") ? "gmail" : "",
          !hasRealConnector("hubspot") ? "hubspot" : "",
        ].filter(Boolean)
        : [];
      const preferredAgent: Agent | null = template
        ? {
          id: `agent-${template.id.slice(0, 2).toUpperCase()}-${Date.now()}`,
          name: action.preferredOperator,
          mark: template.mark,
          color: template.color,
          templateId: template.id,
          status: missingRevenueRequirements.length ? "awaiting" : "running",
          workspaceId: action.workspace.id,
          currentTask: missingRevenueRequirements.length
            ? `Missing requirements: ${missingRevenueRequirements.join(", ")}`
            : "Ready for first workflow run",
          deployedAt: nowIso,
          config: {
            tools: template.allowedTools,
            approvalPolicy: "require_approval",
            memoryScope: ["client", "brand", "process"],
          },
          stats: { actionsThisWeek: 0, outputsThisWeek: 0, totalRuns: 0, metricLabel: "actions/wk", metricValue: "0" },
        }
        : null;
      const onboardLog = logEntry(`Onboarding completed for ${action.workspace.name}`, "onboarding.completed", "ok");
      const missingReqLog = missingRevenueRequirements.length
        ? logEntry(`Revenue Operator missing requirements: ${missingRevenueRequirements.join(", ")}`, "connector.missing", "warn")
        : null;
      const memoryEntry = {
        id: `mem-onb-${Date.now()}`,
        type: "process" as const,
        label: `${action.workspace.name} onboarding profile`,
        summary: "Initial workspace goals and operating preferences",
        content: `Goals: ${action.mainGoals.join(", ") || "none provided"}. Approval owner: ${action.approvalOwner}. Preferred operator: ${action.preferredOperator}.`,
        tags: ["onboarding", "workspace"],
        agentScope: preferredAgent ? [preferredAgent.id] : [],
        fieldCount: 4,
        updatedAt: nowIso,
      };
      return {
        ...state,
        onboarding: action.onboarding,
        workspace: action.workspace,
        settings: {
          ...state.settings,
          workspace: {
            name: action.workspace.name,
            environment: action.workspace.environment,
            region: action.workspace.region,
            plan: action.workspace.plan,
          },
          approvalPolicy: {
            ...state.settings.approvalPolicy,
            outboundComms: "Always require approval",
            crmWrites: "Always require approval",
            customerEmailMode: "approval_required",
            autonomyMode: action.safetyMode,
          },
          activation: {
            preferredDemoPath: action.preferredDemoPath,
          },
        },
        currentUser: action.currentUser,
        teamMembers: [{
          id: state.currentUser.id,
          name: action.currentUser.name,
          email: action.currentUser.email,
          role: "Admin",
          initials: action.currentUser.initials,
          color: "#4DE8E1",
          access: ["All operators", "Approvals", "Settings"],
          status: "online" as const,
          active: true,
        }],
        connectors: state.connectors.map((connector) => {
          const selectedForSetup = action.connectors.includes(connector.id);
          if (!selectedForSetup) return connector;
          return {
            ...connector,
            isConnected: false,
            status: "available",
            health: "disabled",
            lastSync: "-",
            lastSynced: "",
            records: "Selected in onboarding - connect a real account to sync live data",
            source: "seed",
          };
        }),
        policies: state.policies.map((policy) => ({ ...policy, enabled: true, active: true, updatedAt: nowIso })),
        // Replace seed agents with only the user's selected operator
        agents: preferredAgent ? [preferredAgent] : [],
        // Start with a clean approvals inbox
        approvals: [],
        // Start with no workflows — user builds from here
        workflows: [],
        // Start with only the onboarding memory seed
        memory: [memoryEntry],
        logs: [onboardLog, ...(missingReqLog ? [missingReqLog] : [])],
      };
    }
    case "SET_ACTIVATION":
      return {
        ...state,
        settings: {
          ...state.settings,
          activation: action.value,
        },
        logs: action.log ? [action.log, ...state.logs].slice(0, 300) : state.logs,
      };
    case "DEPLOY_AGENT":
      return { ...state, agents: [...state.agents, action.agent] };
    case "APPROVE": {
      const now = new Date().toISOString();
      return {
        ...state,
        approvals: state.approvals.map((a) =>
          a.id === action.approvalId ? { ...a, status: "approved", resolvedAt: now, resolvedBy: state.currentUser.name } : a
        ),
        agents: state.agents.map((a) => (a.id === action.agentId ? { ...a, status: "running", currentTask: "Completed approved action" } : a)),
        logs: [logEntry("Approval granted and action continued", "approval.approved"), ...state.logs].slice(0, 300),
      };
    }
    case "SKIP": {
      const now = new Date().toISOString();
      return {
        ...state,
        approvals: state.approvals.map((a) =>
          a.id === action.approvalId ? { ...a, status: "skipped", resolvedAt: now, resolvedBy: state.currentUser.name } : a
        ),
        agents: state.agents.map((a) => (a.id === action.agentId ? { ...a, status: "running", currentTask: "Action skipped by operator" } : a)),
        logs: [logEntry("Approval skipped, action canceled", "approval.skipped", "warn"), ...state.logs].slice(0, 300),
      };
    }
    case "TOGGLE_AGENT_PAUSE": {
      const agent = state.agents.find((a) => a.id === action.agentId);
      const nextPaused = agent?.status !== "paused";
      const log: ExecutionLog = {
        id: `log-${Date.now()}-${action.agentId}`,
        ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        runId: "manual",
        agentId: action.agentId,
        agentMark: agent?.mark ?? "OS",
        agentColor: agent?.color ?? "#4DE8E1",
        event: "agent_status",
        message: nextPaused ? "Agent paused by operator" : "Agent resumed by operator",
        duration: "-",
        status: "ok",
      };
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === action.agentId ? { ...a, status: a.status === "paused" ? "running" : "paused" } : a)),
        logs: [log, ...state.logs].slice(0, 300),
      };
    }
    case "RUN_WORKFLOW": {
      const { workflowId } = action;
      return {
        ...state,
        workflows: state.workflows.map((w) => (w.id === workflowId ? { ...w, totalRuns: w.totalRuns + 1, lastRun: "just now" } : w)),
      };
    }
    case "INSTALL_WORKFLOW":
      return {
        ...state,
        workflows: [action.workflow, ...state.workflows],
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    case "UPSERT_POLICY": {
      const exists = state.policies.some((p) => p.id === action.policy.id);
      return {
        ...state,
        policies: exists ? state.policies.map((p) => (p.id === action.policy.id ? action.policy : p)) : [action.policy, ...state.policies],
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    }
    case "SET_POLICY_ACTIVE":
      return {
        ...state,
        policies: state.policies.map((p) => (p.id === action.policyId ? { ...p, active: action.active, enabled: action.active, updatedAt: new Date().toISOString() } : p)),
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    case "INVITE_MEMBER":
      return {
        ...state,
        teamMembers: [action.member, ...state.teamMembers],
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    case "UPDATE_MEMBER":
      return {
        ...state,
        teamMembers: state.teamMembers.map((m) => (m.id === action.memberId ? { ...m, ...action.patch } : m)),
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    case "SET_SETTINGS_SECTION":
      return {
        ...state,
        settings: { ...state.settings, [action.section]: action.value } as OSSettings,
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    case "SET_CURRENT_USER":
      return {
        ...state,
        currentUser: action.value,
        teamMembers: state.teamMembers.map((m) => (m.id === state.currentUser.id ? { ...m, name: action.value.name, role: action.value.roleLabel, initials: action.value.initials } : m)),
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    case "SET_DASHBOARD":
      return { ...state, dashboard: action.value };
    case "SET_WORKSPACE":
      return {
        ...state,
        workspace: action.value,
        settings: { ...state.settings, workspace: { ...action.value } },
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    case "APPEND_LOG":
      return {
        ...state,
        logs: [action.log, ...state.logs].slice(0, 300),
      };
    case "UPDATE_CONNECTOR":
      return {
        ...state,
        connectors: state.connectors.map((c) => (c.id === action.connectorId ? { ...c, ...action.patch } : c)),
        logs: action.log ? [action.log, ...state.logs].slice(0, 300) : state.logs,
      };
    case "APPLY_RUNTIME_RESULT": {
      const { run, logs, approvals, memoryWrites } = action.result;
      const existingIdx = state.agentRuns.findIndex((r) => r.id === run.id);
      const nextRuns = existingIdx === -1
        ? [run, ...state.agentRuns]
        : state.agentRuns.map((r) => (r.id === run.id ? run : r));
      return {
        ...state,
        agentRuns: nextRuns,
        logs: [...logs, ...state.logs].slice(0, 300),
        approvals: approvals.length ? [...approvals, ...state.approvals] : state.approvals,
        memory: memoryWrites.length ? [...memoryWrites, ...state.memory] : state.memory,
        agents: state.agents.map((a) =>
          a.id === run.agentId
            ? {
              ...a,
              status: run.status === "awaiting_approval" ? "awaiting" : run.status === "failed" ? "error" : "running",
              currentTask: run.status === "awaiting_approval"
                ? `Awaiting approval - ${run.steps.find((s) => s.state === "active")?.name ?? "action"}`
                : run.status === "completed"
                  ? `Completed run ${run.id.slice(-6)}`
                  : run.status === "failed"
                    ? `Blocked - ${run.steps.find((s) => s.state === "failed")?.blockedReason ?? "execution failed"}`
                    : a.currentTask,
              stats: run.status === "completed"
                ? {
                  ...a.stats,
                  totalRuns: a.stats.totalRuns + 1,
                  actionsThisWeek: a.stats.actionsThisWeek + 1,
                }
                : a.stats,
            }
            : a
        ),
      };
    }
    case "UPSERT_RUN":
      return {
        ...state,
        agentRuns: state.agentRuns.map((r) => (r.id === action.run.id ? action.run : r)),
      };
    case "ADD_MEMORY":
      return {
        ...state,
        memory: [...action.entries, ...state.memory],
      };
    default:
      return state;
  }
}

interface OSContextValue {
  state: OSState;
  entitlements: Entitlements;
  completeOnboarding: (input: {
    companyName: string;
    websiteUrl: string;
    companySize: string;
    industry: string;
    mainGoals: string[];
    preferredOperator: string;
    preferredDemoPath?: NonNullable<OnboardingState["preferredDemoPath"]>;
    safetyMode?: "safe" | "assisted";
    approvalOwner: string;
    initialConnectors: string[];
  }) => void;
  deployAgent: (config: DeployConfig) => Agent;
  runAgent: (agentId: string) => void;
  runWorkflow: (workflowId: string) => void;
  approveItem: (approvalId: string, runId?: string, agentId?: string) => void | Promise<void>;
  skipItem: (approvalId: string, runId?: string, agentId?: string) => void;
  toggleAgentPause: (agentId: string) => void;
  setConnectorConnected: (connectorId: string, connected: boolean) => void;
  connectConnector: (connectorId: string, mode?: "preview" | "real") => void;
  disconnectConnector: (connectorId: string) => void;
  testConnector: (connectorId: string) => void;
  resyncConnector: (connectorId: string) => void;
  updateConnectorPermissions: (connectorId: string, operatorsAllowed: string[]) => void;
  upsertPolicy: (policy: Policy) => void;
  setPolicyActive: (policyId: string, active: boolean) => void;
  inviteMember: (input: { email: string; role: string; permissions: string[] }) => void;
  updateMember: (memberId: string, patch: Partial<TeamMember>) => void;
  updateSettingsSection: <K extends keyof OSSettings>(section: K, value: OSSettings[K]) => void;
  updateActivation: (patch: Partial<NonNullable<OSSettings["activation"]>>) => void;
  updateCurrentUser: (patch: Partial<CurrentUser>) => void;
  setDashboardPrefs: (value: Partial<DashboardState>) => void;
  updateWorkspace: (patch: Partial<Workspace>) => void;
  appendExecutionLog: (event: string, message: string, status?: ExecutionLog["status"]) => void;
  installSuggestedWorkflow: (suggestion: SuggestedWorkflow) => void;
  pendingApprovals: number;
  clientHydrated: boolean;
  workspaceLoadError: string | null;
}

const OSContext = createContext<OSContextValue | null>(null);

function toInitials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function logEntry(message: string, event: string, status: ExecutionLog["status"] = "ok"): ExecutionLog {
  return {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    runId: "manual",
    agentId: "system",
    agentMark: "OS",
    agentColor: "#4DE8E1",
    event,
    message,
    duration: "-",
    status,
  };
}

function makePreviewRun(agent: Agent, goal: string, workflowId?: string): AgentRuntimeResult {
  const runId = `run-preview-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const run: AgentRun = {
    id: runId,
    agentId: agent.id,
    agentMark: agent.mark,
    agentColor: agent.color,
    agentName: agent.name,
    workflowId,
    status: "completed",
    startedAt: nowIso,
    completedAt: nowIso,
    steps: [
      { id: `${runId}-1`, name: "Load demo context", sub: "Preview workspace context", state: "done", riskLevel: "low", output: "Loaded" },
      { id: `${runId}-2`, name: "Build execution plan", sub: "Deterministic demo planning", state: "done", riskLevel: "low", output: "Planned 4 demo steps" },
      { id: `${runId}-3`, name: "Run mock actions", sub: "No real connector execution", state: "done", riskLevel: "medium", output: "Mock actions completed" },
      { id: `${runId}-4`, name: "Write preview logs", sub: "Preview-mode execution trace", state: "done", riskLevel: "low", output: "Logged" },
    ],
    triggeredBy: "manual",
    output: {
      type: "preview_demo_result",
      title: `${agent.name} preview run`,
      summary: `Demo run completed in preview mode for goal: ${goal}`,
    },
  };
  const logs: ExecutionLog[] = [
    {
      id: `log-${Date.now()}-preview`,
      ts,
      runId,
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      event: "preview.demo_run",
      message: "Demo run completed in preview mode",
      duration: "-",
      status: "ok",
    },
    {
      id: `log-${Date.now()}-preview-block`,
      ts,
      runId,
      agentId: agent.id,
      agentMark: agent.mark,
      agentColor: agent.color,
      event: "execution.blocked",
      message: "Real execution requires an active plan",
      duration: "-",
      status: "warn",
    },
  ];
  return { run, logs, approvals: [], memoryWrites: [] };
}

let deployCounter = 0;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => buildSeedState());
  const [clientHydrated, setClientHydrated] = useState(false);
  const [workspaceLoadError, setWorkspaceLoadError] = useState<string | null>(null);
  const hydratedFromRemote = useRef(false);
  const finishedInitialHydration = useRef(false);
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getIdentity = useCallback(() => {
    let devIdentity: { id: string; email: string; name: string } = {
      id: "dev-preview-user",
      email: "preview@inovense.local",
      name: "Preview User",
    };

    if (typeof window !== "undefined") {
      try {
        const canonicalDevUser = window.localStorage.getItem(DEV_USER_KEY);
        const legacyDevUser = window.localStorage.getItem(LEGACY_DEV_USER_KEY);
        const raw = canonicalDevUser ?? legacyDevUser;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<typeof devIdentity>;
          devIdentity = {
            id: parsed.id || devIdentity.id,
            email: parsed.email || devIdentity.email,
            name: parsed.name || devIdentity.name,
          };
          if (!canonicalDevUser && legacyDevUser) {
            reportLegacyMigrationEvent("legacy_dev_user_migrated");
            window.localStorage.setItem(DEV_USER_KEY, legacyDevUser);
          }
        } else {
          window.localStorage.setItem(DEV_USER_KEY, JSON.stringify(devIdentity));
        }
      } catch {
        // Ignore dev identity storage failures.
      }
    }

    return {
      userId: state.currentUser.id || devIdentity.id,
      userEmail: state.currentUser.email || devIdentity.email,
      userName: state.currentUser.name || devIdentity.name,
      // The server derives the active workspace from the verified session.
      // Never let a prior browser snapshot select a production workspace.
      workspaceId: IS_PRODUCTION ? "" : state.workspace.id,
    };
  }, [state.currentUser.email, state.currentUser.id, state.currentUser.name, state.workspace.id]);

  useEffect(() => {
    if (IS_PRODUCTION) {
      setClientHydrated(true);
      return;
    }
    try {
      const sourceKey = localStorage.getItem(STORAGE_KEY)
        ? STORAGE_KEY
        : LEGACY_STORAGE_KEYS.find((key) => localStorage.getItem(key)) ?? STORAGE_KEY;
      const raw = localStorage.getItem(sourceKey);
      if (raw) {
        if (sourceKey !== STORAGE_KEY) {
          reportLegacyMigrationEvent("legacy_storage_migrated");
          localStorage.setItem(STORAGE_KEY, raw);
        }
        const parsed = JSON.parse(raw) as OSState;
        if (Array.isArray(parsed.agents) && parsed.workspace && parsed.currentUser) {
          if (!parsed.onboarding) {
            parsed.onboarding = {
              isComplete: true,
              completedAt: new Date().toISOString(),
              companyName: parsed.workspace.name,
              websiteUrl: "",
              companySize: "",
              industry: "",
              mainGoals: [],
              preferredOperator: "",
              approvalOwner: parsed.currentUser.email,
              initialConnectors: parsed.connectors.filter((c) => c.isConnected).map((c) => c.id),
            };
          }
          dispatch({ type: "HYDRATE", state: parsed });
        }
      }
    } catch {
      reportLegacyMigrationEvent("migration_fallback_failed");
      // Ignore invalid storage.
    } finally {
      setClientHydrated(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromSupabase = async () => {
      try {
        const identity = getIdentity();
        const params = new URLSearchParams({
          workspaceId: identity.workspaceId || "",
          userId: identity.userId || "",
          userEmail: identity.userEmail || "",
          userName: identity.userName || "",
        });
        const res = await fetch(`/api/os/state?${params.toString()}`, { cache: "no-store" });
        if (cancelled) return;

        if (!res.ok) {
          if (IS_PRODUCTION && res.status !== 503) {
            const payload = await res.json().catch(() => ({} as { error?: string }));
            setWorkspaceLoadError(payload.error || "Your workspace access could not be verified.");
          }
          if (res.status === 503) {
            const payload = await res.json().catch(() => ({} as { message?: string }));
            if (payload?.message) {
              console.warn(`[inovense-os] ${payload.message}`);
            }
          }
          finishedInitialHydration.current = true;
          return;
        }

        const payload = await res.json() as { state?: OSState };
        if (payload.state && Array.isArray(payload.state.agents) && payload.state.workspace) {
          dispatch({ type: "HYDRATE", state: payload.state });
          hydratedFromRemote.current = true;
          setWorkspaceLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[inovense-os] Supabase hydrate failed, continuing with local state.", error);
          if (IS_PRODUCTION) setWorkspaceLoadError("Your workspace could not be loaded. Refresh to try again.");
        }
      } finally {
        if (!cancelled) {
          finishedInitialHydration.current = true;
        }
      }
    };

    hydrateFromSupabase();

    return () => {
      cancelled = true;
    };
  // Initial bootstrap only. State updates are persisted separately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage failures.
    }
  }, [state]);

  useEffect(() => {
    if (!finishedInitialHydration.current) return;
    if (IS_PRODUCTION && !hydratedFromRemote.current) return;
    if (persistTimeout.current) {
      clearTimeout(persistTimeout.current);
    }
    persistTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/os/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        });
        if (res.status === 503) {
          const payload = await res.json().catch(() => ({} as { message?: string }));
          if (payload?.message && !hydratedFromRemote.current) {
            console.warn(`[inovense-os] ${payload.message}`);
          }
        }
      } catch (error) {
        console.warn("[inovense-os] Supabase persist failed, state remains local.", error);
      }
    }, 450);

    return () => {
      if (persistTimeout.current) clearTimeout(persistTimeout.current);
    };
  }, [state]);

  const deployAgent = useCallback((config: DeployConfig): Agent => {
    const template = AGENT_TEMPLATES[config.templateId];
    if (!template) throw new Error(`Unknown template: ${config.templateId}`);
    const id = `agent-${config.templateId.slice(0, 2).toUpperCase()}-${Date.now()}-${++deployCounter}`;
    const agent: Agent = {
      id,
      name: config.name || template.name,
      mark: template.mark,
      color: template.color,
      templateId: config.templateId,
      status: "running",
      workspaceId: state.workspace.id,
      currentTask: "Initializing agent...",
      deployedAt: new Date().toISOString(),
      config: {
        tools: config.tools ? config.tools.split(",").map((t) => t.trim()) : template.allowedTools,
        primaryWorkflow: config.workflow || undefined,
        approvalPolicy: config.approvalPolicy,
        memoryScope: [],
      },
      stats: { actionsThisWeek: 0, outputsThisWeek: 0, totalRuns: 0, metricLabel: "actions/wk", metricValue: "0" },
    };
    dispatch({ type: "DEPLOY_AGENT", agent });
    return agent;
  }, [state.workspace.id]);

  const completeOnboarding = useCallback((input: {
    companyName: string;
    websiteUrl: string;
    companySize: string;
    industry: string;
    mainGoals: string[];
    preferredOperator: string;
    preferredDemoPath?: NonNullable<OnboardingState["preferredDemoPath"]>;
    safetyMode?: "safe" | "assisted";
    approvalOwner: string;
    initialConnectors: string[];
  }) => {
    const nowIso = new Date().toISOString();
    const approvalEmail = input.approvalOwner.includes("@") ? input.approvalOwner : `${input.approvalOwner.toLowerCase().replace(/\s+/g, ".")}@${input.websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "company.com"}`;
    const currentUser: CurrentUser = {
      ...state.currentUser,
      email: approvalEmail,
      roleLabel: "Owner",
      initials: toInitials(state.currentUser.name),
    };
    dispatch({
      type: "COMPLETE_ONBOARDING",
      onboarding: {
        isComplete: true,
        completedAt: nowIso,
        companyName: input.companyName,
        websiteUrl: input.websiteUrl,
        companySize: input.companySize,
        industry: input.industry,
        mainGoals: input.mainGoals,
        preferredOperator: input.preferredOperator,
        preferredDemoPath: input.preferredDemoPath ?? "operations",
        approvalOwner: input.approvalOwner,
        initialConnectors: input.initialConnectors,
      },
      workspace: {
        ...state.workspace,
        name: input.companyName,
        environment: "production",
      },
      currentUser,
      connectors: input.initialConnectors,
      preferredOperator: input.preferredOperator,
      preferredDemoPath: input.preferredDemoPath ?? "operations",
      safetyMode: input.safetyMode ?? "safe",
      mainGoals: input.mainGoals,
      approvalOwner: input.approvalOwner,
    });
  }, [state.currentUser, state.workspace]);

  const runAgent = useCallback((agentId: string) => {
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return;
    if (!getEntitlements(state.workspace).canRunRealActions) {
      dispatch({ type: "APPLY_RUNTIME_RESULT", result: makePreviewRun(agent, "Follow up new inbound lead") });
      return;
    }
    const result = runAgentRuntime({
      state,
      agentId: agent.id,
      goal: "Follow up new inbound lead",
      context: {
      email: "inbound@northwind.co",
      company: "Northwind Co.",
      },
    });
    dispatch({ type: "APPLY_RUNTIME_RESULT", result });
  }, [state]);

  const runWorkflow = useCallback((workflowId: string) => {
    const workflow = state.workflows.find((w) => w.id === workflowId);
    if (!workflow) return;
    const agent = state.agents.find((a) => a.id === workflow.agentId);
    if (!agent || agent.status === "paused") return;
    if (!getEntitlements(state.workspace).canRunRealActions) {
      dispatch({ type: "RUN_WORKFLOW", workflowId });
      dispatch({ type: "APPLY_RUNTIME_RESULT", result: makePreviewRun(agent, `Run workflow ${workflow.name}`, workflow.id) });
      return;
    }
    const result = runAgentRuntime({
      state,
      agentId: agent.id,
      workflowId: workflow.id,
      goal: `Run workflow ${workflow.name}`,
      context: {
      email: "inbound@northwind.co",
      company: "Northwind Co.",
      },
    });
    dispatch({ type: "RUN_WORKFLOW", workflowId });
    dispatch({ type: "APPLY_RUNTIME_RESULT", result });
  }, [state]);

  const approveItem = useCallback(async (approvalId: string, runId?: string, agentId?: string) => {
    const approval = state.approvals.find((a) => a.id === approvalId);
    const continuation = approval?.continuationPayload as { kind?: string } | undefined;
    if (
      approval
      && (continuation?.kind === "gmail.send_after_approval" || continuation?.kind === "slack.send_after_approval")
      && getEntitlements(state.workspace).canRunRealActions
    ) {
      try {
        const res = await fetch(`/api/approvals/${approvalId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: state.workspace.id,
            userId: state.currentUser.id,
            userEmail: state.currentUser.email,
          }),
        });
        const json = await res.json().catch(() => ({} as { error?: string }));
        if (!res.ok) {
          dispatch({ type: "APPEND_LOG", log: logEntry(json.error || "Approved action failed", `${continuation.kind}.blocked`, "warn") });
          return;
        }
        dispatch({ type: "APPEND_LOG", log: logEntry(continuation.kind === "slack.send_after_approval" ? "Slack message sent after approval" : "Gmail draft sent after approval", `${continuation.kind}.completed`, "ok") });
      } catch {
        dispatch({ type: "APPEND_LOG", log: logEntry("Network error while executing approved action", `${continuation.kind}.blocked`, "warn") });
        return;
      }
    }
    if (approval) {
      const continuation = continueRunAfterApproval(state, approval, true);
      if (continuation) {
        dispatch({ type: "APPLY_RUNTIME_RESULT", result: continuation });
      }
    }
    dispatch({ type: "APPROVE", approvalId, runId: runId ?? approval?.runId, agentId: agentId ?? approval?.agentId ?? "" });
  }, [state]);

  const skipItem = useCallback((approvalId: string, runId?: string, agentId?: string) => {
    const approval = state.approvals.find((a) => a.id === approvalId);
    if (approval) {
      const continuation = continueRunAfterApproval(state, approval, false);
      if (continuation) {
        dispatch({ type: "APPLY_RUNTIME_RESULT", result: continuation });
      }
    }
    dispatch({ type: "SKIP", approvalId, runId: runId ?? approval?.runId, agentId: agentId ?? approval?.agentId ?? "" });
  }, [state]);

  const toggleAgentPause = useCallback((agentId: string) => {
    dispatch({ type: "TOGGLE_AGENT_PAUSE", agentId });
  }, []);

  const setConnectorConnected = useCallback((connectorId: string, connected: boolean) => {
    const connector: Connector | undefined = state.connectors.find((c) => c.id === connectorId);
    if (!connector) return;
    dispatch({
      type: "UPDATE_CONNECTOR",
      connectorId,
      patch: {
        isConnected: connected,
        status: connected ? "connected" : "available",
        health: connected ? "healthy" : "disabled",
        lastSync: connected ? "just now" : "-",
        lastSynced: connected ? new Date().toISOString() : "",
      },
      log: logEntry(`${connector.name} ${connected ? "connected" : "disconnected"} by operator`, connected ? "connector.connected" : "connector.disconnected", connected ? "ok" : "warn"),
    });
  }, [state.connectors]);

  const connectConnector = useCallback((connectorId: string, mode: "preview" | "real" = "preview") => {
    const entitlement = getEntitlements(state.workspace);
    const connector = state.connectors.find((c) => c.id === connectorId);
    if (!connector) return;
    if (mode === "preview") {
      dispatch({
        type: "APPEND_LOG",
        log: logEntry(`Preview connector state blocked for ${connector.name}. Connectors require real OAuth or managed auth.`, "connector.preview_connect_blocked", "warn"),
      });
      return;
    }
    if (mode === "real" && !entitlement.canUseRealConnectors) {
      dispatch({
        type: "APPEND_LOG",
        log: logEntry(`Blocked real connector connect for ${connector.name}. Real execution requires an active plan.`, "connector.real_connect_blocked", "warn"),
      });
      return;
    }
    setConnectorConnected(connectorId, true);
    dispatch({
      type: "UPDATE_CONNECTOR",
      connectorId,
      patch: {
        records: connector.records,
        source: connectorId === "gmail" ? "native" : "nango",
      },
    });
  }, [setConnectorConnected, state.connectors, state.workspace]);

  const disconnectConnector = useCallback((connectorId: string) => {
    setConnectorConnected(connectorId, false);
  }, [setConnectorConnected]);

  const testConnector = useCallback((connectorId: string) => {
    const connector = state.connectors.find((c) => c.id === connectorId);
    if (!connector) return;
    dispatch({
      type: "UPDATE_CONNECTOR",
      connectorId,
      patch: {
        health: connector.isConnected ? "healthy" : "disabled",
        authErrors: connector.isConnected ? 0 : connector.authErrors + 1,
        recentSyncEvents: [
          connector.isConnected ? "Connection test passed" : "Connection test failed (not connected)",
          ...connector.recentSyncEvents,
        ].slice(0, 5),
      },
      log: logEntry(`Tested ${connector.name} connection`, "connector.tested", connector.isConnected ? "ok" : "warn"),
    });
  }, [state.connectors]);

  const resyncConnector = useCallback((connectorId: string) => {
    const connector = state.connectors.find((c) => c.id === connectorId);
    if (!connector) return;
    const nowIso = new Date().toISOString();
    dispatch({
      type: "UPDATE_CONNECTOR",
      connectorId,
      patch: {
        lastSync: "just now",
        lastSynced: nowIso,
        eventsSynced: connector.eventsSynced + Math.floor(Math.random() * 120 + 24),
        recentSyncEvents: [`Manual resync completed at ${new Date(nowIso).toLocaleTimeString("en-GB")}`, ...connector.recentSyncEvents].slice(0, 5),
      },
      log: logEntry(`Resynced ${connector.name}`, "connector.resynced", "ok"),
    });
  }, [state.connectors]);

  const updateConnectorPermissions = useCallback((connectorId: string, operatorsAllowed: string[]) => {
    const connector = state.connectors.find((c) => c.id === connectorId);
    if (!connector) return;
    dispatch({
      type: "UPDATE_CONNECTOR",
      connectorId,
      patch: { operatorsAllowed },
      log: logEntry(`Updated ${connector.name} operator permissions`, "connector.permissions_updated", "ok"),
    });
  }, [state.connectors]);

  const upsertPolicy = useCallback((policy: Policy) => {
    dispatch({ type: "UPSERT_POLICY", policy, log: logEntry(`Policy ${policy.name} updated`, "policy_updated") });
  }, []);

  const setPolicyActive = useCallback((policyId: string, active: boolean) => {
    const policy = state.policies.find((p) => p.id === policyId);
    if (!policy) return;
    dispatch({
      type: "SET_POLICY_ACTIVE",
      policyId,
      active,
      log: logEntry(`Policy ${policy.name} ${active ? "enabled" : "disabled"}`, "policy_toggled", active ? "ok" : "warn"),
    });
  }, [state.policies]);

  const inviteMember = useCallback((input: { email: string; role: string; permissions: string[] }) => {
    const base = input.email.split("@")[0].replace(/[._-]/g, " ").trim();
    const name = base.split(" ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    const member: TeamMember = {
      id: `tm-${Date.now()}`,
      email: input.email,
      name,
      role: input.role,
      initials: toInitials(name || input.email),
      color: "#7EF6F0",
      access: input.permissions,
      status: "pending",
      active: true,
    };
    dispatch({ type: "INVITE_MEMBER", member, log: logEntry(`Invited ${input.email} as ${input.role}`, "team_invite") });
  }, []);

  const updateMember = useCallback((memberId: string, patch: Partial<TeamMember>) => {
    const existing = state.teamMembers.find((m) => m.id === memberId);
    if (!existing) return;
    dispatch({ type: "UPDATE_MEMBER", memberId, patch, log: logEntry(`Updated member ${existing.email}`, "team_member_updated") });
  }, [state.teamMembers]);

  const updateSettingsSection = useCallback(<K extends keyof OSSettings>(section: K, value: OSSettings[K]) => {
    dispatch({ type: "SET_SETTINGS_SECTION", section, value, log: logEntry(`Updated ${String(section)} settings`, "settings_updated") });
  }, []);

  const updateActivation = useCallback((patch: Partial<NonNullable<OSSettings["activation"]>>) => {
    const current = state.settings.activation ?? { preferredDemoPath: state.onboarding.preferredDemoPath ?? "operations" };
    dispatch({
      type: "SET_ACTIVATION",
      value: { ...current, ...patch },
      log: logEntry("Activation progress updated", "activation.updated"),
    });
  }, [state.onboarding.preferredDemoPath, state.settings.activation]);

  const updateCurrentUser = useCallback((patch: Partial<CurrentUser>) => {
    const value = { ...state.currentUser, ...patch };
    value.initials = toInitials(value.name);
    dispatch({ type: "SET_CURRENT_USER", value, log: logEntry("Profile updated", "profile_updated") });
  }, [state.currentUser]);

  const setDashboardPrefs = useCallback((value: Partial<DashboardState>) => {
    dispatch({ type: "SET_DASHBOARD", value: { ...state.dashboard, ...value } });
  }, [state.dashboard]);

  const updateWorkspace = useCallback((patch: Partial<Workspace>) => {
    const value = { ...state.workspace, ...patch };
    dispatch({ type: "SET_WORKSPACE", value, log: logEntry("Workspace settings updated", "workspace_updated") });
  }, [state.workspace]);

  const appendExecutionLog = useCallback((event: string, message: string, status: ExecutionLog["status"] = "ok") => {
    dispatch({ type: "APPEND_LOG", log: logEntry(message, event, status) });
  }, []);

  const installSuggestedWorkflow = useCallback((suggestion: SuggestedWorkflow) => {
    const workflow = installWorkflowFromSuggestion(state, suggestion);
    dispatch({
      type: "INSTALL_WORKFLOW",
      workflow,
      log: logEntry(`Installed suggested workflow: ${suggestion.title}`, "workflow.suggestion_installed"),
    });
  }, [state]);

  const pendingApprovals = state.approvals.filter((a) => a.status === "pending").length;
  const entitlements = getEntitlements(state.workspace);

  return (
    <OSContext.Provider
      value={{
        state,
        entitlements,
        completeOnboarding,
        deployAgent,
        runAgent,
        runWorkflow,
        approveItem,
        skipItem,
        toggleAgentPause,
        setConnectorConnected,
        connectConnector,
        disconnectConnector,
        testConnector,
        resyncConnector,
        updateConnectorPermissions,
        upsertPolicy,
        setPolicyActive,
        inviteMember,
        updateMember,
        updateSettingsSection,
        updateActivation,
        updateCurrentUser,
        setDashboardPrefs,
        updateWorkspace,
        appendExecutionLog,
        installSuggestedWorkflow,
        pendingApprovals,
        clientHydrated,
        workspaceLoadError,
      }}
    >
      {children}
    </OSContext.Provider>
  );
}

export function useOS(): OSContextValue {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error("useOS must be used within AppProvider");
  return ctx;
}
