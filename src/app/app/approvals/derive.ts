// Derives the normalized, kind-agnostic presentation fields shared by the
// collapsed queue row and the expanded review (operator name, queue title,
// decision-summary action/destination/risk/after-approval text, related
// child-action framing). This is a pure re-derivation of what page.tsx used
// to compute inline, per item, twice (once for the "premium" branch and
// once for the "legacy" branch) - centralizing it here removes that
// duplication without changing any of the underlying values or the API
// calls that act on them.

import type { ApprovalRow } from "./types";
import { approvalQueueContext, approvalQueueTitle, displayCategory, isRevenueApproval, isSharedActionApproval, recordValue, textValue } from "./utils";

export type ApprovalKind = "email" | "shared_action" | "operations" | "generic";

export type RelatedAction = {
  key: string;
  label: string;
  willExecute: boolean;
  description: string;
};

export type ApprovalPresentation = {
  kind: ApprovalKind;
  operatorName: string;
  category: string;
  isRevenue: boolean;
  queueTitle: string;
  queueContext: string | null;
  queueSource: string;
  queuePriority: string | null;
  connectorLabel: string;
  customerEmailMode: string;
  draftSubject: string;
  draftBody: string;
  riskLevel: string | null;
  contextReason: string | null;
  contextFacts: string[];
  detectedSignal: string | null;
  hubSpotWillExecute: boolean;
  relatedActions: RelatedAction[];
  actionSummaryLabel: string;
  destinationSummary: string;
  humanReviewSummary: string;
  afterApprovalSummary: string;
  approveButtonLabel: string;
  approveButtonBusyLabel: string;
  defaultRejectReason: string;
};

function connectorDisplayName(connector: string | undefined | null): string {
  if (!connector) return "";
  return connector.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function deriveApprovalPresentation(item: ApprovalRow): ApprovalPresentation {
  const preview = item.payload_preview;
  const isRevenue = isRevenueApproval(item);
  const sharedAction = isSharedActionApproval(item);
  const operationsApproval = item.continuation_kind === "operations.execute_after_approval";
  const isEmail = item.approval_type === "email" || item.continuation_kind === "gmail.send_after_approval" || item.continuation_kind === "microsoft.send_after_approval";

  const kind: ApprovalKind = isEmail ? "email" : sharedAction ? "shared_action" : operationsApproval ? "operations" : "generic";

  const operatorName = preview.operatorKey === "revenue" || item.agent_id === "revenue" ? "Revenue Operator" : item.agent_mark || "Operator";
  const category = displayCategory(item);
  const policyEvidence = preview.policyEvidence;
  const connectorLabel = policyEvidence?.connector
    ? connectorDisplayName(policyEvidence.connector)
    : isEmail ? "Gmail" : connectorDisplayName(category) || "Connector";

  const riskLevel = preview.livePolicyDecision?.riskLevel ?? preview.riskLevel ?? null;
  const customerEmailMode = preview.customerEmailPolicy?.mode ?? "approval_required";

  const draftSubject = preview.editedDraftSubject || preview.draftSubject || preview.subject || "";
  const draftBody = preview.editedDraftBody || preview.draftBody || preview.fullBody || preview.body || "";

  const contextReason = preview.whyThisMatters || preview.approvalReason || item.policy_reason || preview.workflow?.stepReason || null;
  const contextFacts = preview.matchedKeywords ?? preview.crmPreparation?.matchedKeywords ?? [];

  const hasHubSpotScope = Boolean(preview.policyEvidenceByAction?.hubspot);
  const hasHubSpotAction = (preview.preparedActions ?? []).some((action) => action.includes("hubspot"));
  const hubSpotWillExecute = hasHubSpotAction
    && preview.crmPreparationStatus !== "hubspot_not_connected"
    && preview.preparedHubSpotActions?.executionStatus === "execution_enabled";

  const relatedActions: RelatedAction[] = [];
  if (hasHubSpotScope || hasHubSpotAction) {
    relatedActions.push({
      key: "hubspot",
      label: "CRM update",
      willExecute: hubSpotWillExecute,
      description: hubSpotWillExecute
        ? "Runs automatically after this email is approved."
        : "Separate approval required.",
    });
  }
  if (preview.policyEvidenceByAction) {
    for (const [key, evidence] of Object.entries(preview.policyEvidenceByAction)) {
      if (key === "email" || key === "hubspot") continue;
      relatedActions.push({
        key,
        label: `${connectorDisplayName(evidence.connector ?? key)} ${evidence.action?.replace(/_/g, " ") ?? "update"}`.trim(),
        willExecute: false,
        description: "Separate approval required.",
      });
    }
  }

  let actionSummaryLabel: string;
  let destinationSummary: string;
  let afterApprovalSummary: string;
  let approveButtonLabel: string;
  let approveButtonBusyLabel: string;

  if (kind === "email") {
    actionSummaryLabel = customerEmailMode === "draft_only" ? "Review draft" : "Send email";
    destinationSummary = preview.to ? `${connectorLabel} · ${preview.to}` : connectorLabel;
    afterApprovalSummary = preview.whatHappensAfterApproval
      || (customerEmailMode === "draft_only"
        ? "The draft is marked reviewed and is not sent automatically."
        : "This exact draft is sent through the connected email account.");
    approveButtonLabel = customerEmailMode === "draft_only" ? "Mark reviewed" : "Approve & send";
    approveButtonBusyLabel = customerEmailMode === "draft_only" ? "Saving…" : "Sending…";
  } else if (kind === "shared_action") {
    const preparedAction = recordValue(preview.preparedAction);
    const actionPreview = recordValue(preparedAction.preview);
    actionSummaryLabel = textValue(actionPreview.label) || textValue(preparedAction.title) || "Run prepared action";
    destinationSummary = connectorDisplayName(textValue(preparedAction.connectorKey) || category) || "Connector";
    afterApprovalSummary = preview.whatHappensAfterApproval || "Auterim executes this prepared action through the connected account after approval.";
    approveButtonLabel = "Approve & run";
    approveButtonBusyLabel = "Running…";
  } else if (kind === "operations") {
    const operations = recordValue(preview.operations);
    actionSummaryLabel = textValue(operations.recommendedAction) || "Post update and apply change";
    destinationSummary = "Slack · Trello";
    afterApprovalSummary = preview.whatHappensAfterApproval || "Auterim posts the internal Slack update and applies the prepared Trello change after approval.";
    approveButtonLabel = "Approve & run";
    approveButtonBusyLabel = "Running…";
  } else {
    actionSummaryLabel = item.title || "Run action";
    destinationSummary = connectorLabel;
    afterApprovalSummary = preview.whatHappensAfterApproval || "Auterim runs this action after approval.";
    approveButtonLabel = "Approve";
    approveButtonBusyLabel = "Approving…";
  }

  const humanReviewSummary = preview.livePolicyDecision?.requiresHumanReview === false
    ? "Not required"
    : preview.customerEmailPolicy?.humanReview || "Required";

  const queuePriority = riskLevel || textValue(recordValue(preview.operations).severity);

  return {
    kind,
    operatorName,
    category,
    isRevenue,
    queueTitle: approvalQueueTitle(item),
    queueContext: approvalQueueContext(item),
    queueSource: policyEvidence?.connector ? connectorLabel : isEmail ? "Gmail" : category,
    queuePriority,
    connectorLabel,
    customerEmailMode,
    draftSubject,
    draftBody,
    riskLevel,
    contextReason,
    contextFacts,
    detectedSignal: preview.detectedSignal ?? null,
    hubSpotWillExecute,
    relatedActions,
    actionSummaryLabel,
    destinationSummary,
    humanReviewSummary,
    afterApprovalSummary,
    approveButtonLabel,
    approveButtonBusyLabel,
    defaultRejectReason: isRevenue ? "False positive - not a commercial inquiry" : "Needs manual review",
  };
}
