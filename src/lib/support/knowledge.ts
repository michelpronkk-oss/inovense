export type SupportHelpItem = {
  id: string;
  title: string;
  summary: string;
  href: string;
  keywords: string[];
};

/** Curated, maintained help paths. These intentionally point only to live product surfaces. */
export const SUPPORT_HELP: SupportHelpItem[] = [
  { id: "get-started", title: "Get started with Auterim", summary: "Connect a system, review the recommended operator, then deploy with approvals in place.", href: "/getting-started", keywords: ["start", "onboarding", "setup", "first steps"] },
  { id: "connectors", title: "Connect and repair systems", summary: "Connect a supported system or resolve a connection that needs attention.", href: "/connectors", keywords: ["connector", "gmail", "microsoft", "hubspot", "salesforce", "trello", "slack", "reconnect"] },
  { id: "operators", title: "Set up operators", summary: "See what each operator needs, what it can prepare, and the next setup step.", href: "/agents", keywords: ["operator", "revenue", "client flow", "operations", "ready", "activate"] },
  { id: "approvals", title: "Review approvals", summary: "Inspect prepared outbound work and keep consequential actions under your control.", href: "/approvals", keywords: ["approval", "approve", "policy", "outbound", "action"] },
  { id: "plans", title: "Plans and billing", summary: "Review your workspace plan, usage and billing status.", href: "/plans", keywords: ["plan", "billing", "invoice", "subscription", "upgrade"] },
  { id: "roadmap", title: "Product roadmap", summary: "See what is available today, what is next and what Auterim is exploring.", href: "/roadmap", keywords: ["roadmap", "future", "asana", "teams", "jira", "integration"] },
  { id: "security", title: "Security and trust", summary: "Review how Auterim handles approval-gated work and connected-system access.", href: "/security", keywords: ["security", "trust", "privacy", "data", "permissions"] },
];

export function findSupportHelp(query: string): SupportHelpItem[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return SUPPORT_HELP;
  return SUPPORT_HELP
    .map((item) => ({ item, score: terms.reduce((score, term) => score + Number(`${item.title} ${item.summary} ${item.keywords.join(" ")}`.toLowerCase().includes(term)), 0) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
