/** Canonical human workspace roles. AI operator names are a separate product dimension. */
export type WorkspaceRole = "owner" | "admin" | "reviewer" | "member" | "viewer";

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  reviewer: "Reviewer",
  member: "Member",
  viewer: "Viewer",
};

export const WORKSPACE_ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  owner: "Full workspace access, including billing and member management.",
  admin: "Manage members, settings, connectors, operators, and policy controls.",
  reviewer: "Review approval-gated work without changing workspace controls.",
  member: "Use permitted operators and view their outputs.",
  viewer: "View permitted workspace outputs and context.",
};

export const WORKSPACE_ROLE_CAPABILITIES: Record<WorkspaceRole, string[]> = {
  owner: ["All workspace access"],
  admin: ["Operators", "Approvals", "Settings", "Connectors"],
  reviewer: ["Approvals", "Outputs"],
  member: ["Operators", "Outputs"],
  viewer: ["View only"],
};

export const INVITABLE_WORKSPACE_ROLES: WorkspaceRole[] = ["viewer", "member", "reviewer", "admin"];

export function normalizeWorkspaceRole(roleKey: string | null | undefined, legacyRole?: string | null): WorkspaceRole {
  if (roleKey === "owner" || roleKey === "admin" || roleKey === "reviewer" || roleKey === "member" || roleKey === "viewer") return roleKey;
  if (legacyRole === "Owner") return "owner";
  if (legacyRole === "Admin" || legacyRole === "Operator - Admin") return "admin";
  if (legacyRole === "Reviewer" || legacyRole === "Operator - Reviewer") return "reviewer";
  if (legacyRole === "Viewer" || legacyRole === "Operator - Viewer") return "viewer";
  return "member";
}

/** Legacy columns still have a database check constraint; keep their values internal. */
export function legacyRoleLabel(role: WorkspaceRole): string {
  if (role === "owner" || role === "admin") return "Operator - Admin";
  if (role === "reviewer") return "Operator - Reviewer";
  return "Operator - Viewer";
}

export function roleLabel(roleKey: string | null | undefined, legacyRole?: string | null): string {
  return WORKSPACE_ROLE_LABELS[normalizeWorkspaceRole(roleKey, legacyRole)];
}

export function canManageMembers(role: WorkspaceRole): boolean { return role === "owner" || role === "admin"; }
export function canManageWorkspace(role: WorkspaceRole): boolean { return role === "owner" || role === "admin"; }
export function canManageConnectors(role: WorkspaceRole): boolean { return role === "owner" || role === "admin"; }
export function canManageOperators(role: WorkspaceRole): boolean { return role === "owner" || role === "admin"; }
export function canManagePolicies(role: WorkspaceRole): boolean { return role === "owner" || role === "admin"; }
export function canApprove(role: WorkspaceRole): boolean { return role === "owner" || role === "admin" || role === "reviewer"; }
export function canManageBilling(role: WorkspaceRole): boolean { return role === "owner" || role === "admin"; }
export function canViewInsights(role: WorkspaceRole): boolean { void role; return true; }
export function canViewLogs(role: WorkspaceRole): boolean { void role; return true; }

/** An admin can manage lower roles; only the owner can manage admins. */
export function canManageTarget(actor: WorkspaceRole, target: WorkspaceRole): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  return actor === "admin" && target !== "admin";
}
