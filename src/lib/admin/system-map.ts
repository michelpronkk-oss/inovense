// Auterim internal System Map — architecture graph data source.
//
// Single source of truth for the /admin/system-map page. Truthful by
// construction: operator and connector status is derived from the real
// registries (src/lib/operators/registry.ts, src/lib/connectors/registry.ts)
// rather than hand-typed, so this file cannot drift from what the platform
// actually ships. Governance/business/infrastructure nodes have no live
// registry (they are architectural concepts, not catalog rows) and are
// authored as static, factual descriptions of systems that genuinely exist
// in this codebase today.
//
// SAFETY: this module contains architecture metadata only. No secrets,
// tokens, connection strings, project IDs, or customer data may ever be
// added here. It is imported only by the server-rendered admin page, which
// passes the resulting plain objects as props into the client canvas — the
// registries themselves are never bundled into the client.
//
// Michel is the only human node on the map today. `SystemMapNodeKind`
// includes a generic "human" kind (currently only used once) so a future
// teammate node can be added later without redesigning the node/type model.

import { OPERATOR_REGISTRY, type OperatorKey } from "@/lib/operators/registry";
import { listConnectors } from "@/lib/connectors/registry";
import { pricingPlans } from "@/lib/pricing";

export type SystemMapStatus = "live" | "partial" | "planned" | "needs_attention";

export type SystemMapNodeKind =
  | "human"
  | "platform"
  | "category"
  | "system"
  | "operator"
  | "connector"
  | "governance"
  | "infrastructure"
  | "roadmap";

export type SystemMapBranchId = "product" | "operators" | "connectors" | "governance" | "business" | "infrastructure";

export type SystemMapNode = {
  id: string;
  kind: SystemMapNodeKind;
  label: string;
  subtitle?: string;
  status?: SystemMapStatus;
  description: string;
  responsibility?: string;
  dependencies?: string[];
  relatedRoute?: string;
  notes?: string;
  branch?: SystemMapBranchId;
  parentId: string | null;
  position: { x: number; y: number };
};

export type SystemMapEdgeKind = "hierarchy" | "dependency";

export type SystemMapEdge = {
  id: string;
  source: string;
  target: string;
  kind: SystemMapEdgeKind;
};

export type SystemMapBranch = {
  id: SystemMapBranchId;
  label: string;
  description: string;
};

// ── Layout constants ─────────────────────────────────────────────────────
// Deterministic, hand-computed top-down layered layout. The graph is small
// and fixed (a few dozen nodes known in advance), so a dagre/elkjs
// auto-layout dependency was judged unnecessary — a simple tiered x/y grid,
// computed once here, is simpler and fully predictable.

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 96;
const BRANCH_Y = 340;
const CHILD_BASE_Y = 460;
const ROOT_X = 640;

const BRANCH_ORDER: SystemMapBranchId[] = ["product", "operators", "connectors", "governance", "business", "infrastructure"];

function branchX(branch: SystemMapBranchId): number {
  return BRANCH_ORDER.indexOf(branch) * COLUMN_WIDTH;
}

export const SYSTEM_MAP_BRANCHES: SystemMapBranch[] = [
  { id: "product", label: "Product", description: "The workspace surfaces a business actually uses day to day." },
  { id: "operators", label: "Operators", description: "The AI workforce units that do the real work, under approval control." },
  { id: "connectors", label: "Connectors", description: "The outside systems operators can read from and act into." },
  { id: "governance", label: "Governance", description: "The control layer that keeps every action safe, approved, and logged." },
  { id: "business", label: "Business", description: "Pricing, billing, and the customer-facing support loop." },
  { id: "infrastructure", label: "Infrastructure", description: "The vendors Auterim itself runs on." },
];

const LIVE_OPERATOR_KEYS: OperatorKey[] = ["revenue", "client_flow", "operations"];

const OPERATOR_ADMIN_NOTES: Record<string, string> = {
  revenue: "Qualifies inbound demand, drafts follow-ups, and keeps CRM next steps current across Gmail/Microsoft 365, HubSpot, and Salesforce context.",
  client_flow: "Drafts client updates and onboarding messages without losing approval control, using Gmail/Microsoft 365, Trello, and Microsoft Teams channel context.",
  operations: "Monitors Trello boards, Slack, and Microsoft Teams channels for stalled or blocked work and prepares approval-gated follow-through.",
};

function toTitle(kebab: string): string {
  return kebab.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

// ── Nodes ────────────────────────────────────────────────────────────────

function buildRootNodes(): SystemMapNode[] {
  return [
    {
      id: "founder-michel",
      kind: "human",
      label: "Michel",
      subtitle: "Founder / Super Admin",
      status: "live",
      description: "The founder and internal super admin account for Auterim. Holds full internal command-center access.",
      responsibility: "Owns the product, the platform, and every internal control surface.",
      parentId: null,
      position: { x: ROOT_X, y: 0 },
    },
    {
      id: "platform-auterim",
      kind: "platform",
      label: "Auterim",
      subtitle: "AI Workforce Platform",
      status: "live",
      description: "Connects to a business, understands it, diagnoses where time/money/opportunity is lost, recommends the right AI workforce, deploys it with controls, and measures impact.",
      responsibility: "The root product this entire map describes.",
      parentId: "founder-michel",
      position: { x: ROOT_X, y: 150 },
    },
  ];
}

function buildBranchNodes(): SystemMapNode[] {
  return SYSTEM_MAP_BRANCHES.map((branch) => ({
    id: `branch-${branch.id}`,
    kind: "category",
    label: branch.label,
    status: "live",
    description: branch.description,
    branch: branch.id,
    parentId: "platform-auterim",
    position: { x: branchX(branch.id), y: BRANCH_Y },
  }));
}

// ── Product branch ───────────────────────────────────────────────────────

function buildProductNodes(): SystemMapNode[] {
  const items: Array<Pick<SystemMapNode, "id" | "label" | "description" | "responsibility">> = [
    { id: "product-dashboard", label: "Workspace Dashboard", description: "The workspace home a customer lands on: setup state, connectors, and active operators.", responsibility: "Orient the business inside its own workspace." },
    { id: "product-agents", label: "Agents Surface", description: "Where the live operators (Revenue, Client Flow, Operations) run and report their work.", responsibility: "Day-to-day operator activity." },
    { id: "product-onboarding", label: "Onboarding & Activation", description: "Guides a new workspace from signup through first connector and first operator activation.", responsibility: "Get a workspace from signed-up to running." },
    { id: "product-insights", label: "Insights", description: "Read-only view of what operators found and prepared, surfaced back to the business.", responsibility: "Make operator output legible to a non-technical owner." },
    { id: "product-logs", label: "Activity Logs", description: "Append-only record of operator actions, approvals, and connector events for a workspace.", responsibility: "Auditability for every workspace." },
    { id: "product-team", label: "Team & Access", description: "Workspace membership, invites, and role-based access inside a customer account.", responsibility: "Who inside a customer's business can see and approve what." },
  ];
  return items.map((item, index) => ({
    ...item,
    kind: "system",
    status: "live",
    branch: "product",
    parentId: "branch-product",
    position: { x: branchX("product"), y: CHILD_BASE_Y + index * ROW_HEIGHT },
  }));
}

// ── Operators branch (real registry) ────────────────────────────────────

function buildOperatorNodes(): SystemMapNode[] {
  const liveOperators = OPERATOR_REGISTRY.filter((op) => LIVE_OPERATOR_KEYS.includes(op.key));
  const futureCount = OPERATOR_REGISTRY.length - liveOperators.length;

  const liveNodes: SystemMapNode[] = LIVE_OPERATOR_KEYS.map((key, index) => {
    const definition = OPERATOR_REGISTRY.find((op) => op.key === key);
    if (!definition) throw new Error(`System map: missing operator definition for "${key}"`);
    return {
      id: `operator-${definition.key}`,
      kind: "operator",
      label: definition.name,
      subtitle: toTitle(definition.category),
      status: "live",
      description: definition.description,
      responsibility: definition.businessOutcome,
      dependencies: [...definition.requiredConnectors, ...definition.optionalConnectors].map(toTitle),
      relatedRoute: "/operators",
      notes: OPERATOR_ADMIN_NOTES[definition.key],
      branch: "operators",
      parentId: "branch-operators",
      position: { x: branchX("operators"), y: CHILD_BASE_Y + index * ROW_HEIGHT },
    };
  });

  const futureNode: SystemMapNode = {
    id: "operator-future",
    kind: "roadmap",
    label: "Future operators",
    subtitle: `${futureCount} planned or in preview`,
    status: "planned",
    description: "Every other operator in the registry (Marketing, Proposal & Quote, Finance & Billing, and more) is either in preview or planned, none are live yet.",
    responsibility: "Roadmap surface for operators not yet shipped to customers.",
    relatedRoute: "/operators",
    branch: "operators",
    parentId: "branch-operators",
    position: { x: branchX("operators"), y: CHILD_BASE_Y + liveNodes.length * ROW_HEIGHT },
  };

  return [...liveNodes, futureNode];
}

// ── Connectors branch (real registry) ───────────────────────────────────

const REPRESENTED_CONNECTOR_KEYS = ["gmail", "google_drive", "microsoft", "microsoft_teams", "hubspot", "salesforce", "slack", "trello", "asana", "jira", "zendesk", "intercom"];

function deriveConnectorStatus(connectorKey: string, status: string, writeActionsCount: number): SystemMapStatus {
  if (status !== "available") return "planned";
  if (connectorKey === "google_drive") return "live";
  if (writeActionsCount === 0) return "partial";
  return "live";
}

function buildConnectorNodes(): SystemMapNode[] {
  const all = listConnectors();
  const represented = REPRESENTED_CONNECTOR_KEYS.map((key) => {
    const def = all.find((c) => c.connectorKey === key);
    if (!def) throw new Error(`System map: missing connector definition for "${key}"`);
    return def;
  });
  const plannedCount = all.filter((c) => c.status !== "available").length;

  const connectorNodes: SystemMapNode[] = represented.map((def, index) => ({
    id: `connector-${def.connectorKey}`,
    kind: "connector",
    label: def.displayName,
    subtitle: def.category.replace("_", " "),
    status: deriveConnectorStatus(def.connectorKey, def.status, def.writeActions.length),
    description: def.description,
    responsibility: def.writeActions.length === 0 ? "Read-only context, no write actions are enabled." : "Read context, act only after approval.",
    dependencies: def.usedByOperators.filter((op) => LIVE_OPERATOR_KEYS.includes(op)).map(toTitle),
    relatedRoute: "/connectors",
    notes: def.setupNotes,
    branch: "connectors",
    parentId: "branch-connectors",
    position: { x: branchX("connectors"), y: CHILD_BASE_Y + index * ROW_HEIGHT },
  }));

  const nextNode: SystemMapNode = {
    id: "connector-next",
    kind: "roadmap",
    label: "Next connectors",
    subtitle: `${plannedCount} planned or coming soon`,
    status: "planned",
    description: "The rest of the connector catalog (Notion, Stripe, and more) is planned or coming soon, none are connectable yet.",
    responsibility: "Roadmap surface for connectors not yet live.",
    relatedRoute: "/connectors",
    branch: "connectors",
    parentId: "branch-connectors",
    position: { x: branchX("connectors"), y: CHILD_BASE_Y + connectorNodes.length * ROW_HEIGHT },
  };

  return [...connectorNodes, nextNode];
}

// ── Governance branch (static, factual — real modules, no live registry) ─

function buildGovernanceNodes(): SystemMapNode[] {
  const items: Array<Pick<SystemMapNode, "id" | "label" | "description" | "responsibility" | "notes" | "relatedRoute">> = [
    { id: "gov-approvals", label: "Approvals", description: "Every external or risky action (send email, write CRM record, move a card) routes through an explicit approval step before it executes.", responsibility: "No unattended external action without human sign-off.", notes: "Enforced per-operator via each operator's approvalRequiredActions list.", relatedRoute: "/product" },
    { id: "gov-policies", label: "Policies", description: "Per-workspace rules that define what an operator is and is not allowed to do, beyond the platform's own hard-coded blocked actions.", responsibility: "Let a business narrow operator behavior to its own risk tolerance." },
    { id: "gov-memory", label: "Memory", description: "Structured, reusable business context an operator can read before acting, kept separate from raw customer data.", responsibility: "Give operators consistent context without re-asking the business." },
    { id: "gov-auth-rls", label: "Auth & RLS", description: "Supabase Row Level Security plus workspace-scoped auth checks on every table and route, so one workspace can never read another's data.", responsibility: "Tenant isolation at the data layer." },
    { id: "gov-execution-eligibility", label: "Execution eligibility", description: "Real, billing-derived gate (src/lib/os/execution-eligibility.ts) that decides whether a workspace is currently allowed to run real, non-preview operator work.", responsibility: "Ties real execution to real billing status, not client-supplied state." },
    { id: "gov-operator-activation", label: "Operator activation", description: "Explicit, per-workspace on/off switch (src/lib/operators/activation.ts) for a given operator's unattended scheduled scan.", responsibility: "An operator never runs unattended until a workspace turns it on." },
    { id: "gov-readiness", label: "Readiness", description: "Capability and connector requirement graph (src/lib/operators/readiness.ts, connector-requirements.ts) that computes how ready a workspace is to run a given operator.", responsibility: "Turns connector state into an honest readiness percentage and next setup step." },
    { id: "gov-signal-engine", label: "Signal Engine", description: "Bounded ingestion and candidate processing turns connector events into safe operator signals.", responsibility: "Detect relevant work without storing full provider content.", relatedRoute: "/system-health" },
    { id: "gov-workflow-runtime", label: "Workflow Runtime", description: "Coordinates multi-step work while preserving approval, dependency, and recovery state.", responsibility: "Move prepared work through controlled execution.", relatedRoute: "/product" },
    { id: "gov-execution-layer", label: "Execution Layer", description: "Idempotent execution intents record policy decisions and external write outcomes.", responsibility: "Prevent blind retries and duplicate external actions.", notes: "An uncertain provider result is held for human review.", relatedRoute: "/operators" },
    { id: "gov-outcomes", label: "Outcome Observers", description: "Records observed workflow outcomes and attribution evidence where an observer has run.", responsibility: "Measure confirmed outcomes without inventing causality." },
  ];
  return items.map((item, index) => ({
    ...item,
    kind: "governance",
    status: "live",
    branch: "governance",
    parentId: "branch-governance",
    position: { x: branchX("governance"), y: CHILD_BASE_Y + index * ROW_HEIGHT },
  }));
}

// ── Business branch (static, factual) ────────────────────────────────────

function buildBusinessNodes(): SystemMapNode[] {
  const tiers = pricingPlans.map((plan) => `${plan.plan_name} (${plan.price}${plan.period})`).join(", ");
  const items: Array<Pick<SystemMapNode, "id" | "label" | "description" | "responsibility" | "relatedRoute">> = [
    { id: "biz-pricing", label: "Pricing", description: `Three self-serve tiers: ${tiers}.`, responsibility: "Defines operator/connector/run limits per plan." },
    { id: "biz-billing", label: "Billing", description: "Subscription and payment lifecycle for a workspace, including trial, active, and past-due states.", responsibility: "Drives execution eligibility and plan limits.", relatedRoute: "/revenue" },
    { id: "biz-dodo", label: "Dodo Payments", description: "Payment processor handling checkout and subscription billing events.", responsibility: "Processes real customer payments." },
    { id: "biz-support", label: "Support", description: "Customer support intake and reply flow for workspace owners.", responsibility: "Handle customer-reported issues.", relatedRoute: "/support" },
    { id: "biz-feedback", label: "Feedback", description: "Customer feedback and roadmap voting captured from inside the product.", responsibility: "Feed real customer signal into the roadmap.", relatedRoute: "/feedback" },
    { id: "biz-roadmap", label: "Roadmap", description: "Public-facing view of what is live, in preview, and planned.", responsibility: "Sets expectations about what Auterim can do today." },
  ];
  return items.map((item, index) => ({
    ...item,
    kind: "system",
    status: "live",
    branch: "business",
    parentId: "branch-business",
    position: { x: branchX("business"), y: CHILD_BASE_Y + index * ROW_HEIGHT },
  }));
}

// ── Infrastructure branch (static, factual) ──────────────────────────────

function buildInfrastructureNodes(): SystemMapNode[] {
  const items: Array<Pick<SystemMapNode, "id" | "label" | "description" | "responsibility">> = [
    { id: "infra-supabase", label: "Supabase", description: "Postgres database, auth, and row-level security for every workspace.", responsibility: "System of record and tenant isolation." },
    { id: "infra-vercel", label: "Vercel", description: "Hosting and deployment for the Next.js app, admin, and marketing site.", responsibility: "Runs the application." },
    { id: "infra-trigger", label: "Trigger.dev", description: "Scheduled and background jobs, including the daily unattended operator scan fanouts.", responsibility: "Runs operator work outside the request/response cycle." },
    { id: "infra-anthropic", label: "Anthropic", description: "Model provider behind operator drafting and reasoning.", responsibility: "Generates operator drafts and summaries." },
    { id: "infra-resend", label: "Resend", description: "Transactional email delivery for the platform itself (not customer inboxes).", responsibility: "Delivers support and product notification email." },
  ];
  return items.map((item, index) => ({
    ...item,
    kind: "infrastructure",
    status: "live",
    branch: "infrastructure",
    parentId: "branch-infrastructure",
    position: { x: branchX("infrastructure"), y: CHILD_BASE_Y + index * ROW_HEIGHT },
  }));
}

// ── Assembled export ─────────────────────────────────────────────────────

export const systemMapNodes: SystemMapNode[] = [
  ...buildRootNodes(),
  ...buildBranchNodes(),
  ...buildProductNodes(),
  ...buildOperatorNodes(),
  ...buildConnectorNodes(),
  ...buildGovernanceNodes(),
  ...buildBusinessNodes(),
  ...buildInfrastructureNodes(),
];

function hierarchyEdges(): SystemMapEdge[] {
  return systemMapNodes
    .filter((node) => node.parentId)
    .map((node) => ({ id: `h-${node.parentId}-${node.id}`, source: node.parentId as string, target: node.id, kind: "hierarchy" as const }));
}

// Explicit, hand-picked dependency edges only — deliberately restrained to
// avoid an unreadable spaghetti graph. Each one reflects a real relationship
// backed by the registries above (usedByOperators / requiredConnectors) or a
// real integration in this codebase (Support/Feedback -> Resend email,
// Billing -> Dodo Payments).
const DEPENDENCY_EDGE_PAIRS: Array<[string, string]> = [
  ["operator-revenue", "connector-gmail"],
  ["operator-revenue", "connector-microsoft"],
  ["operator-revenue", "connector-hubspot"],
  ["operator-revenue", "connector-salesforce"],
  ["operator-client_flow", "connector-google_drive"],
  ["operator-client_flow", "connector-gmail"],
  ["operator-client_flow", "connector-microsoft"],
  ["operator-client_flow", "connector-trello"],
  ["operator-client_flow", "connector-microsoft_teams"],
  ["operator-operations", "connector-trello"],
  ["operator-operations", "connector-asana"],
  ["operator-operations", "connector-jira"],
  ["operator-operations", "connector-slack"],
  ["operator-operations", "connector-microsoft_teams"],
  ["operator-operations", "connector-google_drive"],
  ["operator-revenue", "gov-execution-eligibility"],
  ["operator-revenue", "gov-approvals"],
  ["operator-revenue", "gov-policies"],
  ["operator-revenue", "gov-memory"],
  ["operator-client_flow", "gov-execution-eligibility"],
  ["operator-client_flow", "gov-approvals"],
  ["operator-client_flow", "gov-policies"],
  ["operator-client_flow", "gov-memory"],
  ["operator-operations", "gov-execution-eligibility"],
  ["operator-operations", "gov-approvals"],
  ["operator-operations", "gov-policies"],
  ["operator-operations", "gov-memory"],
  ["operator-revenue", "gov-signal-engine"],
  ["operator-client_flow", "gov-signal-engine"],
  ["operator-operations", "gov-signal-engine"],
  ["operator-revenue", "gov-workflow-runtime"],
  ["operator-client_flow", "gov-workflow-runtime"],
  ["operator-operations", "gov-workflow-runtime"],
  ["gov-workflow-runtime", "gov-execution-layer"],
  ["gov-workflow-runtime", "gov-approvals"],
  ["gov-outcomes", "gov-execution-layer"],
  ["gov-signal-engine", "infra-trigger"],
  ["gov-workflow-runtime", "infra-trigger"],
  ["biz-support", "infra-resend"],
  ["biz-feedback", "infra-resend"],
  ["biz-billing", "biz-dodo"],
];

function dependencyEdges(): SystemMapEdge[] {
  return DEPENDENCY_EDGE_PAIRS.map(([source, target]) => ({ id: `d-${source}-${target}`, source, target, kind: "dependency" as const }));
}

export const systemMapEdges: SystemMapEdge[] = [...hierarchyEdges(), ...dependencyEdges()];

// ── Live counts (header + filters) ───────────────────────────────────────

export type SystemMapCounts = {
  liveOperators: number;
  plannedOperators: number;
  liveConnectors: number;
  partialConnectors: number;
  plannedConnectors: number;
  infrastructureServices: number;
};

export function getSystemMapCounts(): SystemMapCounts {
  const operatorNodes = systemMapNodes.filter((n) => n.kind === "operator");
  const connectorNodes = systemMapNodes.filter((n) => n.kind === "connector");
  return {
    liveOperators: operatorNodes.filter((n) => n.status === "live").length,
    plannedOperators: OPERATOR_REGISTRY.length - operatorNodes.filter((n) => n.status === "live").length,
    liveConnectors: connectorNodes.filter((n) => n.status === "live").length,
    partialConnectors: connectorNodes.filter((n) => n.status === "partial").length,
    plannedConnectors: listConnectors().filter((c) => c.status !== "available").length,
    infrastructureServices: systemMapNodes.filter((n) => n.kind === "infrastructure").length,
  };
}
