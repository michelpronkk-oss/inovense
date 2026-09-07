export type AppNavigationAction = "support" | "feedback";
export type AppNavigationIcon = "dashboard" | "operators" | "workflows" | "approvals" | "connectors" | "memory" | "logs" | "insights" | "team" | "policies" | "apiKeys" | "plans" | "settings" | "support" | "roadmap";

export type AppNavigationItem = {
  id: string;
  label: string;
  icon: AppNavigationIcon;
  href?: string;
  action?: AppNavigationAction;
  mobilePrimary?: boolean;
  badge?: "pendingApprovals";
};

export type AppNavigationSection = { label: "Operations" | "Administration" | "Support"; items: readonly AppNavigationItem[] };

/** One source of truth for the desktop rail and the mobile More sheet. */
export const APP_NAVIGATION_SECTIONS: readonly AppNavigationSection[] = [
  {
    label: "Operations",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/", mobilePrimary: true },
      { id: "operators", label: "Operators", icon: "operators", href: "/agents", mobilePrimary: true },
      { id: "workflows", label: "Workflows", icon: "workflows", href: "/workflows" },
      { id: "approvals", label: "Approvals", icon: "approvals", href: "/approvals", mobilePrimary: true, badge: "pendingApprovals" },
      { id: "connectors", label: "Connectors", icon: "connectors", href: "/connectors", mobilePrimary: true },
      { id: "memory", label: "Memory", icon: "memory", href: "/memory" },
      { id: "logs", label: "Execution logs", icon: "logs", href: "/logs" },
      { id: "insights", label: "Insights", icon: "insights", href: "/insights" },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "team", label: "Team", icon: "team", href: "/team" },
      { id: "policies", label: "Policies", icon: "policies", href: "/policies" },
      { id: "api-keys", label: "API keys", icon: "apiKeys", href: "/api-keys" },
      { id: "plans", label: "Plans & billing", icon: "plans", href: "/plans" },
      { id: "settings", label: "Settings", icon: "settings", href: "/settings" },
    ],
  },
  {
    label: "Support",
    items: [
      { id: "support", label: "Support", icon: "support", action: "support" },
      { id: "feedback", label: "Feedback", icon: "support", action: "feedback" },
      { id: "roadmap", label: "Roadmap", icon: "roadmap", href: "/roadmap" },
    ],
  },
] as const;

/** Matches a route exactly or on a path boundary, so /settings never selects /settings-billing. */
export function isAppNavigationActive(pathname: string | null, href: string): boolean {
  const rawPath = pathname ?? "";
  const current = rawPath === "/app" ? "/" : rawPath.startsWith("/app/") ? rawPath.slice(4) : rawPath;
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}

export function mobileMoreSections() {
  return APP_NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.label === "Operations" ? section.items.filter((item) => !item.mobilePrimary) : section.items,
  }));
}
