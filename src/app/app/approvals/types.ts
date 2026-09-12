// Shared types for the approvals inbox UI. Mirrors exactly the shape the
// server (src/app/api/approvals/route.ts's mapApproval()) sends today -
// moved out of page.tsx so the new sub-components can share it without
// re-declaring or drifting from it.

export type ApprovalRow = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string | null;
  resolved_at: string | null;
  approval_type: string;
  category: string;
  continuation_kind: string | null;
  run_id: string | null;
  linked_run_id: string | null;
  agent_id: string | null;
  agent_mark: string | null;
  policy_reason: string | null;
  payload_preview: {
    to: string | null;
    subject: string | null;
    body: string | null;
    fullBody?: string | null;
    draftSubject?: string | null;
    draftBody?: string | null;
    originalDraftSubject?: string | null;
    originalDraftBody?: string | null;
    editedDraftSubject?: string | null;
    editedDraftBody?: string | null;
    wasEdited?: boolean;
    editedAt?: string | null;
    editedBy?: string | null;
    operatorKey: string | null;
    workflow?: { id: string | null; objective: string | null; stepId: string | null; stepOrder: number | null; stepCount: number | null; stepReason: string | null };
    dedupeKey?: string | null;
    dedupeMetadata?: Record<string, unknown> | null;
    preparedActions?: string[];
    crmPreparationStatus?: string | null;
    crmStatusText?: string | null;
    sourceMetadata?: Record<string, unknown>;
    detectedSignal?: string | null;
    sourceEmail?: string | null;
    classification?: string | null;
    confidence?: string | null;
    matchedKeywords?: string[];
    whyThisMatters?: string | null;
    riskLevel?: string | null;
    riskNotes?: string | null;
    expectedOutcome?: string | null;
    approvalReason?: string | null;
    whatHappensAfterApproval?: string | null;
    executionResult?: Record<string, unknown> | null;
    approvalScope?: {
      workspaceId?: string;
      operatorId?: string;
      connector?: string;
      action?: string;
      subjectType?: string | null;
      subjectId?: string | null;
      destinationType?: string;
      matchedPolicyRuleIds?: string[];
      policyVersion?: number;
      contextFingerprint?: string | null;
    } | null;
    approvalScopes?: Record<string, {
      connector?: string;
      action?: string;
      subjectType?: string | null;
      subjectId?: string | null;
      contextFingerprint?: string | null;
    }> | null;
    policyEvidence?: {
      policyVersion?: number;
      matchedRuleIds?: string[];
      connector?: string;
      action?: string;
      subjectType?: string | null;
      subjectId?: string | null;
      contextSummary?: Record<string, string | number | boolean | null>;
      contextFingerprint?: string | null;
      threshold?: { field?: string; operator?: string; configuredValue?: string | number | boolean | null; observedValue?: string | number | boolean | null; result?: string } | null;
      requiredApproverRoles?: string[];
      approvalExpiresAfterMinutes?: number | null;
    } | null;
    policyEvidenceByAction?: Record<string, {
      connector?: string;
      action?: string;
      subjectType?: string | null;
      subjectId?: string | null;
      contextSummary?: Record<string, string | number | boolean | null>;
      contextFingerprint?: string | null;
      threshold?: { field?: string; operator?: string; configuredValue?: string | number | boolean | null; observedValue?: string | number | boolean | null; result?: string } | null;
      requiredApproverRoles?: string[];
      approvalExpiresAfterMinutes?: number | null;
    }> | null;
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
    operations?: {
      signalType?: string;
      severity?: string;
      boardName?: string;
      listName?: string;
      cardName?: string | null;
      cardUrl?: string | null;
      plainEnglishSummary?: string;
      recommendedAction?: string;
      preparedSlackMessage?: string | null;
    } | null;
    operationsPolicy?: { slackMessage?: string; trelloUpdate?: string; humanReview?: string } | null;
    livePolicyDecision?: { decision: string; reason: string; riskLevel: string; matchedRuleId: string; userFacingLabel: string; requiresHumanReview: boolean } | null;
    preparedSlackAction?: { input?: Record<string, unknown> } | null;
    preparedTrelloAction?: { actionType?: string; title?: string; preview?: { label?: string; fields?: Array<{ label: string; value: string }>; bodyPreview?: string | null } } | null;
    customerEmailPolicy?: {
      mode?: string;
      customerEmail?: string;
      humanReview?: string;
      crmUpdate?: string;
      slackAlert?: string;
    } | null;
    preparedHubSpotActions?: {
      contact?: {
        email?: string | null;
        firstname?: string | null;
        lastname?: string | null;
        companyName?: string | null;
        source?: string | null;
      };
      deal?: {
        dealname?: string | null;
        stageLabel?: string | null;
        pipelineLabel?: string | null;
        amount?: number | null;
      };
      note?: {
        body?: string | null;
      };
      task?: {
        title?: string | null;
        dueSuggestion?: string | null;
        type?: string | null;
      };
      executionStatus?: string | null;
    } | null;
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
  };
};

export type ApprovalsResponse = {
  approvals?: ApprovalRow[];
  stats?: {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    total: number;
  };
  error?: string;
};

export type ApprovalPresentationError = {
  itemId: string;
  code: string;
  message: string;
};

export type DraftEdit = { subject: string; body: string };
