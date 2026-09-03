export type ChangelogChangeType = "new" | "improved" | "fixed";

export type ChangelogChange = {
  type: ChangelogChangeType;
  title: string;
  description: string;
};

export type ChangelogRelease = {
  date: string;
  title: string;
  summary: string;
  changes: ChangelogChange[];
  sourceCommits: string[];
};

// Grouped from related user-facing commits. References are kept as provenance
// for maintainers and are intentionally not rendered as developer notes.
export const changelogReleases: ChangelogRelease[] = [
  { date: "September 3, 2026", title: "A clearer Auterim", summary: "The public product story now shows how context becomes controlled work, from the first signal to the approval boundary.", sourceCommits: ["f65702c", "59c1b0d", "ba89867", "1e6da60", "544ed97", "dc666cc", "16fa691", "6588fd5"], changes: [
    { type: "improved", title: "Operating model made visible", description: "The homepage now connects company context, operators, policies and measured runs in one continuous product story." },
    { type: "improved", title: "A quieter, more focused interface", description: "Typography, spacing and motion were refined across the public experience so the important decisions stay clear." },
    { type: "new", title: "Live product preview", description: "Visitors can follow a representative operator run from signal received to work held at an approval boundary." },
  ] },
  { date: "September 3, 2026", title: "A more direct path through the workspace", summary: "The app now makes it easier to understand what needs attention, what is ready, and what to set up next.", sourceCommits: ["87d5d81", "ad27c49", "95dd9b9", "f70f9af", "742f270"], changes: [
    { type: "improved", title: "Navigation follows the work", description: "Workspace navigation now keeps account context and the active page aligned as you move between overview, operators, logs and workflows." },
    { type: "improved", title: "Clearer setup recommendations", description: "Workflow and activation guidance now surfaces the next useful step instead of leaving setup decisions scattered across the workspace." },
  ] },
  { date: "June 30, 2026", title: "Auterim, end to end", summary: "The product surface now speaks one language: an AI workforce built around how your company works.", sourceCommits: ["cf392e8"], changes: [
    { type: "improved", title: "One product vocabulary", description: "Public and product-facing language was aligned around operators, company context, connectors, approvals and controlled execution." },
  ] },
  { date: "June 28, 2026", title: "A live view of the operating layer", summary: "The workspace overview now gives teams a grounded starting point for understanding what is happening across their work.", sourceCommits: ["d065dc4", "9af4b2b", "dbfa8c5", "a5dc309"], changes: [
    { type: "new", title: "Workspace overview", description: "The overview brings together current workspace activity, operator state and the signals that need attention." },
    { type: "improved", title: "Connected to live overview data", description: "The overview experience now reads from the product’s overview data instead of relying on a static dashboard view." },
    { type: "improved", title: "Operator discovery", description: "The agents experience now gives each operator a clearer role, readiness state and path into setup." },
  ] },
  { date: "June 27, 2026", title: "Operators with defined boundaries", summary: "Auterim’s workforce now has clearer roles, policies and runtime paths for work that needs to move through a business.", sourceCommits: ["0189807", "d439983", "2003f44", "39133fb", "f544426"], changes: [
    { type: "new", title: "Policy engine", description: "Actions can now be evaluated against explicit allow, approval and block decisions before execution." },
    { type: "new", title: "Operations and Client Flow operators", description: "New operator roles cover internal operational oversight and client-facing intake, onboarding and delivery work." },
    { type: "improved", title: "Runtime and readiness views", description: "Operator setup now makes required systems, approval boundaries and deployment readiness easier to understand." },
  ] },
  { date: "June 27, 2026", title: "More systems, one control layer", summary: "Connector foundations expanded so operators can work with more of the tools teams already use.", sourceCommits: ["9a319b5", "47f646c", "d49c8ca", "04e22fa", "f7eb894"], changes: [
    { type: "new", title: "Trello and Slack connectors", description: "Operators can now use Trello workspaces and Slack channels as part of connected, policy-aware work." },
    { type: "new", title: "Shared action layer", description: "Connector actions now pass through a common execution path, making approvals and activity records consistent across systems." },
    { type: "improved", title: "Connector catalog", description: "Available connectors and their capabilities now come from one registry, so setup reflects the actual product surface." },
  ] },
  { date: "June 21, 2026", title: "Revenue work from signal to draft", summary: "The Revenue Operator now has a clearer path from inbound signal to qualified, prepared follow-up.", sourceCommits: ["2d00754", "14a6e68", "a189b0f", "bbe01be", "aebe80c", "389eb01"], changes: [
    { type: "new", title: "Revenue signal intake", description: "Inbound signals can be monitored, classified and routed into a revenue operating flow." },
    { type: "improved", title: "More relevant follow-ups", description: "Drafts and CRM updates now use the available contact, company and pipeline context before work reaches review." },
    { type: "fixed", title: "Safer repeated processing", description: "Deduplication and idempotency improvements help prevent the same revenue signal from creating repeated work." },
  ] },
  { date: "June 18, 2026", title: "Approval-safe execution", summary: "Operators can prepare real work while sensitive actions remain visible and bounded by the approval owner.", sourceCommits: ["f4668de", "fa7c02d", "84ba6b5", "898f0f", "191bb8f", "25ceda4", "5c49793"], changes: [
    { type: "new", title: "Revenue Operator run flow", description: "A Revenue Operator can scan for relevant work, prepare a response and surface the next action for review." },
    { type: "new", title: "Approval inbox backed by product data", description: "Approval decisions now connect to persisted workspace state and the action that is waiting behind the gate." },
    { type: "improved", title: "Gmail execution boundaries", description: "Gmail sending now respects the configured scopes and approval path instead of treating a prepared draft as an automatic send." },
  ] },
  { date: "May 24, 2026", title: "Connector foundations", summary: "The first connector layer established the groundwork for verified accounts, plan-aware limits and clearer connection state.", sourceCommits: ["003f931", "4ca4506", "6f75abe", "a1cdeb2", "3130006", "d2c6c80", "983d8df", "45013d0"], changes: [
    { type: "new", title: "Connected accounts", description: "Workspace settings now provide a place to see and manage connected provider accounts." },
    { type: "improved", title: "Clearer connection state", description: "Gmail and HubSpot connection state now reflects provider credentials and the product’s actual readiness checks." },
    { type: "fixed", title: "Honest preview states", description: "Preview screens no longer present connector infrastructure or simulated production status as if it were live." },
  ] },
];
