// Inovense Connector Catalog + Capability Registry (foundation).
//
// Single source of truth for which connectors exist, how they authenticate,
// what they can do, and whether they are actually functional today.
//
// HONESTY RULE: only connectors with status "available" are real and
// connectable. Everything else is "coming_soon" / "planned" and must render
// as visibly disabled. Presence in this catalog never implies a connection.
//
// Today gmail (direct OAuth), google_drive (direct OAuth, read-only, sharing the
// Google connection), microsoft (direct OAuth), microsoft_teams (direct OAuth,
// sharing the Microsoft connection), salesforce (direct OAuth, read-only),
// slack (direct Slack OAuth), trello (direct Trello OAuth 1.0a), asana, jira and
// zendesk (direct OAuth) are available. HubSpot is direct OAuth as well; all
// remaining Nango auth types below are planned connectors only.

import type { Capability } from "@/lib/connectors/capabilities";
import type { OperatorKey } from "@/lib/operators/registry";

export type ConnectorCategory =
  | "email"
  | "crm"
  | "calendar"
  | "team_chat"
  | "project_management"
  | "docs_knowledge"
  | "billing"
  | "support"
  | "marketing"
  | "website_ecommerce"
  | "analytics"
  | "automation"
  | "custom_api";

export type ConnectorCatalogStatus = "available" | "coming_soon" | "planned" | "internal_only";

export type ConnectorAuthType = "direct_oauth" | "nango" | "api_key" | "imap_smtp" | "webhook" | "manual";

export type ConnectorRiskLevel = "low" | "medium" | "high";

export type ConnectorDefinition = {
  connectorKey: string;
  displayName: string;
  category: ConnectorCategory;
  /**
   * Customer-facing category override for this specific connector, used in
   * place of CONNECTOR_CATEGORY_LABELS[category] when a connector's real
   * capabilities span more than its single filing category communicates
   * (e.g. Microsoft 365 files under "email" for discovery-filter grouping,
   * but also reads/writes calendar events). Category itself stays
   * unchanged so filter/grouping logic is unaffected -- only the label
   * shown to users differs. Read this via connectorCategoryLabel(), never
   * CONNECTOR_CATEGORY_LABELS[category] directly.
   */
  categoryLabel?: string;
  authType: ConnectorAuthType;
  /** Only set for Nango connectors that are actually wired up. */
  providerConfigKey?: string;
  letter: string;
  color: string;
  description: string;
  status: ConnectorCatalogStatus;
  capabilities: Capability[];
  usedByOperators: OperatorKey[];
  readActions: string[];
  writeActions: string[];
  approvalRequiredActions: string[];
  eventTypes: string[];
  riskLevel: ConnectorRiskLevel;
  setupNotes: string;
};

export const CONNECTOR_CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  email: "Email",
  crm: "CRM",
  calendar: "Calendar",
  team_chat: "Team chat",
  project_management: "Project management",
  docs_knowledge: "Docs and knowledge",
  billing: "Billing and finance",
  support: "Customer support",
  marketing: "Marketing",
  website_ecommerce: "Website and ecommerce",
  analytics: "Analytics",
  automation: "Automation",
  custom_api: "Custom API",
};

/** Customer-facing category label for a connector -- prefers the
 * connector's own categoryLabel override (when its real capabilities span
 * more than its filing category name implies) over the generic per-category
 * label. Use this everywhere a connector's category is displayed; never
 * read CONNECTOR_CATEGORY_LABELS[definition.category] directly. */
export function connectorCategoryLabel(definition: Pick<ConnectorDefinition, "category" | "categoryLabel">): string {
  return definition.categoryLabel ?? CONNECTOR_CATEGORY_LABELS[definition.category];
}

export const CONNECTOR_CATALOG: Record<string, ConnectorDefinition> = {
  // ── Available (real, functional today) ───────────────────────────────
  gmail: {
    connectorKey: "gmail",
    displayName: "Gmail",
    category: "email",
    authType: "direct_oauth",
    letter: "G",
    color: "#EA4335",
    description: "Read recent inbox context and send approval-gated follow-up email.",
    status: "available",
    capabilities: ["email.read", "email.draft", "email.send_after_approval", "email.thread.read"],
    usedByOperators: ["revenue", "client_flow", "operations", "support", "finance_billing"],
    readActions: ["Scan recent inbox metadata", "Read thread context"],
    writeActions: ["Create draft", "Send approved email"],
    approvalRequiredActions: ["External email send"],
    eventTypes: ["email.received", "email.sent"],
    riskLevel: "medium",
    setupNotes: "Connects with Google OAuth. Send permission requires the Gmail send scope.",
  },
  hubspot: {
    connectorKey: "hubspot",
    displayName: "HubSpot",
    category: "crm",
    authType: "direct_oauth",
    letter: "Hs",
    color: "#FF7A59",
    description: "Create and update contacts and deals, with associations, after approval.",
    status: "available",
    capabilities: ["crm.contacts.read", "crm.contacts.write", "crm.deals.read", "crm.deals.write", "crm.notes.write", "crm.tasks.write"],
    usedByOperators: ["revenue", "finance_billing", "automation_architect"],
    readActions: ["Read contacts", "Read deals", "Read pipelines"],
    writeActions: ["Create or update contact", "Create or update deal", "Associate contact to deal"],
    approvalRequiredActions: ["Contact write", "Deal write"],
    eventTypes: ["crm.contact.created", "crm.deal.created"],
    riskLevel: "medium",
    setupNotes: "Connects directly with HubSpot OAuth. Tokens are encrypted in Auterim and writes remain approval-gated.",
  },

  microsoft: {
    connectorKey: "microsoft", displayName: "Microsoft 365", category: "email", categoryLabel: "Email & calendar", authType: "direct_oauth",
    letter: "Ms", color: "#0078D4", description: "Outlook Mail context, approval-gated email send, and Outlook Calendar read/write.",
    status: "available",
    capabilities: ["email.read", "email.draft", "email.send_after_approval", "email.thread.read", "calendar.events.read", "calendar.events.write_after_approval"],
    usedByOperators: ["revenue", "client_flow", "operations", "support"],
    readActions: ["Read recent mail", "Read calendar events"],
    writeActions: ["Send approved email", "Create or update calendar event after approval"],
    approvalRequiredActions: ["External email send", "Calendar event create/update/delete"],
    eventTypes: ["email.received", "email.sent", "calendar.event.created"],
    riskLevel: "medium",
    setupNotes: "Connects directly with Microsoft Entra ID OAuth (multitenant app, delegated permissions: User.Read, Mail.Read, Mail.Send, Calendars.ReadWrite, offline_access, openid, profile). No third-party OAuth broker is involved.",
  },

  // ── Coming soon (clear near-term path) ───────────────────────────────
  google_calendar: {
    connectorKey: "google_calendar", displayName: "Google Calendar", category: "calendar", authType: "nango",
    letter: "GC", color: "#1A73E8", description: "Read availability and create approval-gated events.",
    status: "coming_soon", capabilities: ["calendar.events.read", "calendar.events.write_after_approval"],
    usedByOperators: ["client_flow", "revenue"], readActions: ["Read events"], writeActions: ["Create event after approval"],
    approvalRequiredActions: ["External invite send"], eventTypes: ["calendar.event.created"], riskLevel: "low",
    setupNotes: "Planned via Google Calendar API (Nango). Not connectable yet.",
  },
  slack: {
    connectorKey: "slack", displayName: "Slack", category: "team_chat", authType: "direct_oauth",
    letter: "Sl", color: "#611F69", description: "Read channels and post approval-gated messages.",
    status: "available", capabilities: ["chat.channels.read", "chat.messages.read", "chat.messages.send_after_approval", "chat.alerts.send_after_approval"],
    usedByOperators: ["operations", "client_flow", "approval_risk", "revenue", "support", "automation_architect"], readActions: ["Read channels", "Read messages"],
    writeActions: ["Post message after approval", "Send operator alert after approval"], approvalRequiredActions: ["send_channel_message", "send_direct_message", "send_operator_alert"],
    eventTypes: ["slack.message.received", "slack.mention.detected", "slack.channel.updated"],
    riskLevel: "medium", setupNotes: "Connects directly with Slack OAuth (bot scopes: channels:read, groups:read, channels:join, chat:write). Select the alert channel after connecting. Workspaces connected before this change must reconnect once.",
  },
  microsoft_teams: {
    connectorKey: "microsoft_teams", displayName: "Microsoft Teams", category: "team_chat", authType: "direct_oauth",
    letter: "MT", color: "#6264A7", description: "Read joined teams, channels and recent channel messages, and post approval-gated Teams messages.",
    // Shares the single Microsoft Entra connection with Microsoft 365, but is
    // a separate capability surface: Teams stays unavailable until its own
    // delegated Graph scopes are consented to.
    status: "available",
    capabilities: ["chat.channels.read", "chat.messages.read", "chat.messages.send_after_approval"],
    usedByOperators: ["operations", "client_flow"],
    readActions: ["Read joined teams", "Read channels", "Read recent channel messages"],
    writeActions: ["Send approved Teams channel message"],
    approvalRequiredActions: ["send_teams_message"],
    eventTypes: ["teams.message.received", "teams.message.sent"],
    riskLevel: "medium",
    setupNotes: "Connects with the same Microsoft Entra ID OAuth app as Microsoft 365, using incremental consent for delegated Teams permissions (Team.ReadBasic.All, Channel.ReadBasic.All, ChannelMessage.Read.All, ChannelMessage.Send). ChannelMessage.Read.All requires Microsoft tenant administrator consent. Attachments, chats and message edits are not supported.",
  },
  notion: {
    connectorKey: "notion", displayName: "Notion", category: "docs_knowledge", authType: "nango",
    letter: "N", color: "#ECEFF3", description: "Read pages and write approval-gated knowledge updates.",
    status: "coming_soon", capabilities: ["docs.read", "docs.write_after_approval"],
    usedByOperators: ["operations", "marketing", "knowledge_memory", "client_flow"], readActions: ["Read pages", "Read databases"],
    writeActions: ["Write page after approval"], approvalRequiredActions: ["Page write"], eventTypes: ["docs.page.updated"], riskLevel: "low",
    setupNotes: "Planned via Notion API (Nango). Not connectable yet.",
  },
  google_drive: {
    connectorKey: "google_drive", displayName: "Google Drive", category: "docs_knowledge", categoryLabel: "Files & knowledge", authType: "direct_oauth",
    letter: "GD", color: "#34A853", description: "Business document context from selected Google Drive folders.",
    status: "available", capabilities: ["docs.read"],
    usedByOperators: ["client_flow", "operations"], readActions: ["Search Google Drive files", "Use selected folders as workspace context", "Monitor recent Drive changes"], writeActions: [],
    approvalRequiredActions: [], eventTypes: ["docs.file.updated"], riskLevel: "low",
    setupNotes: "Shares the existing Google OAuth connection. Reconnect Google to grant Drive read access, then select one or more folders.",
  },
  pipedrive: {
    connectorKey: "pipedrive", displayName: "Pipedrive", category: "crm", authType: "nango",
    letter: "Pd", color: "#017737", description: "Create and update contacts and deals after approval.",
    status: "coming_soon", capabilities: ["crm.contacts.read", "crm.contacts.write", "crm.deals.read", "crm.deals.write"],
    usedByOperators: ["revenue"], readActions: ["Read persons", "Read deals"], writeActions: ["Write person after approval", "Write deal after approval"],
    approvalRequiredActions: ["Contact write", "Deal write"], eventTypes: ["crm.deal.created"], riskLevel: "medium",
    setupNotes: "Planned via Pipedrive API (Nango). Will reuse the CRM adapter pattern.",
  },
  salesforce: {
    connectorKey: "salesforce", displayName: "Salesforce", category: "crm", authType: "direct_oauth",
    letter: "SF", color: "#00A1E0", description: "Read Salesforce Contact/Lead, Account, and open Opportunity context for Revenue Operator.",
    // Read capabilities are real (Contact/Lead, Account, open Opportunity
    // lookup via SOQL). No write capability is advertised - Salesforce
    // mutations are intentionally not implemented yet.
    status: "available", capabilities: ["crm.contacts.read", "crm.deals.read"],
    usedByOperators: ["revenue"], readActions: ["Read contacts/leads", "Read accounts", "Read open opportunities"], writeActions: [],
    approvalRequiredActions: ["Create task", "Add note/activity", "Update contact or lead", "Update opportunity", "Change opportunity stage"], eventTypes: [], riskLevel: "medium",
    setupNotes: "Direct Salesforce OAuth. CRM reads are enabled for Revenue context; writes are intentionally not enabled yet.",
  },
  stripe: {
    connectorKey: "stripe", displayName: "Stripe", category: "billing", authType: "nango",
    letter: "St", color: "#635BFF", description: "Read payment status and invoices for finance follow-up.",
    status: "coming_soon", capabilities: ["billing.invoices.read", "billing.payment_status.read"],
    usedByOperators: ["finance_billing", "operations"], readActions: ["Read invoices", "Read payment status"], writeActions: [],
    approvalRequiredActions: [], eventTypes: ["billing.payment.succeeded", "billing.payment.failed"], riskLevel: "medium",
    setupNotes: "Planned read-only via Stripe API (Nango). No money-moving actions.",
  },
  intercom: {
    connectorKey: "intercom", displayName: "Intercom", category: "support", authType: "direct_oauth",
    letter: "Ic", color: "#1F8DED", description: "Customer conversation context and approval-gated replies.",
    status: "internal_only", capabilities: ["support.conversations.read", "support.contacts.read", "support.conversations.reply_after_approval", "support.conversations.assign_after_approval", "support.conversations.update_after_approval"],
    usedByOperators: ["client_flow", "revenue", "operations"], readActions: ["Read conversations", "Read contacts, companies, and admins"], writeActions: ["Reply after approval", "Assign after approval", "Update conversation after approval"],
    approvalRequiredActions: ["Public conversation reply", "Conversation assignment", "Close or reopen conversation"], eventTypes: ["support.conversation.updated"], riskLevel: "high",
    setupNotes: "Direct OAuth is wired for the configured development app and US, EU, and Australia regions. Public installation remains pending Intercom review.",
  },
  zendesk: {
    connectorKey: "zendesk", displayName: "Zendesk", category: "support", authType: "direct_oauth",
    letter: "Zd", color: "#03363D", description: "Ticket and customer support visibility.",
    status: "available", capabilities: ["support.tickets.read", "support.customers.read", "support.tickets.reply_after_approval", "support.tickets.comment_after_approval", "support.tickets.update_after_approval"],
    usedByOperators: ["client_flow", "operations"], readActions: ["Read tickets", "Read ticket context", "Read customer context"], writeActions: ["Reply after approval", "Add internal note after approval", "Update ticket after approval"],
    approvalRequiredActions: ["Public reply", "Internal note", "Status, priority, or assignee update"], eventTypes: ["support.ticket.updated"], riskLevel: "high",
    setupNotes: "Connects directly with Zendesk OAuth. Enter your Zendesk workspace hostname before authorizing. The OAuth client must be configured for the authorized Zendesk environment; Auterim does not claim a universal Zendesk client.",
  },
  shopify: {
    connectorKey: "shopify", displayName: "Shopify", category: "website_ecommerce", authType: "nango",
    letter: "Sh", color: "#5E8E3E", description: "Read orders and payment status for commerce operations.",
    status: "coming_soon", capabilities: ["billing.payment_status.read", "website.pages.read"],
    usedByOperators: ["operations", "finance_billing"], readActions: ["Read orders", "Read customers"], writeActions: [],
    approvalRequiredActions: [], eventTypes: ["commerce.order.created"], riskLevel: "medium",
    setupNotes: "Planned via Shopify API (Nango). Read-only first.",
  },

  // ── Planned (later) ──────────────────────────────────────────────────
  trello: {
    connectorKey: "trello", displayName: "Trello", category: "project_management", authType: "direct_oauth",
    letter: "Tr", color: "#0079BF", description: "Read boards and prepare approval-gated card updates.",
    status: "available", capabilities: ["pm.projects.read", "pm.tasks.read", "pm.tasks.write_after_approval", "pm.tasks.update_after_approval", "pm.comments.write_after_approval"], usedByOperators: ["client_flow", "operations", "automation_architect", "revenue"],
    readActions: ["Read boards", "Read lists", "Read cards"], writeActions: ["Create card after approval", "Move card after approval", "Add card comment after approval"], approvalRequiredActions: ["create_card", "move_card", "add_card_comment"],
    eventTypes: ["trello.card.created", "trello.card.updated", "trello.card.moved", "trello.comment.created"], riskLevel: "medium", setupNotes: "Connects directly with Trello OAuth (read and write scopes, no expiry). Select a default board and list after connecting. Workspaces connected before this change must reconnect once.",
  },
  clickup: {
    connectorKey: "clickup", displayName: "ClickUp", category: "project_management", authType: "nango",
    letter: "CU", color: "#7B68EE", description: "Read tasks and prepare approval-gated task updates.",
    status: "planned", capabilities: ["pm.tasks.read", "pm.tasks.write_after_approval"], usedByOperators: ["operations"],
    readActions: ["Read tasks"], writeActions: ["Write task after approval"], approvalRequiredActions: ["Task write"],
    eventTypes: ["pm.task.updated"], riskLevel: "low", setupNotes: "Planned via ClickUp API (Nango).",
  },
  asana: {
    connectorKey: "asana", displayName: "Asana", category: "project_management", authType: "direct_oauth",
    letter: "As", color: "#F06A6A", description: "Monitor selected Asana work and prepare approval-gated task updates.",
    status: "available", capabilities: ["pm.projects.read", "pm.tasks.read", "pm.tasks.create_after_approval", "pm.tasks.update_after_approval", "pm.comments.write_after_approval"], usedByOperators: ["operations"],
    readActions: ["Read workspaces", "Read projects", "Read tasks"], writeActions: ["Create task after approval", "Update task after approval", "Add comment after approval"], approvalRequiredActions: ["Asana task creation", "Asana task updates", "Asana comments"],
    eventTypes: ["pm.task.updated"], riskLevel: "low", setupNotes: "Connects directly with Asana OAuth. Select a workspace and project after connecting.",
  },
  monday: {
    connectorKey: "monday", displayName: "Monday", category: "project_management", authType: "nango",
    letter: "Mo", color: "#FF3D57", description: "Read boards and prepare approval-gated item updates.",
    status: "planned", capabilities: ["pm.tasks.read", "pm.tasks.write_after_approval"], usedByOperators: ["operations"],
    readActions: ["Read items"], writeActions: ["Write item after approval"], approvalRequiredActions: ["Item write"],
    eventTypes: ["pm.task.updated"], riskLevel: "low", setupNotes: "Planned via Monday API (Nango).",
  },
  linear: {
    connectorKey: "linear", displayName: "Linear", category: "project_management", authType: "nango",
    letter: "Li", color: "#5E6AD2", description: "Read issues and prepare approval-gated issue updates.",
    status: "planned", capabilities: ["pm.tasks.read", "pm.tasks.write_after_approval"], usedByOperators: ["operations", "automation_architect"],
    readActions: ["Read issues"], writeActions: ["Write issue after approval"], approvalRequiredActions: ["Issue write"],
    eventTypes: ["pm.task.updated"], riskLevel: "low", setupNotes: "Planned via Linear API (Nango).",
  },
  jira: {
    connectorKey: "jira", displayName: "Jira", category: "project_management", authType: "direct_oauth",
    letter: "Ji", color: "#0052CC", description: "Monitor a selected Jira project and prepare approval-gated issue follow-through.",
    status: "available", capabilities: ["pm.projects.read", "pm.tasks.read", "pm.tasks.create_after_approval", "pm.tasks.update_after_approval", "pm.comments.write_after_approval"], usedByOperators: ["operations"],
    readActions: ["Read projects", "Read issues", "Read issue detail"], writeActions: ["Create issue after approval", "Update issue after approval", "Add comment after approval"], approvalRequiredActions: ["Jira issue creation", "Jira issue updates", "Jira comments"],
    eventTypes: ["pm.task.updated"], riskLevel: "medium", setupNotes: "Connects directly with Atlassian OAuth 2.0. Select one Jira Cloud site project after connecting.",
  },
  google_docs: {
    connectorKey: "google_docs", displayName: "Google Docs", category: "docs_knowledge", authType: "nango",
    letter: "Dc", color: "#4285F4", description: "Read documents and prepare approval-gated edits.",
    status: "planned", capabilities: ["docs.read", "docs.write_after_approval"], usedByOperators: ["marketing", "knowledge_memory"],
    readActions: ["Read documents"], writeActions: ["Write document after approval"], approvalRequiredActions: ["Document write"],
    eventTypes: ["docs.page.updated"], riskLevel: "low", setupNotes: "Planned via Google Docs API (Nango).",
  },
  dodo: {
    connectorKey: "dodo", displayName: "Dodo Payments", category: "billing", authType: "api_key",
    letter: "Do", color: "#4DE8E1", description: "Read subscription and payment status for billing follow-up.",
    status: "planned", capabilities: ["billing.invoices.read", "billing.payment_status.read"], usedByOperators: ["finance_billing"],
    readActions: ["Read payment status"], writeActions: [], approvalRequiredActions: [], eventTypes: ["billing.payment.succeeded"],
    riskLevel: "medium", setupNotes: "Planned read-only. Billing webhooks already exist for the platform.",
  },
  quickbooks: {
    connectorKey: "quickbooks", displayName: "QuickBooks", category: "billing", authType: "nango",
    letter: "Qb", color: "#2CA01C", description: "Read invoices and payment status for finance summaries.",
    status: "planned", capabilities: ["billing.invoices.read", "billing.payment_status.read"], usedByOperators: ["finance_billing"],
    readActions: ["Read invoices"], writeActions: [], approvalRequiredActions: [], eventTypes: ["billing.invoice.created"],
    riskLevel: "medium", setupNotes: "Planned read-only via QuickBooks API (Nango).",
  },
  xero: {
    connectorKey: "xero", displayName: "Xero", category: "billing", authType: "nango",
    letter: "Xe", color: "#13B5EA", description: "Read invoices and payment status for finance summaries.",
    status: "planned", capabilities: ["billing.invoices.read", "billing.payment_status.read"], usedByOperators: ["finance_billing"],
    readActions: ["Read invoices"], writeActions: [], approvalRequiredActions: [], eventTypes: ["billing.invoice.created"],
    riskLevel: "medium", setupNotes: "Planned read-only via Xero API (Nango).",
  },
  helpscout: {
    connectorKey: "helpscout", displayName: "Help Scout", category: "support", authType: "nango",
    letter: "Hc", color: "#1292EE", description: "Read conversations and prepare approval-gated replies.",
    status: "planned", capabilities: ["support.tickets.read", "support.replies.send_after_approval"], usedByOperators: ["support"],
    readActions: ["Read conversations"], writeActions: ["Reply after approval"], approvalRequiredActions: ["Reply send"],
    eventTypes: ["support.ticket.created"], riskLevel: "medium", setupNotes: "Planned via Help Scout API (Nango).",
  },
  webflow: {
    connectorKey: "webflow", displayName: "Webflow", category: "website_ecommerce", authType: "nango",
    letter: "Wf", color: "#146EF5", description: "Read site content and prepare approval-gated page updates.",
    status: "planned", capabilities: ["website.pages.read", "website.pages.write_after_approval"], usedByOperators: ["website_conversion", "marketing"],
    readActions: ["Read pages"], writeActions: ["Write page after approval"], approvalRequiredActions: ["Page publish"],
    eventTypes: ["website.page.updated"], riskLevel: "medium", setupNotes: "Planned via Webflow API (Nango).",
  },
  framer: {
    connectorKey: "framer", displayName: "Framer", category: "website_ecommerce", authType: "api_key",
    letter: "Fr", color: "#0099FF", description: "Read site content and prepare approval-gated page updates.",
    status: "planned", capabilities: ["website.pages.read", "website.pages.write_after_approval"], usedByOperators: ["website_conversion", "marketing"],
    readActions: ["Read pages"], writeActions: ["Write page after approval"], approvalRequiredActions: ["Page publish"],
    eventTypes: ["website.page.updated"], riskLevel: "medium", setupNotes: "Planned. Framer has limited API access.",
  },
  wordpress: {
    connectorKey: "wordpress", displayName: "WordPress", category: "website_ecommerce", authType: "api_key",
    letter: "Wp", color: "#21759B", description: "Read posts and prepare approval-gated content updates.",
    status: "planned", capabilities: ["website.pages.read", "website.pages.write_after_approval"], usedByOperators: ["website_conversion", "marketing"],
    readActions: ["Read posts"], writeActions: ["Write post after approval"], approvalRequiredActions: ["Post publish"],
    eventTypes: ["website.page.updated"], riskLevel: "medium", setupNotes: "Planned via WordPress REST API with application passwords.",
  },
  google_search_console: {
    connectorKey: "google_search_console", displayName: "Google Search Console", category: "analytics", authType: "nango",
    letter: "SC", color: "#458CF5", description: "Read search performance for SEO and marketing context.",
    status: "planned", capabilities: ["analytics.read"], usedByOperators: ["marketing", "website_conversion"],
    readActions: ["Read search analytics"], writeActions: [], approvalRequiredActions: [], eventTypes: [],
    riskLevel: "low", setupNotes: "Planned read-only via Search Console API (Nango).",
  },
  ga4: {
    connectorKey: "ga4", displayName: "Google Analytics 4", category: "analytics", authType: "nango",
    letter: "GA", color: "#E8710A", description: "Read traffic and conversion metrics for reporting.",
    status: "planned", capabilities: ["analytics.read"], usedByOperators: ["marketing", "website_conversion"],
    readActions: ["Read reports"], writeActions: [], approvalRequiredActions: [], eventTypes: [],
    riskLevel: "low", setupNotes: "Planned read-only via GA4 Data API (Nango).",
  },
  zapier: {
    connectorKey: "zapier", displayName: "Zapier", category: "automation", authType: "webhook",
    letter: "Za", color: "#FF4F00", description: "Receive inbound triggers and dispatch approval-gated workflows.",
    status: "planned", capabilities: ["automation.webhook.receive", "automation.workflow.trigger_after_approval"], usedByOperators: ["automation_architect", "operations"],
    readActions: [], writeActions: ["Trigger workflow after approval"], approvalRequiredActions: ["Workflow trigger"],
    eventTypes: ["automation.webhook.received"], riskLevel: "high", setupNotes: "Planned via inbound/outbound webhooks.",
  },
  make: {
    connectorKey: "make", displayName: "Make", category: "automation", authType: "webhook",
    letter: "Mk", color: "#6D00CC", description: "Receive inbound triggers and dispatch approval-gated scenarios.",
    status: "planned", capabilities: ["automation.webhook.receive", "automation.workflow.trigger_after_approval"], usedByOperators: ["automation_architect", "operations"],
    readActions: [], writeActions: ["Trigger scenario after approval"], approvalRequiredActions: ["Scenario trigger"],
    eventTypes: ["automation.webhook.received"], riskLevel: "high", setupNotes: "Planned via inbound/outbound webhooks.",
  },
  n8n: {
    connectorKey: "n8n", displayName: "n8n", category: "automation", authType: "webhook",
    letter: "N8", color: "#EA4B71", description: "Receive inbound triggers and dispatch approval-gated workflows.",
    status: "planned", capabilities: ["automation.webhook.receive", "automation.workflow.trigger_after_approval"], usedByOperators: ["automation_architect", "operations"],
    readActions: [], writeActions: ["Trigger workflow after approval"], approvalRequiredActions: ["Workflow trigger"],
    eventTypes: ["automation.webhook.received"], riskLevel: "high", setupNotes: "Planned via inbound/outbound webhooks.",
  },
  airtable: {
    connectorKey: "airtable", displayName: "Airtable", category: "project_management", authType: "nango",
    letter: "At", color: "#18BFFF", description: "Read records and prepare approval-gated record updates.",
    status: "planned", capabilities: ["pm.tasks.read", "pm.tasks.write_after_approval", "docs.read"], usedByOperators: ["operations", "revenue"],
    readActions: ["Read records"], writeActions: ["Write record after approval"], approvalRequiredActions: ["Record write"],
    eventTypes: ["pm.task.updated"], riskLevel: "low", setupNotes: "Planned via Airtable API (Nango).",
  },
  google_sheets: {
    connectorKey: "google_sheets", displayName: "Google Sheets", category: "docs_knowledge", authType: "nango",
    letter: "GS", color: "#0F9D58", description: "Read sheets and prepare approval-gated updates for reporting.",
    status: "planned", capabilities: ["docs.read", "docs.write_after_approval", "analytics.read"], usedByOperators: ["operations", "revenue"],
    readActions: ["Read sheets"], writeActions: ["Write range after approval"], approvalRequiredActions: ["Sheet write"],
    eventTypes: [], riskLevel: "low", setupNotes: "Planned via Google Sheets API (Nango).",
  },
  close: {
    connectorKey: "close", displayName: "Close", category: "crm", authType: "nango",
    letter: "Cl", color: "#11998E", description: "Create and update leads and opportunities after approval.",
    status: "planned", capabilities: ["crm.contacts.read", "crm.contacts.write", "crm.deals.read", "crm.deals.write"], usedByOperators: ["revenue"],
    readActions: ["Read leads", "Read opportunities"], writeActions: ["Write lead after approval", "Write opportunity after approval"],
    approvalRequiredActions: ["Record write"], eventTypes: ["crm.opportunity.created"], riskLevel: "medium", setupNotes: "Planned via Close API (Nango).",
  },
  attio: {
    connectorKey: "attio", displayName: "Attio", category: "crm", authType: "nango",
    letter: "At", color: "#0A0A0A", description: "Create and update records and deals after approval.",
    status: "planned", capabilities: ["crm.contacts.read", "crm.contacts.write", "crm.deals.read", "crm.deals.write"], usedByOperators: ["revenue"],
    readActions: ["Read records"], writeActions: ["Write record after approval", "Write deal after approval"],
    approvalRequiredActions: ["Record write"], eventTypes: ["crm.deal.created"], riskLevel: "medium", setupNotes: "Planned via Attio API (Nango).",
  },
  zoho_crm: {
    connectorKey: "zoho_crm", displayName: "Zoho CRM", category: "crm", authType: "nango",
    letter: "Zo", color: "#E42527", description: "Create and update contacts and deals after approval.",
    status: "planned", capabilities: ["crm.contacts.read", "crm.contacts.write", "crm.deals.read", "crm.deals.write"], usedByOperators: ["revenue"],
    readActions: ["Read contacts", "Read deals"], writeActions: ["Write contact after approval", "Write deal after approval"],
    approvalRequiredActions: ["Record write"], eventTypes: ["crm.deal.created"], riskLevel: "medium", setupNotes: "Planned via Zoho CRM API (Nango).",
  },
  webhooks: {
    connectorKey: "webhooks", displayName: "Webhooks", category: "automation", authType: "webhook",
    letter: "Wh", color: "#22C55E", description: "Receive inbound events from any external system.",
    status: "planned", capabilities: ["automation.webhook.receive"], usedByOperators: ["automation_architect"],
    readActions: ["Receive webhook events"], writeActions: [], approvalRequiredActions: [], eventTypes: ["automation.webhook.received"],
    riskLevel: "high", setupNotes: "Planned signed inbound webhooks.",
  },
  custom_api: {
    connectorKey: "custom_api", displayName: "Custom API", category: "custom_api", authType: "api_key",
    letter: "API", color: "#14B8A6", description: "Connect a private REST API with approval-gated calls.",
    status: "planned", capabilities: ["automation.workflow.trigger_after_approval"], usedByOperators: ["automation_architect"],
    readActions: ["Custom read"], writeActions: ["Custom write after approval"], approvalRequiredActions: ["External write"],
    eventTypes: [], riskLevel: "high", setupNotes: "Planned. Requires a defined request contract per workspace.",
  },
};

// ── Lookup helpers ─────────────────────────────────────────────────────

export function listConnectors(): ConnectorDefinition[] {
  return Object.values(CONNECTOR_CATALOG);
}

export function getConnectorDefinition(connectorKey: string): ConnectorDefinition | null {
  if (!connectorKey) return null;
  return CONNECTOR_CATALOG[connectorKey] ?? null;
}

/** True when the connector exists in the catalog (any status). */
export function isSupportedConnector(connectorKey: string): boolean {
  return Boolean(connectorKey) && Object.prototype.hasOwnProperty.call(CONNECTOR_CATALOG, connectorKey);
}

/** True only when a connector is real and can actually start an auth flow today. */
export function isConnectorAvailableForAuth(connectorKey: string): boolean {
  const def = getConnectorDefinition(connectorKey);
  return Boolean(def && def.status === "available");
}

/** True only for live Nango connectors with a provider config key. */
export function isSupportedNangoConnector(connectorKey: string): boolean {
  const def = getConnectorDefinition(connectorKey);
  return Boolean(def && def.status === "available" && def.authType === "nango" && def.providerConfigKey);
}

export function getProviderConfigKey(connectorKey: string): string | null {
  return getConnectorDefinition(connectorKey)?.providerConfigKey ?? null;
}

export function listSupportedNangoConnectors(): ConnectorDefinition[] {
  return listConnectors().filter((def) => isSupportedNangoConnector(def.connectorKey));
}
