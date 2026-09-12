"use client";

import type { FriendlyApprovalError } from "./errorMessages";
import type { ApprovalPresentation } from "./derive";
import { REJECTION_REASONS } from "./utils";

export function ApprovalDecisionSummary({
  presentation,
  hasDraftEdit,
  isBusy,
  busyAction,
  isSavingEdit,
  friendlyError,
  rawErrorCode,
  rawErrorMessage,
  isRejecting,
  rejectReason,
  onStartReject,
  onCancelReject,
  onChangeRejectReason,
  onConfirmReject,
  onApprove,
  onStartEdit,
  onErrorPrimaryAction,
}: {
  presentation: ApprovalPresentation;
  hasDraftEdit: boolean;
  isBusy: boolean;
  busyAction: "approve" | "reject" | null;
  isSavingEdit: boolean;
  friendlyError: FriendlyApprovalError | null;
  rawErrorCode: string | null;
  rawErrorMessage: string | null;
  isRejecting: boolean;
  rejectReason: string;
  onStartReject: () => void;
  onCancelReject: () => void;
  onChangeRejectReason: (reason: string) => void;
  onConfirmReject: () => void;
  onApprove: () => void;
  onStartEdit: () => void;
  onErrorPrimaryAction: () => void;
}) {
  const blocked = hasDraftEdit || Boolean(friendlyError);

  return (
    <aside className="approval-summary" aria-label="Approval decision">
      <div className="approval-summary-status">
        <span className="approval-required-state"><span aria-hidden />Approval required</span>
      </div>

      <dl className="approval-summary-list">
        <div><dt>Action</dt><dd>{presentation.actionSummaryLabel}</dd></div>
        <div><dt>Destination</dt><dd>{presentation.destinationSummary}</dd></div>
        {presentation.riskLevel && <div><dt>Risk</dt><dd className={`approval-summary-risk approval-summary-risk--${presentation.riskLevel.toLowerCase()}`}>{presentation.riskLevel}</dd></div>}
        <div><dt>Human review</dt><dd>{presentation.humanReviewSummary}</dd></div>
      </dl>

      <div className="approval-summary-after">
        <span className="t-eyebrow">After approval</span>
        <p>{presentation.afterApprovalSummary}</p>
      </div>

      {presentation.relatedActions.map((related) => (
        <div className="approval-related" key={related.key}>
          <span className="t-eyebrow">Related action</span>
          <strong>{related.label}</strong>
          <p>{related.description}</p>
        </div>
      ))}

      {friendlyError && (
        <div className="approval-error" role="alert">
          <div className="approval-error-title">{friendlyError.title}</div>
          <p>{friendlyError.body}</p>
          <div className="approval-error-actions">
            <button className="btn btn-primary btn-sm" type="button" onClick={onErrorPrimaryAction}>{friendlyError.primaryActionLabel}</button>
          </div>
          <details className="approval-error-tech">
            <summary>Technical details</summary>
            <div><code>{rawErrorCode}</code><span>{rawErrorMessage}</span></div>
          </details>
        </div>
      )}

      <div className="approval-summary-actions">
        <button
          className="btn btn-primary approval-approve-btn"
          disabled={isBusy || isSavingEdit || blocked}
          onClick={onApprove}
          aria-busy={isBusy && busyAction === "approve"}
        >
          {isBusy && busyAction === "approve" ? presentation.approveButtonBusyLabel : presentation.approveButtonLabel}
        </button>

        {hasDraftEdit && <p className="approval-summary-note">Save or cancel your draft changes before approving.</p>}

        {!hasDraftEdit && presentation.kind === "email" && (
          <button className="btn btn-ghost approval-edit-btn" disabled={isBusy || isSavingEdit} onClick={onStartEdit}>Edit draft</button>
        )}

        {!isRejecting ? (
          <button className="btn btn-danger-ghost approval-reject-btn" disabled={isBusy || isSavingEdit} onClick={onStartReject}>Reject</button>
        ) : (
          <div className="approval-reject-panel">
            <label className="field">
              <span className="label">Reason for rejection</span>
              <select className="select" aria-label="Reason for rejection" value={rejectReason} onChange={(event) => onChangeRejectReason(event.target.value)}>
                {REJECTION_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            <div className="approval-reject-panel-actions">
              <button className="btn btn-ghost btn-sm" type="button" disabled={isBusy} onClick={onCancelReject}>Cancel</button>
              <button className="btn btn-danger btn-sm" type="button" disabled={isBusy} onClick={onConfirmReject}>
                {isBusy && busyAction === "reject" ? "Rejecting…" : "Confirm reject"}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
