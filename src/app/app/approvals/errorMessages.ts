// Centralized raw-error-code -> human message mapping for the approvals UI.
// Presentation only: this never changes what the server validated or
// decided, it only decides how to word the same `error` code the API
// already returns. Unknown codes fall back to the server's own `message`
// so nothing is ever silently swallowed - the raw code always stays
// available for the "Technical details" disclosure.

export type FriendlyApprovalError = {
  title: string;
  body: string;
  primaryActionLabel: string;
};

const KNOWN_ERRORS: Record<string, FriendlyApprovalError> = {
  approval_scope_changed: {
    title: "Approval needs another review",
    body: "The action changed after this approval was prepared, so Auterim stopped before execution. Review the current version and approve again if it still looks right.",
    primaryActionLabel: "Review updated approval",
  },
  approval_execution_in_progress: {
    title: "Already in progress",
    body: "This approval is already being executed from another request. Refresh in a moment to see the result.",
    primaryActionLabel: "Refresh",
  },
  approval_claim_failed: {
    title: "Could not start execution",
    body: "Auterim could not safely claim this approval for execution, most likely because it was already actioned elsewhere. Refresh to see its current state.",
    primaryActionLabel: "Refresh",
  },
  approval_update_failed: {
    title: "Could not save the decision",
    body: "The decision did not save. Nothing was sent or executed. Try again.",
    primaryActionLabel: "Try again",
  },
  approval_not_pending: {
    title: "Already resolved",
    body: "This approval was already resolved, so the draft change could not be saved.",
    primaryActionLabel: "Refresh",
  },
  unsupported_approval_type: {
    title: "Draft editing not available",
    body: "Only prepared email approvals can be edited before sending.",
    primaryActionLabel: "Dismiss",
  },
  invalid_draft_subject: {
    title: "Subject required",
    body: "Add a subject line before saving this draft.",
    primaryActionLabel: "Dismiss",
  },
  invalid_draft_body: {
    title: "Body required",
    body: "Add a message body before saving this draft.",
    primaryActionLabel: "Dismiss",
  },
  missing_gmail_credentials: {
    title: "Gmail is not connected",
    body: "Auterim could not send this email because the workspace Gmail connection is missing or expired.",
    primaryActionLabel: "Refresh",
  },
  gmail_reconnect_required: {
    title: "Reconnect Gmail",
    body: "The Gmail connection needs to be reauthorized before this email can send.",
    primaryActionLabel: "Refresh",
  },
  missing_microsoft_connection: {
    title: "Microsoft 365 is not connected",
    body: "Auterim could not send this email because the workspace Microsoft 365 connection is missing or expired.",
    primaryActionLabel: "Refresh",
  },
  gmail_send_failed: {
    title: "Send failed",
    body: "Gmail did not accept this send. Nothing else was affected.",
    primaryActionLabel: "Try again",
  },
  microsoft_send_failed: {
    title: "Send failed",
    body: "Microsoft 365 did not accept this send. Nothing else was affected.",
    primaryActionLabel: "Try again",
  },
  slack_send_failed: {
    title: "Send failed",
    body: "Slack did not accept this message. Nothing else was affected.",
    primaryActionLabel: "Try again",
  },
  teams_send_failed: {
    title: "Send failed",
    body: "Microsoft Teams did not accept this message. Nothing else was affected.",
    primaryActionLabel: "Try again",
  },
  shared_action_failed: {
    title: "Action failed",
    body: "The connected system did not accept this action. Nothing else was affected.",
    primaryActionLabel: "Try again",
  },
  hubspot_execution_failed: {
    title: "CRM update failed",
    body: "The email sent, but the related HubSpot update failed. The email send itself is not affected.",
    primaryActionLabel: "Dismiss",
  },
  policy_unavailable: {
    title: "Could not verify policy",
    body: "Auterim could not re-check policy for this action right now, so it stopped before executing.",
    primaryActionLabel: "Try again",
  },
  invalid_payload: {
    title: "Approval could not be read",
    body: "This approval's prepared content looks incomplete, so Auterim stopped before executing it.",
    primaryActionLabel: "Refresh",
  },
};

export function describeApprovalError(code: string | undefined | null, rawMessage: string | undefined | null): FriendlyApprovalError {
  if (code && KNOWN_ERRORS[code]) return KNOWN_ERRORS[code];
  return {
    title: "Could not complete this action",
    body: rawMessage?.trim() || "Something went wrong. Nothing was sent or executed.",
    primaryActionLabel: "Try again",
  };
}
