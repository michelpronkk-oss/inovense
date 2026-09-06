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
  "email.read": "inbound email monitoring",
  "email.draft": "follow-up drafting",
  "email.send_after_approval": "approval-gated email sending",
  "email.thread.read": "email thread context",
  "crm.contacts.read": "CRM contact context",
  "crm.contacts.write": "CRM contact updates",
  "crm.deals.read": "CRM pipeline context",
  "crm.deals.write": "CRM deal updates",
  "crm.notes.write": "CRM notes",
  "crm.tasks.write": "CRM task creation",
  "calendar.events.read": "calendar context",
  "calendar.events.write_after_approval": "approval-gated calendar invites",
  "chat.channels.read": "team channel visibility",
  "chat.messages.read": "team message context",
  "chat.messages.send_after_approval": "approval-gated team messages",
  "chat.alerts.send_after_approval": "internal alert delivery",
  "pm.projects.read": "project visibility",
  "pm.tasks.read": "task board monitoring",
  "pm.tasks.write_after_approval": "approval-gated task creation",
  "pm.tasks.update_after_approval": "approval-gated task updates",
  "pm.comments.write_after_approval": "approval-gated task comments",
  "docs.read": "document context",
  "docs.write_after_approval": "approval-gated document updates",
  "billing.invoices.read": "invoice context",
  "billing.payment_status.read": "payment status context",
  "support.tickets.read": "support ticket context",
  "support.replies.send_after_approval": "approval-gated support replies",
  "website.pages.read": "website content context",
  "website.pages.write_after_approval": "approval-gated website updates",
  "marketing.posts.write_after_approval": "approval-gated post drafting",
  "analytics.read": "analytics context",
  "automation.webhook.receive": "inbound automation triggers",
  "automation.workflow.trigger_after_approval": "approval-gated workflow triggers",
};

function fallbackLabel(capability: string): string {
  return capability.replace(/_after_approval$/, "").replace(/[._]/g, " ").toLowerCase();
}

/** Translates a real capability id into short, customer-safe copy. Never exposes the raw dotted id. */
export function humanizeCapability(capability: string): string {
  return CAPABILITY_LABELS[capability as Capability] ?? fallbackLabel(capability);
}

export function humanizeCapabilities(capabilities: string[]): string[] {
  return Array.from(new Set(capabilities.map(humanizeCapability)));
}
