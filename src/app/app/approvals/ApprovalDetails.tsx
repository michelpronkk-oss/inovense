"use client";

import type { ApprovalRow } from "./types";
import type { ApprovalPresentation } from "./derive";
import { formatContextValue, recordValue, textValue, valueOrDash } from "./utils";

export function ApprovalDetails({
  item,
  presentation,
  open,
  onToggle,
}: {
  item: ApprovalRow;
  presentation: ApprovalPresentation;
  open: boolean;
  onToggle: () => void;
}) {
  const preview = item.payload_preview;
  const policyEvidence = preview.policyEvidence;
  const hubspotPreview = preview.preparedHubSpotActions;
  const executionResult = recordValue(preview.executionResult);
  const hubspotExecution = recordValue(executionResult.hubspot);
  const sourceMetadata = preview.sourceMetadata ?? {};
  const originalSubject = typeof sourceMetadata.subject === "string"
    ? sourceMetadata.subject
    : preview.crmPreparation?.sourceSubject ?? preview.subject ?? null;
  const contactNameSource = preview.crmPreparation?.personalizationSource
    || (typeof sourceMetadata.personalizationSource === "string" ? sourceMetadata.personalizationSource : null);

  return (
    <details className="approval-details" open={open}>
      <summary onClick={(event) => { event.preventDefault(); onToggle(); }}>
        <span>Approval details</span>
        <span>Policy, scope, and audit context</span>
      </summary>
      <div className="approval-details-body">
        {policyEvidence && (
          <>
            <dl className="approval-kv">
              <div><dt>Connector</dt><dd>{valueOrDash(policyEvidence.connector)}</dd></div>
              <div><dt>Exact action</dt><dd>{valueOrDash(policyEvidence.action?.replace(/_/g, " ") ?? null)}</dd></div>
              <div><dt>Subject</dt><dd>{valueOrDash(policyEvidence.subjectType ? `${policyEvidence.subjectType}${policyEvidence.subjectId ? ` · ${policyEvidence.subjectId}` : ""}` : null)}</dd></div>
              <div><dt>Matched policy</dt><dd>{policyEvidence.matchedRuleIds?.join(", ") || "Platform safety baseline"}</dd></div>
              <div><dt>Approval authority</dt><dd>{policyEvidence.requiredApproverRoles?.join(", ") || "Workspace reviewer"}</dd></div>
              <div><dt>Policy version</dt><dd>{policyEvidence.policyVersion ?? 1}</dd></div>
            </dl>
            {policyEvidence.threshold && (
              <div className="approval-details-note">
                <strong>Threshold</strong>
                <span>{policyEvidence.threshold.field} {policyEvidence.threshold.operator} {formatContextValue(policyEvidence.threshold.configuredValue)} · observed {formatContextValue(policyEvidence.threshold.observedValue)} · {policyEvidence.threshold.result}</span>
              </div>
            )}
            {policyEvidence.contextSummary && Object.keys(policyEvidence.contextSummary).length > 0 && (
              <p className="approval-details-context">Context: {Object.entries(policyEvidence.contextSummary).map(([key, value]) => `${key} ${formatContextValue(value)}`).join(" · ")}</p>
            )}
            {(policyEvidence.contextFingerprint || preview.approvalScope?.contextFingerprint) && (
              <div className="approval-fingerprint"><span>Context fingerprint</span><code>{policyEvidence.contextFingerprint || preview.approvalScope?.contextFingerprint}</code></div>
            )}
          </>
        )}

        {preview.livePolicyDecision && (() => {
          const decision = preview.livePolicyDecision;
          const tone = decision.decision === "blocked" ? "red" : decision.decision === "allow_auto" ? "green" : "amber";
          return (
            <div className="approval-live-policy">
              <div><span className="t-eyebrow">Live policy check</span><span className={`badge ${tone}`}>{decision.userFacingLabel}</span></div>
              <p>{decision.reason}</p>
              <span>Matched rule: {decision.matchedRuleId} · Risk: {decision.riskLevel} · Human review {decision.requiresHumanReview ? "required" : "not required"}</span>
              {item.status === "pending" && <small>Rechecked live before execution.</small>}
            </div>
          );
        })()}

        {presentation.relatedActions.length > 0 && (
          <div className="approval-details-related">
            <span className="t-eyebrow">Related actions</span>
            {presentation.relatedActions.map((related) => (
              <div className="approval-details-related-row" key={related.key}>
                <strong>{related.label}</strong>
                <span>{related.description}</span>
              </div>
            ))}
          </div>
        )}

        <p className="approval-reapproval-note">Reapproval is required if the connector, target, action, or business context changes.</p>

        <dl className="approval-kv">
          {[
            { label: "Source email", value: valueOrDash(preview.sourceEmail) },
            { label: "Original subject", value: valueOrDash(originalSubject) },
            { label: "Contact name source", value: valueOrDash(contactNameSource) },
            { label: "Dedupe key", value: valueOrDash(preview.dedupeKey) },
            { label: "Classification", value: valueOrDash(preview.classification) },
            { label: "Approval reason", value: preview.approvalReason || item.policy_reason || "-" },
            { label: "What happens after approval", value: preview.whatHappensAfterApproval || "-" },
            { label: "Run", value: item.linked_run_id || item.run_id || "-" },
          ].map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
        </dl>

        {hubspotPreview && (
          <div className="approval-crm-preview">
            <div><span className="t-eyebrow">HubSpot contact</span><p><strong>{valueOrDash([hubspotPreview.contact?.firstname, hubspotPreview.contact?.lastname].filter(Boolean).join(" ") || null)}</strong><br />{valueOrDash(hubspotPreview.contact?.email)}<br />Source: {valueOrDash(hubspotPreview.contact?.source)}</p></div>
            <div><span className="t-eyebrow">HubSpot deal</span><p><strong>{valueOrDash(hubspotPreview.deal?.dealname)}</strong><br />Stage: {valueOrDash(hubspotPreview.deal?.stageLabel)}<br />Pipeline: {valueOrDash(hubspotPreview.deal?.pipelineLabel)}</p></div>
            <div><span className="t-eyebrow">CRM note</span><p>{valueOrDash(hubspotPreview.note?.body)}</p><small>Prepared only in this version.</small></div>
            <div><span className="t-eyebrow">Follow-up task</span><p><strong>{valueOrDash(hubspotPreview.task?.title)}</strong><br />Due: {valueOrDash(hubspotPreview.task?.dueSuggestion)}<br />Type: {valueOrDash(hubspotPreview.task?.type)}</p><small>Prepared only in this version.</small></div>
          </div>
        )}
        {textValue(hubspotExecution.pipelineLabel) && (
          <p className="approval-details-context">Pipeline: {textValue(hubspotExecution.pipelineLabel)} · Stage: {textValue(hubspotExecution.dealstageLabel) ?? "-"}</p>
        )}

        {preview.crmPreparation && (
          <div className="approval-crm-preparation">
            {preview.crmPreparation.summary && <p>{preview.crmPreparation.summary}</p>}
            {preview.crmPreparation.suggestedNextStep && <p><strong>Suggested next step:</strong> {preview.crmPreparation.suggestedNextStep}</p>}
            {preview.crmPreparation.suggestedDealStage && <p><strong>Suggested deal stage:</strong> {preview.crmPreparation.suggestedDealStage}</p>}
            {preview.crmPreparation.suggestedFollowUpTask && <p><strong>Suggested task:</strong> {preview.crmPreparation.suggestedFollowUpTask}</p>}
          </div>
        )}

        {preview.preparedAction?.preview?.fields && preview.preparedAction.preview.fields.length > 0 && (
          <dl className="approval-kv">
            {preview.preparedAction.preview.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
          </dl>
        )}
        {preview.preparedAction?.preview?.bodyPreview && (
          <p className="approval-details-context" style={{ whiteSpace: "pre-wrap" }}>{preview.preparedAction.preview.bodyPreview}</p>
        )}

        {preview.operations?.preparedSlackMessage && (
          <div className="approval-details-note">
            <strong>Prepared Slack message</strong>
            <span style={{ whiteSpace: "pre-wrap" }}>{preview.operations.preparedSlackMessage}</span>
          </div>
        )}
      </div>
    </details>
  );
}
