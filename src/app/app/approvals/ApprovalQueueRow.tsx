"use client";

import type { ApprovalRow } from "./types";
import type { ApprovalPresentation } from "./derive";
import { timeAgo } from "./utils";

export function ApprovalQueueRow({
  item,
  presentation,
  isExpanded,
  isBusy,
  busyAction,
  hasError,
  onToggle,
}: {
  item: ApprovalRow;
  presentation: ApprovalPresentation;
  isExpanded: boolean;
  isBusy: boolean;
  busyAction: "approve" | "reject" | null;
  hasError: boolean;
  onToggle: () => void;
}) {
  const statusLabel = isBusy
    ? busyAction === "approve"
      ? (presentation.customerEmailMode === "draft_only" ? "Saving" : "Sending")
      : "Rejecting"
    : hasError
      ? "Review again"
      : "Approval required";

  return (
    <button
      className="approval-queue-row"
      type="button"
      aria-expanded={isExpanded}
      onClick={onToggle}
    >
      <span className="approval-queue-avatar cn-mark" aria-hidden>{presentation.operatorName.slice(0, 2).toUpperCase()}</span>
      <span className="approval-queue-primary">
        <span className="approval-queue-title">{presentation.queueTitle}</span>
        <span className="approval-queue-meta"><span>{presentation.operatorName}</span><i>·</i><span className="approval-queue-source">{presentation.queueSource}</span><i>·</i><span>{timeAgo(item.created_at)}</span></span>
      </span>
      <span className="approval-queue-context">{presentation.queueContext || item.description}</span>
      <span className="approval-queue-trailing">
        {presentation.queuePriority && <span className={`approval-queue-priority approval-queue-priority--${presentation.queuePriority.toLowerCase()}`}>{presentation.queuePriority} risk</span>}
        <span className={`approval-queue-status${hasError ? " is-review" : ""}`}><span aria-hidden />{statusLabel}</span>
      </span>
      <svg className="approval-queue-chevron" aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
    </button>
  );
}
