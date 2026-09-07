// Human-readable translations for real Capability ids (see
// src/lib/connectors/capabilities.ts). Never invents a capability - only
// relabels what the capability graph actually declares, so customer-facing
// copy (degraded-connector messaging, unlock messaging) never leaks a raw
// dotted capability id like "crm.contacts.write".
//
// Mirrors action-labels.ts's role for OperatorDefinition.allowedActions -
// single source of truth for this translation so no page invents its own
// copy for the same underlying capability id.

import type { Capability } from "@/lib/connectors/capabilities";

const CAPABILITY_LABELS: Partial<Record<Capability, string>> = {
  "email.read": "Inbound email monitoring",
  "email.draft": "Follow-up drafting",
  "email.send_after_approval": "Approval-gated email sending",
  "email.thread.read": "Email thread context",
  "crm.contacts.read": "CRM contact context",
  "crm.contacts.write": "CRM contact updates",
  "crm.deals.read": "CRM pipeline context",
  "crm.deals.write": "CRM deal updates",
  "crm.notes.write": "CRM notes",
  "crm.tasks.write": "CRM task creation",
  "calendar.events.read": "Calendar context",
  "calendar.events.write_after_approval": "Approval-gated calendar invites",
  "chat.channels.read": "Team channel visibility",
  "chat.messages.read": "Team message context",
  "chat.messages.send_after_approval": "Approval-gated team messages",
  "chat.alerts.send_after_approval": "Internal alert delivery",
  "pm.projects.read": "Project visibility",
  "pm.tasks.read": "Task board monitoring",
  "pm.tasks.write_after_approval": "Approval-gated task creation",
  "pm.tasks.create_after_approval": "Approval-gated task creation",
  "pm.tasks.update_after_approval": "Approval-gated task updates",
  "pm.comments.write_after_approval": "Approval-gated task comments",
  "docs.read": "Document context",
  "docs.write_after_approval": "Approval-gated document updates",
  "billing.invoices.read": "Invoice context",
  "billing.payment_status.read": "Payment status context",
  "support.tickets.read": "Support ticket context",
  "support.replies.send_after_approval": "Approval-gated support replies",
  "support.tickets.reply_after_approval": "Approval-gated ticket replies",
  "support.tickets.comment_after_approval": "Approval-gated internal notes",
  "support.tickets.update_after_approval": "Approval-gated ticket updates",
  "support.customers.read": "Support customer context",
  "support.conversations.read": "Intercom conversation context",
  "support.contacts.read": "Intercom contact context",
  "support.conversations.reply_after_approval": "Approval-gated Intercom replies",
  "support.conversations.assign_after_approval": "Approval-gated Intercom assignment",
  "support.conversations.update_after_approval": "Approval-gated Intercom updates",
  "website.pages.read": "Website content context",
  "website.pages.write_after_approval": "Approval-gated website updates",
  "marketing.posts.write_after_approval": "Approval-gated post drafting",
  "analytics.read": "Analytics context",
  "automation.webhook.receive": "Inbound automation triggers",
  "automation.workflow.trigger_after_approval": "Approval-gated workflow triggers",
};

function fallbackLabel(capability: string): string {
  const label = capability.replace(/_after_approval$/, "").replace(/[._]/g, " ").toLowerCase();
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : label;
}

/** Translates a real capability id into short, customer-safe copy. Never exposes the raw dotted id. */
export function humanizeCapability(capability: string): string {
  return CAPABILITY_LABELS[capability as Capability] ?? fallbackLabel(capability);
}

export function humanizeCapabilities(capabilities: string[]): string[] {
  return Array.from(new Set(capabilities.map(humanizeCapability)));
}
