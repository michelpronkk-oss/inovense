/**
 * Deterministic, rule-based internal-recommendation generation. This is
 * intentionally not a chatbot/LLM path: every field is derived from
 * already-persisted signal/candidate evidence via a small, bounded template
 * library, the same way classifySignalEvent/inbound.ts derive category and
 * priority from fixed term/pattern lists. It must never invent a price,
 * customer identity, plan availability, deadline, completed communication,
 * CRM mutation, or external task - only reflect what evidence already says.
 */

export type InternalRecommendationSource = {
  provider: string;
  channelId: string | null;
  messageTs: string | null;
  threadTs: string | null;
};

export type InternalRecommendationArtifact = {
  version: 1;
  operatorKey: string;
  primaryIntent: string;
  intentLabel: string;
  problemSummary: string;
  recommendedNextStep: { en: string; nl: string };
  reasonCodes: string[];
  evidenceRefs: string[];
  confidence: "low" | "medium" | "high" | null;
  /** Always true: this artifact only ever proposes a recommendation, never
   * an executed action. Any later email, Slack send, CRM mutation, or
   * external task creation is a distinct, separately approval-gated step. */
  approvalRequiredForNextAction: true;
  /** Always false at generation time - producing this artifact performs no
   * external action by itself. */
  externalActionTaken: false;
  source: InternalRecommendationSource;
  generatedAt: string;
};

const SEAT_COUNT_PATTERNS: RegExp[] = [
  /\b(\d{1,5})[\s-]*(?:seats?|users?|licenses?|people|employees|team members)\b/i,
  /\bteam of\s+(\d{1,5})\b/i,
];

function extractSeatCount(text: string): number | null {
  for (const pattern of SEAT_COUNT_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const value = Number(match[1]);
      if (Number.isSafeInteger(value) && value > 0 && value <= 100_000) return value;
    }
  }
  return null;
}

function scopeClause(seatCount: number | null, language: "en" | "nl"): string {
  if (language === "nl") {
    return seatCount ? `Bekijk de omvang van de prospect (${seatCount} stoelen)` : "Bekijk de omvang van de prospect";
  }
  return seatCount ? `Review the prospect's ${seatCount}-seat scope` : "Review the prospect's stated scope";
}

function actionClause(primaryIntent: string, language: "en" | "nl"): string {
  if (language === "nl") {
    if (primaryIntent === "PRICING_REQUEST") return "bereid de toepasselijke prijzen en onboardingopties voor";
    if (primaryIntent === "PROPOSAL_REQUEST") return "bereid een voorstelschets voor ter beoordeling";
    return "bereid een commerciële follow-up schets voor";
  }
  if (primaryIntent === "PRICING_REQUEST") return "prepare the applicable pricing and onboarding options";
  if (primaryIntent === "PROPOSAL_REQUEST") return "prepare a proposal outline for review";
  return "prepare a commercial follow-up outline";
}

function closingClause(language: "en" | "nl"): string {
  return language === "nl" ? "en stuur elke klantgerichte reactie door voor goedkeuring." : "and route any customer-facing response for approval.";
}

function buildRecommendedNextStep(input: { primaryIntent: string; sourceText: string }): { en: string; nl: string } {
  const seatCount = extractSeatCount(input.sourceText);
  const build = (language: "en" | "nl") => `${scopeClause(seatCount, language)}, ${actionClause(input.primaryIntent, language)}, ${closingClause(language)}`;
  return { en: build("en"), nl: build("nl") };
}

function intentLabelFor(primaryIntent: string): string {
  if (["PRICING_REQUEST", "PROPOSAL_REQUEST", "COMMERCIAL_INTENT"].includes(primaryIntent)) return "pricing opportunity";
  return "commercial opportunity";
}

/**
 * The only builder implemented so far, for Revenue's Slack explicit-
 * instruction flow. Returns null (never a guessed/empty artifact) when the
 * evidence needed to produce a substantive recommendation is missing -
 * callers must treat null as "cannot complete yet", never as success.
 */
export function buildRevenueInternalRecommendation(input: {
  candidate: { operatorKey: string; signalType: string; confidence: string | null; reasonCodes: string[] | null; evidence: Record<string, unknown> | null };
  signal: { contentPreview: string | null } | null;
  now?: string;
}): InternalRecommendationArtifact | null {
  const evidence = input.candidate.evidence ?? {};
  const primaryIntent = typeof evidence.primaryIntent === "string" && evidence.primaryIntent.trim() ? evidence.primaryIntent.trim() : null;
  if (!primaryIntent) return null;
  const slackOriginRaw = evidence.slackOrigin && typeof evidence.slackOrigin === "object" ? evidence.slackOrigin as Record<string, unknown> : {};
  const source: InternalRecommendationSource = {
    provider: "slack",
    channelId: typeof slackOriginRaw.channelId === "string" ? slackOriginRaw.channelId : null,
    messageTs: typeof slackOriginRaw.messageTs === "string" ? slackOriginRaw.messageTs : null,
    threadTs: typeof slackOriginRaw.threadTs === "string" ? slackOriginRaw.threadTs : null,
  };
  if (!source.channelId || !source.messageTs) return null;
  const sourceText = typeof input.signal?.contentPreview === "string" ? input.signal.contentPreview : "";
  const recommendedNextStep = buildRecommendedNextStep({ primaryIntent, sourceText });
  const reasonCodes = Array.isArray(input.candidate.reasonCodes) ? input.candidate.reasonCodes.filter((code): code is string => typeof code === "string").slice(0, 12) : [];
  const revenueSignals = Array.isArray(evidence.revenueSignals) ? evidence.revenueSignals.filter((item): item is string => typeof item === "string").slice(0, 10) : [];
  const confidence = input.candidate.confidence === "high" || input.candidate.confidence === "medium" || input.candidate.confidence === "low" ? input.candidate.confidence : null;
  return {
    version: 1,
    operatorKey: input.candidate.operatorKey,
    primaryIntent,
    intentLabel: intentLabelFor(primaryIntent),
    problemSummary: sourceText.slice(0, 320) || intentLabelFor(primaryIntent),
    recommendedNextStep,
    reasonCodes,
    evidenceRefs: [...reasonCodes, ...revenueSignals].slice(0, 20),
    confidence,
    approvalRequiredForNextAction: true,
    externalActionTaken: false,
    source,
    generatedAt: input.now ?? new Date().toISOString(),
  };
}
