// Inovense Connector Catalog + Capability Registry (foundation).
//
// Single source of truth for which connectors exist, how they authenticate,
// what they can do, and whether they are actually functional today.
//
// HONESTY RULE: only connectors with status "available" are real and
// connectable. Everything else is "coming_soon" / "planned" and must render
// as visibly disabled. Presence in this catalog never implies a connection.
//
// Today gmail (direct OAuth), hubspot (Nango), outlook (Nango), slack
// (Nango), and Trello (Nango) are available.

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
  support: "Support",
  marketing: "Marketing",
  website_ecommerce: "Website and ecommerce",
  analytics: "Analytics",
  automation: "Automation",
  custom_api: "Custom API",
};

const HUBSPOT_PROVIDER_CONFIG_KEY = process.env.NANGO_HUBSPOT_CONFIG_KEY || "hubspot";
const SLACK_PROVIDER_CONFIG_KEY = process.env.NANGO_SLACK_CONFIG_KEY || "slack";
const TRELLO_PROVIDER_CONFIG_KEY = process.env.NANGO_TRELLO_CONFIG_KEY || "trello";
const OUTLOOK_PROVIDER_CONFIG_KEY = process.env.NANGO_OUTLOOK_CONFIG_KEY || "outlook";

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
    authType: "nango",
    providerConfigKey: HUBSPOT_PROVIDER_CONFIG_KEY,
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
    setupNotes: "Managed OAuth through Nango. No tokens are stored in Auterim.",
  },

  outlook: {
    connectorKey: "outlook", displayName: "Outlook", category: "email", authType: "nango",
    providerConfigKey: OUTLOOK_PROVIDER_CONFIG_KEY,
    letter: "O", color: "#0078D4", description: "Microsoft 365 inbox context and approval-gated email send.",
    status: "available", capabilities: ["email.read", "email.draft", "email.send_after_approval", "email.thread.read"],
    usedByOperators: ["revenue", "support"], readActions: ["Read recent mail"], writeActions: ["Create draft", "Send approved email"],
    approvalRequiredActions: ["External email send"], eventTypes: ["email.received"], riskLevel: "medium",
    setupNotes: "Connects through Microsoft Graph via Nango. Requires an Entra ID app with Mail.Read, Mail.Send, offline_access, and User.Read delegated permissions, registered as an integration in the Nango dashboard.",
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
    connectorKey: "slack", displayName: "Slack", category: "team_chat", authType: "nango",
    providerConfigKey: SLACK_PROVIDER_CONFIG_KEY,
    letter: "Sl", color: "#611F69", description: "Read channels and post approval-gated messages.",
    status: "available", capabilities: ["chat.channels.read", "chat.messages.read", "chat.messages.send_after_approval", "chat.alerts.send_after_approval"],
    usedByOperators: ["operations", "client_flow", "approval_risk", "revenue", "support", "automation_architect"], readActions: ["Read channels", "Read messages"],
    writeActions: ["Post message after approval", "Send operator alert after approval"], approvalRequiredActions: ["send_channel_message", "send_direct_message", "send_operator_alert"],
    eventTypes: ["slack.message.received", "slack.mention.detected", "slack.channel.updated"],
    riskLevel: "medium", setupNotes: "Connect Slack workspace. Select allowed channels later.",
  },
  microsoft_teams: {
    connectorKey: "microsoft_teams", displayName: "Microsoft Teams", category: "team_chat", authType: "nango",
    letter: "MT", color: "#6264A7", description: "Read channels and post approval-gated messages.",
    status: "coming_soon", capabilities: ["chat.channels.read", "chat.messages.send_after_approval"],
    usedByOperators: ["operations"], readActions: ["Read channels"], writeActions: ["Post message after approval"],
    approvalRequiredActions: ["External channel post"], eventTypes: ["chat.message.posted"], riskLevel: "medium",
    setupNotes: "Planned via Microsoft Graph (Nango). Not connectable yet.",
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
    connectorKey: "google_drive", displayName: "Google Drive", category: "docs_knowledge", authType: "nango",
    letter: "GD", color: "#34A853", description: "Read documents for context and prepare approval-gated updates.",
    status: "coming_soon", capabilities: ["docs.read", "docs.write_after_approval"],
    usedByOperators: ["client_flow", "marketing", "knowledge_memory"], readActions: ["Read files"], writeActions: ["Write file after approval"],
    approvalRequiredActions: ["External share"], eventTypes: ["docs.file.updated"], riskLevel: "low",
    setupNotes: "Planned via Google Drive API (Nango). Not connectable yet.",
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
    connectorKey: "salesforce", displayName: "Salesforce", category: "crm", authType: "nango",
    letter: "SF", color: "#00A1E0", description: "Enterprise CRM contact and opportunity updates after approval.",
    status: "coming_soon", capabilities: ["crm.contacts.read", "crm.contacts.write", "crm.deals.read", "crm.deals.write"],
    usedByOperators: ["revenue"], readActions: ["Read leads", "Read opportunities"], writeActions: ["Write lead after approval", "Write opportunity after approval"],
    approvalRequiredActions: ["Record write"], eventTypes: ["crm.opportunity.created"], riskLevel: "medium",
    setupNotes: "Planned via Salesforce API (Nango).",
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
    connectorKey: "intercom", displayName: "Intercom", category: "support", authType: "nango",
    letter: "Ic", color: "#1F8DED", description: "Read tickets and prepare approval-gated replies.",
    status: "coming_soon", capabilities: ["support.tickets.read", "support.replies.send_after_approval"],
    usedByOperators: ["support"], readActions: ["Read conversations"], writeActions: ["Reply after approval"],
    approvalRequiredActions: ["Reply send"], eventTypes: ["support.ticket.created"], riskLevel: "medium",
    setupNotes: "Planned via Intercom API (Nango). Not connectable yet.",
  },
  zendesk: {
    connectorKey: "zendesk", displayName: "Zendesk", category: "support", authType: "nango",
    letter: "Zd", color: "#03363D", description: "Read tickets and prepare approval-gated replies.",
    status: "coming_soon", capabilities: ["support.tickets.read", "support.replies.send_after_approval"],
    usedByOperators: ["support"], readActions: ["Read tickets"], writeActions: ["Reply after approval"],
    approvalRequiredActions: ["Reply send"], eventTypes: ["support.ticket.created"], riskLevel: "medium",
    setupNotes: "Planned via Zendesk API (Nango). Not connectable yet.",
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
    connectorKey: "trello", displayName: "Trello", category: "project_management", authType: "nango",
    providerConfigKey: TRELLO_PROVIDER_CONFIG_KEY,
    letter: "Tr", color: "#0079BF", description: "Read boards and prepare approval-gated card updates.",
    status: "available", capabilities: ["pm.projects.read", "pm.tasks.read", "pm.tasks.write_after_approval", "pm.tasks.update_after_approval", "pm.comments.write_after_approval"], usedByOperators: ["client_flow", "operations", "automation_architect", "revenue"],
    readActions: ["Read boards", "Read lists", "Read cards"], writeActions: ["Create card after approval", "Move card after approval", "Add card comment after approval"], approvalRequiredActions: ["create_card", "move_card", "add_card_comment"],
    eventTypes: ["trello.card.created", "trello.card.updated", "trello.card.moved", "trello.comment.created"], riskLevel: "medium", setupNotes: "Connect Trello workspace. Select default board/list later.",
  },
  clickup: {
    connectorKey: "clickup", displayName: "ClickUp", category: "project_management", authType: "nango",
    letter: "CU", color: "#7B68EE", description: "Read tasks and prepare approval-gated task updates.",
    status: "planned", capabilities: ["pm.tasks.read", "pm.tasks.write_after_approval"], usedByOperators: ["operations"],
    readActions: ["Read tasks"], writeActions: ["Write task after approval"], approvalRequiredActions: ["Task write"],
    eventTypes: ["pm.task.updated"], riskLevel: "low", setupNotes: "Planned via ClickUp API (Nango).",
  },
  asana: {
    connectorKey: "asana", displayName: "Asana", category: "project_management", authType: "nango",
    letter: "As", color: "#F06A6A", description: "Read tasks and prepare approval-gated task updates.",
    status: "planned", capabilities: ["pm.tasks.read", "pm.tasks.write_after_approval"], usedByOperators: ["operations"],
    readActions: ["Read tasks"], writeActions: ["Write task after approval"], approvalRequiredActions: ["Task write"],
    eventTypes: ["pm.task.updated"], riskLevel: "low", setupNotes: "Planned via Asana API (Nango).",
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
    connectorKey: "jira", displayName: "Jira", category: "project_management", authType: "nango",
    letter: "Ji", color: "#0052CC", description: "Read issues and prepare approval-gated issue updates.",
    status: "planned", capabilities: ["pm.tasks.read", "pm.tasks.write_after_approval"], usedByOperators: ["operations"],
    readActions: ["Read issues"], writeActions: ["Write issue after approval"], approvalRequiredActions: ["Issue write"],
    eventTypes: ["pm.task.updated"], riskLevel: "low", setupNotes: "Planned via Jira API (Nango).",
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
