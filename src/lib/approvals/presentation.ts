// Shared, pure approval-detail derivation. Originally lived only inside
// src/app/api/approvals/route.ts's mapApproval(); extracted here so the
// dashboard's "Needs your review" card can show the exact same real
// why/evidence/policy/consequence sentences as the full /approvals page,
// instead of re-deriving separate copy. No IO, no Supabase - pure functions
// over an already-loaded continuation_payload.

export type ApprovalContinuationPayload = {
  kind?: string;
  workspaceId?: string;
  operatorRunId?: string;
  operatorKey?: string;
  workflowId?: string;
  workflowObjective?: string;
  workflowStepId?: string;
  workflowStepOrder?: number;
  workflowStepCount?: number;
  workflowStepReason?: string;
  to?: string;
  channelId?: string;
  subject?: string;
  text?: string;
  body?: string;
  draftSubject?: string;
  draftBody?: string;
  originalDraftSubject?: string;
  originalDraftBody?: string;
  editedDraftSubject?: string | null;
  editedDraftBody?: string | null;
  wasEdited?: boolean;
  editedAt?: string | null;
  editedBy?: string | null;
  dedupeKey?: string | null;
  dedupeMetadata?: Record<string, unknown> | null;
  preparedActions?: string[];
  crmPreparationStatus?: string;
  sourceMetadata?: Record<string, unknown> | null;
  crmPreparation?: {
    contactEmail?: string;
    contactName?: string | null;
    companyName?: string | null;
    sourceSubject?: string;
    classification?: string;
    confidence?: string;
    summary?: string;
    suggestedNextStep?: string;
    suggestedDealStage?: string;
    suggestedFollowUpTask?: string;
    matchedKeywords?: string[];
    personalizationSource?: string;
    signatureCandidateRaw?: string | null;
    signatureCandidateAccepted?: string | null;
  } | null;
  preparedHubSpotActions?: {
    contact?: Record<string, unknown>;
    deal?: Record<string, unknown>;
    note?: Record<string, unknown>;
    task?: Record<string, unknown>;
    executionStatus?: string;
  } | null;
  executionResult?: Record<string, unknown> | null;
  preparedSlackAction?: Record<string, unknown> | null;
  preparedTrelloAction?: Record<string, unknown> | null;
  approvalScope?: Record<string, unknown> | null;
  approvalScopes?: Record<string, unknown> | null;
  policyEvidence?: Record<string, unknown> | null;
  operations?: Record<string, unknown> | null;
  policy?: Record<string, unknown> | null;
  preparedAction?: {
    id?: string;
    actionType?: string;
    connectorKey?: string;
    capability?: string;
    riskLevel?: string;
    requiresApproval?: boolean;
    title?: string;
    summary?: string;
    input?: Record<string, unknown>;
    preview?: {
      label?: string;
      fields?: Array<{ label: string; value: string }>;
      bodyPreview?: string | null;
    };
  } | null;
  customerEmailPolicy?: {
    mode?: string;
    customerEmail?: string;
    humanReview?: string;
    crmUpdate?: string;
    slackAlert?: string;
  } | null;
};

export function asPayload(value: unknown): ApprovalContinuationPayload {
  return value && typeof value === "object" ? value as ApprovalContinuationPayload : {};
}

export function preview(value: string | undefined, max = 1200): string | null {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

export function effectiveDraft(continuation: ApprovalContinuationPayload) {
  const subject = continuation.editedDraftSubject || continuation.draftSubject || continuation.subject || null;
  const body = continuation.editedDraftBody || continuation.draftBody || continuation.body || null;
  return {
    subject,
    body,
    wasEdited: Boolean(continuation.wasEdited || continuation.editedDraftSubject || continuation.editedDraftBody),
  };
}

export function isEmailKind(kind: ApprovalContinuationPayload["kind"] | undefined): boolean {
  return kind === "gmail.send_after_approval" || kind === "microsoft.send_after_approval";
}

/** "Policy": always a real, already-persisted human sentence - never a code. */
export function approvalReason(continuation: ApprovalContinuationPayload, policyReason: string | null): string {
  if (policyReason) return policyReason;
  if (continuation.kind === "gmail.send_after_approval") return "External email send requires human approval before Gmail execution.";
  if (continuation.kind === "microsoft.send_after_approval") return "External email send requires human approval before Microsoft 365 execution.";
  if (continuation.kind === "slack.send_after_approval") return "Slack message sends require human approval before posting.";
  if (continuation.kind === "operations.execute_after_approval") return "Operations actions require human approval before any Slack message or Trello change.";
  return "Operator action requires human approval.";
}

export function crmStatusText(status: string | undefined): string | null {
  if (status === "hubspot_not_connected") return "CRM update not prepared because HubSpot is not connected.";
  if (status === "hubspot_execution_not_ready") return "HubSpot actions are prepared but not executed yet.";
  if (status === "hubspot_execution_enabled") return "HubSpot contact and deal updates will execute after approval. Notes and tasks remain prepared only.";
  if (status === "hubspot_execution_completed") return "HubSpot contact and deal updates completed after approval.";
  if (status === "hubspot_execution_failed") return "The email was sent, but HubSpot execution failed.";
  return null;
}

/** "Consequence" (what approving unlocks, before it happens): AI-authored when available, else a real, deterministic sentence per kind. */
export function expectedOutcome(continuation: ApprovalContinuationPayload): string | null {
  const sourceMetadata = continuation.sourceMetadata && typeof continuation.sourceMetadata === "object" ? continuation.sourceMetadata : {};
  const aiExpectedOutcome = stringValue(sourceMetadata.expectedOutcome);
  if (aiExpectedOutcome) return aiExpectedOutcome;
  if (continuation.kind === "slack.send_after_approval") return "Post the approved Slack message and record the approval decision.";
  if (continuation.kind === "shared_action.execute_after_approval") return "Execute the approved action through the selected connector and record the result.";
  if (!isEmailKind(continuation.kind)) return null;
  const provider = continuation.kind === "microsoft.send_after_approval" ? "Microsoft 365" : "Gmail";
  if (continuation.crmPreparationStatus === "hubspot_execution_enabled") {
    return `Send the approved ${provider} follow-up now, then create or update the HubSpot contact/deal. CRM notes and tasks remain prepared only.`;
  }
  if (continuation.crmPreparationStatus === "hubspot_execution_not_ready") {
    return `Send the approved ${provider} follow-up now. HubSpot actions remain prepared only until CRM execution is implemented.`;
  }
  if (continuation.crmPreparationStatus === "hubspot_not_connected") {
    return `Send the approved ${provider} follow-up now. CRM updates are skipped because HubSpot is not connected.`;
  }
  return `Send the approved ${provider} follow-up now and record the approval decision.`;
}

/** "Consequence" (what happens, in system terms, right after approval is clicked). */
export function afterApprovalText(continuation: ApprovalContinuationPayload): string | null {
  if (continuation.kind === "shared_action.execute_after_approval") {
    return "Auterim executes this prepared action through the connected Trello account after approval.";
  }
  if (continuation.kind === "slack.send_after_approval") {
    return "Slack posts this exact message to the selected channel using the connected workspace Slack account.";
  }
  if (continuation.kind === "operations.execute_after_approval") {
    return "Auterim posts the internal Slack update and applies the prepared Trello change after approval. Nothing runs before approval.";
  }
  if (!isEmailKind(continuation.kind)) return null;
  const crmText = crmStatusText(continuation.crmPreparationStatus);
  const provider = continuation.kind === "microsoft.send_after_approval" ? "Microsoft 365" : "Gmail";
  return [
    `${provider} sends this exact draft using the connected workspace ${provider} account.`,
    crmText,
    "The run, logs and operator memory are updated with the approval decision.",
  ].filter(Boolean).join(" ");
}

/** "Why": the same derivation mapApproval() uses for payload_preview.whyThisMatters. */
export function deriveWhyThisMatters(continuation: ApprovalContinuationPayload): string | null {
  const sourceMetadata = continuation.sourceMetadata && typeof continuation.sourceMetadata === "object" ? continuation.sourceMetadata : {};
  const matchedKeywords = stringList(sourceMetadata.matchedKeywords).length > 0
    ? stringList(sourceMetadata.matchedKeywords)
    : stringList(continuation.crmPreparation?.matchedKeywords);
  return stringValue(sourceMetadata.whyThisMatters)
    ?? continuation.crmPreparation?.summary
    ?? (matchedKeywords.length > 0 ? `Matched revenue intent keywords: ${matchedKeywords.join(", ")}.` : null);
}

/**
 * "Evidence": a compact, one-line summary of the real structured context
 * already attached to the approval (source thread/contact, CRM record,
 * matched signal) - the same underlying fields /approvals shows in its
 * fuller "Policy evidence" panel, condensed for a dashboard row.
 */
export function deriveEvidenceSummary(continuation: ApprovalContinuationPayload): string | null {
  const sourceMetadata = continuation.sourceMetadata && typeof continuation.sourceMetadata === "object" ? continuation.sourceMetadata : {};
  const parts: string[] = [];
  const sourceEmail = stringValue(sourceMetadata.fromEmail) ?? stringValue(sourceMetadata.from);
  const sourceSubject = stringValue(sourceMetadata.subject) ?? stringValue(continuation.subject);
  if (sourceEmail) parts.push(`Message from ${sourceEmail}`);
  else if (sourceSubject) parts.push(`Thread: ${sourceSubject}`);
  const contactName = stringValue(continuation.crmPreparation?.contactName) ?? stringValue(continuation.crmPreparation?.companyName);
  if (contactName) parts.push(`CRM contact ${contactName}`);
  const matchedKeywords = stringList(sourceMetadata.matchedKeywords).length > 0
    ? stringList(sourceMetadata.matchedKeywords)
    : stringList(continuation.crmPreparation?.matchedKeywords);
  if (matchedKeywords.length > 0) parts.push(`Signals: ${matchedKeywords.slice(0, 3).join(", ")}`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
