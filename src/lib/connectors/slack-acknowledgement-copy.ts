export type SlackReplyLanguage = "en" | "nl";
export type SlackReplyState =
  | "routed"
  | "workflow_created"
  | "recommendation_ready"
  | "approval_required"
  | "non_actionable"
  | "processing_failure"
  | "draft_prepared"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "execution_succeeded"
  | "execution_failed";

export type SlackAcknowledgementFacts = {
  state: SlackReplyState;
  language: SlackReplyLanguage;
  operatorName?: string | null;
  intentLabel?: string | null;
  confidence?: "low" | "medium" | "high" | null;
  workflowUrl?: string | null;
  approvalUrl?: string | null;
  /** The already-persisted, language-matched internal recommendation text
   * (os_workflow_runs.result_evidence.internalRecommendation). Required
   * whenever state is "recommendation_ready" - never fabricated at compose
   * time, only ever read back from durable evidence. */
  recommendedNextStepText?: string | null;
};

const operatorNames: Record<string, string> = {
  revenue: "Revenue Operator",
  client_flow: "Client Flow Operator",
  operations: "Operations Operator",
  support: "Support Operator",
};

export function slackOperatorName(operatorKey: string | null | undefined): string {
  return operatorNames[operatorKey ?? ""] ?? "the relevant Operator";
}

export function slackIntentLabel(signalType: string | null | undefined, category?: string | null): string {
  const normalized = `${signalType ?? ""} ${category ?? ""}`.toLowerCase();
  if (normalized.includes("pricing") || normalized.includes("sales_opportunity") || normalized.includes("commercial")) return "pricing opportunity";
  if (normalized.includes("support") || normalized.includes("customer_request")) return "customer request";
  if (normalized.includes("blocked") || normalized.includes("stalled") || normalized.includes("delivery")) return "delivery risk";
  if (normalized.includes("escalat")) return "escalation";
  return "actionable work";
}

export function normalizeSlackReplyLanguage(value: unknown): SlackReplyLanguage | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "nl" || normalized.startsWith("nl-") || normalized.includes("dutch") || normalized.includes("nederlands")) return "nl";
  if (normalized === "en" || normalized.startsWith("en-") || normalized.includes("english")) return "en";
  return null;
}

/** Small deterministic detector for the short operational messages Slack sends. */
export function detectSlackMessageLanguage(text: string): SlackReplyLanguage | null {
  const normalized = text.toLowerCase().replace(/[^a-zà-ÿ]+/g, " ");
  const dutch = [" ik ", " het ", " een ", " voor ", " graag ", " prijs ", " offerte ", " volgende ", " actie ", " doorgestuurd ", " voorbereid ", " beslissing ", " deze week "];
  const english = [" the ", " a ", " an ", " for ", " please ", " price ", " pricing ", " quote ", " next ", " action ", " prepare ", " decision ", " this week "];
  const score = (terms: string[]) => terms.reduce((count, term) => count + (normalized.includes(term) ? 1 : 0), 0);
  const nlScore = score(dutch);
  const enScore = score(english);
  if (nlScore >= 2 && nlScore > enScore) return "nl";
  if (enScore >= 2 && enScore > nlScore) return "en";
  return null;
}

export function composeSlackReply(facts: SlackAcknowledgementFacts): string {
  const language = facts.language;
  if (facts.state === "non_actionable") {
    return language === "nl"
      ? "Ik heb dit ontvangen, maar ik kon geen uitvoerbaar werk voor een Operator identificeren. Voeg het gewenste resultaat of de volgende stap toe en vermeld me opnieuw."
      : "I received this, but I couldn’t identify actionable work for an Operator. Add the desired outcome or next step and mention me again.";
  }
  if (facts.state === "processing_failure") {
    return language === "nl"
      ? "Ik heb dit ontvangen, maar de verwerking kon niet worden voltooid. Het event is bewaard voor een nieuwe poging of beoordeling."
      : "I received this, but processing could not be completed. The event was retained for retry or review.";
  }
  if (facts.state === "rejected") {
    return language === "nl"
      ? "De goedkeuring is afgewezen. Er is niets verzonden of uitgevoerd."
      : "The approval was rejected. Nothing was sent or executed.";
  }
  if (facts.state === "approved") {
    return language === "nl"
      ? "De goedkeuring is vastgelegd. De goedgekeurde actie wordt verder verwerkt."
      : "Approval was recorded. The approved action is being processed.";
  }
  if (facts.state === "execution_succeeded") {
    return language === "nl" ? "De uitvoering is succesvol voltooid." : "Execution completed successfully.";
  }
  if (facts.state === "execution_failed") {
    return language === "nl"
      ? `De uitvoering kon niet worden voltooid.${facts.workflowUrl ? ` Bekijk het werkitem: ${facts.workflowUrl}` : ""}`
      : `Execution could not be completed.${facts.workflowUrl ? ` Review the work item: ${facts.workflowUrl}` : ""}`;
  }

  const operator = facts.operatorName ?? "the relevant Operator";
  const intent = facts.intentLabel ?? "actionable work";
  const confidence = facts.confidence === "high" ? (language === "nl" ? "hoge zekerheid" : "high confidence") : null;
  const classified = confidence ? `${intent} ${confidence}` : intent;
  // No os_workflow_runs row exists yet for this candidate. Only state what is
  // persisted - classification and routing - never that preparation has
  // started, which is a distinct, later, workflow-backed fact (see the
  // "workflow_created" branch below).
  if (facts.state === "routed") {
    return language === "nl"
      ? `Begrepen. Ik heb dit herkend als ${classified} en doorgestuurd naar de ${operator}. Er is nog geen externe actie uitgevoerd.`
      : `Got it. I classified this as ${classified} and routed it to the ${operator}. No external action has been taken.`;
  }
  if (facts.state === "approval_required" || facts.state === "approval_requested") {
    return language === "nl"
      ? `Begrepen. Ik heb dit herkend als ${classified} en doorgestuurd naar de ${operator}. De voorgestelde actie wacht op menselijke goedkeuring. Er is nog geen externe actie uitgevoerd.${facts.approvalUrl ? ` Bekijk de goedkeuring: ${facts.approvalUrl}` : ""}`
      : `Got it. I classified this as ${classified} and routed it to the ${operator}. The proposed action is awaiting human approval. No external action has been taken.${facts.approvalUrl ? ` Review the approval: ${facts.approvalUrl}` : ""}`;
  }
  // The substantive recommendation has been durably persisted (see
  // recommendation-service.ts) - this is the one state allowed to
  // quote it verbatim, and it always supersedes a separate "being prepared"
  // reply when an initial acknowledgement was deferred during generation.
  if (facts.state === "recommendation_ready" && facts.recommendedNextStepText) {
    return language === "nl"
      ? `Aanbevolen vervolgstap: ${facts.recommendedNextStepText} Er is nog geen externe actie uitgevoerd.`
      : `Recommended next step: ${facts.recommendedNextStepText} No external action has been taken.`;
  }
  // A real os_workflow_runs row exists for this candidate (whether its next
  // step is an external PM task or a connector-independent internal
  // recommendation) - "being prepared" is now a persisted fact, not a guess.
  if (facts.state === "workflow_created") {
    return language === "nl"
      ? `Begrepen. Ik heb dit herkend als ${classified} en doorgestuurd naar de ${operator}. De aanbevolen vervolgstap wordt voorbereid. Er is nog geen externe actie uitgevoerd.${facts.workflowUrl ? ` Bekijk het werkitem: ${facts.workflowUrl}` : ""}`
      : `Got it. I classified this as ${classified} and routed it to the ${operator}. The recommended next step is being prepared. No external action has been taken.${facts.workflowUrl ? ` Review the work item: ${facts.workflowUrl}` : ""}`;
  }
  if (facts.state === "draft_prepared") {
    return language === "nl"
      ? `De conceptactie is voorbereid voor beoordeling. Er is nog geen externe actie uitgevoerd.${facts.workflowUrl ? ` Bekijk het werkitem: ${facts.workflowUrl}` : ""}`
      : `The draft action is prepared for review. No external action has been taken.${facts.workflowUrl ? ` Review the work item: ${facts.workflowUrl}` : ""}`;
  }
  // Fail-conservative: an unmodeled state must never claim more progress than
  // "routed" does. Overstating persisted state is worse than understating it.
  return language === "nl"
    ? `Begrepen. Ik heb dit herkend als ${classified} en doorgestuurd naar de ${operator}. Er is nog geen externe actie uitgevoerd.`
    : `Got it. I classified this as ${classified} and routed it to the ${operator}. No external action has been taken.`;
}
