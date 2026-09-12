// Pure presentation helpers for the approvals inbox. Moved verbatim out of
// page.tsx during the queue/review UI rebuild - behavior is unchanged.

import type { ApprovalRow } from "./types";

export function categoryTone(type: string): "cyan" | "red" | "amber" {
  if (type === "proposal") return "cyan";
  if (type === "campaign") return "red";
  if (type === "email" || type === "follow-up") return "amber";
  return "cyan";
}

export function timeAgo(createdAt: string | null): string {
  if (!createdAt) return "time unknown";
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

export function displayCategory(item: ApprovalRow): string {
  if (item.continuation_kind === "gmail.send_after_approval" || item.continuation_kind === "microsoft.send_after_approval") return "follow-up";
  return item.category || item.approval_type || "action";
}

export function matchesFilter(item: ApprovalRow, filter: string): boolean {
  if (filter === "All") return true;
  const needle = filter.toLowerCase();
  return displayCategory(item) === needle || item.approval_type === needle;
}

export function actionLabel(action: string): string {
  if (action === "send_gmail_follow_up") return "Send Gmail follow-up";
  if (action === "send_microsoft_follow_up") return "Send Microsoft 365 follow-up";
  if (action === "update_hubspot_contact") return "Update HubSpot contact/deal";
  if (action === "update_hubspot_deal") return "Update HubSpot deal";
  if (action === "add_hubspot_note") return "Add CRM note";
  if (action === "create_hubspot_follow_up_task") return "Create follow-up task";
  return action.replace(/_/g, " ");
}

export const REJECTION_REASONS = [
  "False positive - not a commercial inquiry",
  "Wrong tone",
  "Too pushy",
  "Wrong recipient",
  "Needs manual review",
  "Other",
];

export function valueOrDash(value: string | null | undefined): string {
  return value && value.trim() ? value : "-";
}

export function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function formatContextValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return String(value);
}

export function confidenceLabel(value: string | null | undefined): string {
  return value?.trim() ? value.trim().toUpperCase() : "UNKNOWN";
}

export function isRevenueApproval(item: ApprovalRow): boolean {
  return item.payload_preview.operatorKey === "revenue" || item.agent_id === "revenue";
}

export function approvalQueueTitle(item: ApprovalRow): string {
  const preview = item.payload_preview;
  const emailSubject = preview.editedDraftSubject || preview.draftSubject || preview.subject;
  if (item.approval_type === "email" && emailSubject) return emailSubject;

  const preparedAction = recordValue(preview.preparedAction);
  const actionPreview = recordValue(preparedAction.preview);
  const operations = recordValue(preview.operations);
  return textValue(actionPreview.label)
    || textValue(preparedAction.title)
    || textValue(operations.cardName)
    || textValue(operations.listName)
    || item.title;
}

export function approvalQueueContext(item: ApprovalRow): string | null {
  const preview = item.payload_preview;
  const signal = textValue(preview.detectedSignal);
  if (signal) return signal;
  const recipient = textValue(preview.to);
  if (recipient) return `To ${recipient}`;

  const operations = recordValue(preview.operations);
  return textValue(operations.plainEnglishSummary) || textValue(item.description);
}

export function isSharedActionApproval(item: ApprovalRow): boolean {
  return item.continuation_kind === "shared_action.execute_after_approval" && Boolean(item.payload_preview.preparedAction);
}
