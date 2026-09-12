"use client";

import type { ApprovalRow, DraftEdit } from "./types";
import type { ApprovalPresentation } from "./derive";
import type { FriendlyApprovalError } from "./errorMessages";
import { EmailDraftPreview } from "./EmailDraftPreview";
import { ApprovalDecisionSummary } from "./ApprovalDecisionSummary";
import { ApprovalDetails } from "./ApprovalDetails";
import { actionLabel, confidenceLabel, recordValue, timeAgo } from "./utils";

function PreparedActionSummary({ item, presentation }: { item: ApprovalRow; presentation: ApprovalPresentation }) {
  const preview = item.payload_preview;

  if (presentation.kind === "shared_action" && preview.preparedAction) {
    return (
      <section className="approval-prepared" aria-label="Prepared action">
        <div className="approval-prepared-head">
          <span className="t-eyebrow">Prepared action</span>
          <span className="badge cyan">{preview.preparedAction.actionType?.replace(/_/g, " ") || "task action"}</span>
        </div>
        <p className="approval-prepared-title">{preview.preparedAction.preview?.label || preview.preparedAction.title || "Prepared action"}</p>
        {preview.preparedAction.preview?.bodyPreview && <p className="approval-prepared-body">{preview.preparedAction.preview.bodyPreview}</p>}
      </section>
    );
  }

  if (presentation.kind === "operations" && preview.operations) {
    const operations = preview.operations;
    return (
      <section className="approval-prepared" aria-label="Operational signal">
        <div className="approval-prepared-head">
          <span className="t-eyebrow">Operational signal</span>
          <span className="badge cyan">Severity: {operations.severity || "medium"}</span>
        </div>
        <p className="approval-prepared-title">{operations.cardName || operations.listName || "Operational signal"}</p>
        {operations.plainEnglishSummary && <p className="approval-prepared-body">{operations.plainEnglishSummary}</p>}
        {operations.recommendedAction && <p className="approval-prepared-body"><strong>Recommended:</strong> {operations.recommendedAction}</p>}
      </section>
    );
  }

  const preparedActions = preview.preparedActions ?? [];
  if (preparedActions.length > 0 || preview.body || preview.crmPreparation?.summary) {
    return (
      <section className="approval-prepared" aria-label="Prepared work">
        <div className="approval-prepared-head"><span className="t-eyebrow">Prepared work</span></div>
        {preparedActions.length > 0 && <p className="approval-prepared-body">{preparedActions.map(actionLabel).join(" / ")}</p>}
        {preview.body && <p className="approval-prepared-body">{preview.body}</p>}
        {preview.crmPreparation?.summary && <p className="approval-prepared-body">{preview.crmPreparation.summary}</p>}
      </section>
    );
  }

  return null;
}

export function ApprovalExpandedReview({
  item,
  presentation,
  draftEdit,
  isSavingEdit,
  onChangeDraft,
  onStartEdit,
  onSaveDraft,
  onCancelEdit,
  isBusy,
  busyAction,
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
  onErrorPrimaryAction,
  detailsOpen,
  onToggleDetails,
}: {
  item: ApprovalRow;
  presentation: ApprovalPresentation;
  draftEdit: DraftEdit | undefined;
  isSavingEdit: boolean;
  onChangeDraft: (next: DraftEdit) => void;
  onStartEdit: () => void;
  onSaveDraft: () => void;
  onCancelEdit: () => void;
  isBusy: boolean;
  busyAction: "approve" | "reject" | null;
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
  onErrorPrimaryAction: () => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
}) {
  const preview = item.payload_preview;
  const workflow = preview.workflow;

  return (
    <div className="approval-review" id={`approval-expanded-${item.id}`}>
      <div className="approval-review-grid">
        <main className="approval-review-main">
          <header className="approval-review-head">
            <div className="approval-review-operator">
              <span className="cn-mark lg" aria-hidden>{presentation.operatorName.slice(0, 2).toUpperCase()}</span>
              <span>
                <span className="approval-operator-name">{presentation.operatorName}</span>
                <span className="approval-prepared-time">Prepared {timeAgo(item.created_at)}</span>
              </span>
            </div>
            {workflow?.id && (
              <div className="approval-workflow-note">
                <span className="t-eyebrow">Workflow</span>
                <span>{workflow.objective || "Workflow action"}{workflow.stepOrder && workflow.stepCount ? ` · Step ${workflow.stepOrder} of ${workflow.stepCount}` : ""}</span>
              </div>
            )}
            <span className="approval-review-kicker">Review prepared {presentation.kind === "email" ? "follow-up" : "action"}</span>
            <h2 className="approval-review-title">{presentation.queueTitle}</h2>
            <div className="approval-review-meta">
              <span>{presentation.connectorLabel}</span><i>·</i><span>{presentation.kind === "email" ? "Customer email" : presentation.category}</span>
              {presentation.riskLevel && <><i>·</i><strong>{presentation.riskLevel} risk</strong></>}
              {preview.confidence && <span className="badge green approval-review-confidence">{confidenceLabel(preview.confidence)}</span>}
            </div>
          </header>

          {(presentation.contextReason || presentation.detectedSignal || presentation.contextFacts.length > 0) && (
            <section className="approval-why" aria-label="Why this surfaced">
              <div className="approval-why-head">
                <span className="t-eyebrow">Why this surfaced</span>
                {presentation.detectedSignal && <span className="approval-why-signal">{presentation.detectedSignal}</span>}
              </div>
              {presentation.contextFacts.length > 0 && (
                <div className="approval-why-facts" aria-label="Matched context">
                  {presentation.contextFacts.map((fact) => <span key={fact}>{fact}</span>)}
                </div>
              )}
              {presentation.contextReason && <p>{presentation.contextReason}</p>}
            </section>
          )}

          {presentation.kind === "email" ? (
            <EmailDraftPreview
              id={`approval-email-${item.id}`}
              to={preview.to}
              subject={presentation.draftSubject}
              body={presentation.draftBody}
              wasEdited={Boolean(preview.wasEdited)}
              connectorLabel={presentation.connectorLabel}
              draftEdit={draftEdit}
              isSaving={isSavingEdit}
              onChangeDraft={onChangeDraft}
              onSave={onSaveDraft}
              onCancel={onCancelEdit}
            />
          ) : (
            <PreparedActionSummary item={item} presentation={presentation} />
          )}

          {(() => {
            const executionResult = recordValue(preview.executionResult);
            const sharedActionExecution = recordValue(executionResult.action);
            const sharedActionResult = recordValue(sharedActionExecution.result);
            const cardUrl = typeof sharedActionResult.cardUrl === "string" ? sharedActionResult.cardUrl : preview.operations?.cardUrl;
            if (!cardUrl) return null;
            return (
              <p className="approval-executed-note"><a href={cardUrl} target="_blank" rel="noreferrer">Open in {presentation.connectorLabel}</a></p>
            );
          })()}
        </main>

        <ApprovalDecisionSummary
          presentation={presentation}
          hasDraftEdit={Boolean(draftEdit)}
          isBusy={isBusy}
          busyAction={busyAction}
          isSavingEdit={isSavingEdit}
          friendlyError={friendlyError}
          rawErrorCode={rawErrorCode}
          rawErrorMessage={rawErrorMessage}
          isRejecting={isRejecting}
          rejectReason={rejectReason}
          onStartReject={onStartReject}
          onCancelReject={onCancelReject}
          onChangeRejectReason={onChangeRejectReason}
          onConfirmReject={onConfirmReject}
          onApprove={onApprove}
          onStartEdit={onStartEdit}
          onErrorPrimaryAction={onErrorPrimaryAction}
        />
      </div>

      <ApprovalDetails item={item} presentation={presentation} open={detailsOpen} onToggle={onToggleDetails} />
    </div>
  );
}
