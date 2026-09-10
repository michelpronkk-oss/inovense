import type { PolicyBusinessContext, PolicyContextReliability } from "@/lib/policies/types";
import type { RevenueCrmCompany, RevenueCrmOpportunity, RevenueCrmPerson } from "@/lib/operators/revenue/crm";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type RevenueMemoryExample = {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
};

export type RevenueCompanyGraphContext = {
  workspaceId: string;
  companyName: string | null;
  website: string | null;
  offerSummary: string | null;
  toneOfVoice: string | null;
  pricingRules: string[];
  policies: { approvalPolicy: Record<string, unknown>; bannedClaims: string[] };
  approvedExamples: RevenueMemoryExample[];
  rejectedExamples: RevenueMemoryExample[];
  recentSuccessfulApprovalLearnings: RevenueMemoryExample[];
  recentRejectionLearnings: RevenueMemoryExample[];
  memoryKeysUsed: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return null;
}

function compactExample(row: Record<string, unknown>): RevenueMemoryExample {
  return { id: String(row.id ?? ""), title: asString(row.title) ?? "Revenue memory", content: asString(row.content)?.slice(0, 900) ?? "", metadata: asRecord(row.metadata), createdAt: asString(row.created_at) };
}

export async function loadRevenueCompanyGraphContext(input: { supabase: SupabaseAdmin; workspaceId: string }): Promise<RevenueCompanyGraphContext> {
  const memoryKeysUsed = new Set<string>();
  const [workspaceRes, settingsRes, snapshotRes, memoryRes] = await Promise.all([
    input.supabase.from("os_workspaces").select("id,name").eq("id", input.workspaceId).maybeSingle(),
    input.supabase.from("os_workspace_settings").select("approval_policy,notifications").eq("workspace_id", input.workspaceId).maybeSingle(),
    input.supabase.from("os_state_snapshots").select("state").eq("workspace_id", input.workspaceId).maybeSingle(),
    input.supabase.from("os_operator_memory").select("id,memory_type,title,content,metadata,approval_status,created_at").eq("workspace_id", input.workspaceId).eq("operator_key", "revenue").order("created_at", { ascending: false }).limit(40),
  ]);
  const snapshotState = asRecord(snapshotRes.data?.state);
  const onboarding = asRecord(snapshotState.onboarding);
  const settings = asRecord(snapshotState.settings);
  const workspaceSettings = asRecord(settings.workspace);
  const approvalPolicy = { ...asRecord(settingsRes.data?.approval_policy), ...asRecord(settings.approvalPolicy) };
  const companyName = firstString(workspaceRes.data?.name, onboarding.companyName, workspaceSettings.name);
  const website = firstString(onboarding.websiteUrl, workspaceSettings.websiteUrl);
  const memoryRows = (memoryRes.data ?? []).map((row) => row as Record<string, unknown>);
  const approvedRows = memoryRows.filter((row) => row.approval_status === "approved");
  const rejectedRows = memoryRows.filter((row) => row.approval_status === "rejected");
  memoryRows.forEach((row) => {
    const id = asString(row.id);
    const memoryType = asString(row.memory_type);
    if (id) memoryKeysUsed.add(`os_operator_memory:${id}`);
    if (memoryType) memoryKeysUsed.add(`memory_type:${memoryType}`);
  });
  if (settingsRes.data) memoryKeysUsed.add("os_workspace_settings:approval_policy");
  if (snapshotRes.data) memoryKeysUsed.add("os_state_snapshots:onboarding_profile");
  if (workspaceRes.data) memoryKeysUsed.add("os_workspaces:name");
  const approvedExamples = approvedRows.slice(0, 5).map(compactExample);
  const rejectedExamples = rejectedRows.slice(0, 5).map(compactExample);
  const profile = asRecord(onboarding.profile);
  const brand = asRecord(onboarding.brand);
  const memoryMetadata = memoryRows.map((row) => asRecord(row.metadata));
  const offerSummary = firstString(onboarding.offer, onboarding.products, onboarding.services, profile.offer, profile.services, memoryMetadata.find((item) => asString(item.offerSummary))?.offerSummary);
  const toneOfVoice = firstString(onboarding.toneOfVoice, brand.toneOfVoice, memoryMetadata.find((item) => asString(item.toneOfVoice))?.toneOfVoice);
  const pricingRules = [...asStringArray(onboarding.pricingRules), ...asStringArray(profile.pricingRules), ...memoryMetadata.flatMap((item) => asStringArray(item.pricingRules))].slice(0, 8);
  const bannedClaims = [...asStringArray(approvalPolicy.bannedClaims), ...asStringArray(profile.bannedClaims), ...memoryMetadata.flatMap((item) => asStringArray(item.bannedClaims))].slice(0, 12);
  return { workspaceId: input.workspaceId, companyName, website, offerSummary, toneOfVoice, pricingRules, policies: { approvalPolicy, bannedClaims }, approvedExamples, rejectedExamples, recentSuccessfulApprovalLearnings: approvedExamples, recentRejectionLearnings: rejectedExamples, memoryKeysUsed: Array.from(memoryKeysUsed).slice(0, 30) };
}

export type RevenuePreparationState =
  | "ready_to_follow_up"
  | "follow_up_needed"
  | "needs_commercial_information"
  | "feasibility_dependency"
  | "client_context_required";

export type RevenueContext = {
  provider: "gmail" | "microsoft";
  threadId: string | null;
  contact: {
    email: string | null;
    name: string | null;
    role: string | null;
    reliability: PolicyContextReliability;
  };
  account: {
    id: string | null;
    name: string | null;
    status: "customer" | "prospect" | "unknown";
    owner: string | null;
    reliability: PolicyContextReliability;
  };
  deal: {
    id: string | null;
    name: string | null;
    amount: number | null;
    currency: string | null;
    stage: string | null;
    closeDate: string | null;
    owner: string | null;
    reliability: PolicyContextReliability;
  };
  communication: {
    subject: string | null;
    commercialIntent: string[];
    unansweredHours: number | null;
    knownCommitment: string | null;
  };
  preparationState: RevenuePreparationState;
  priority: number;
  priorityReasons: string[];
  supportingOperators: string[];
  businessContext: PolicyBusinessContext;
};

function value<T>(input: T | null | undefined, reliability: PolicyContextReliability): { value: T | null; reliability: PolicyContextReliability } {
  return { value: input ?? null, reliability: input == null ? "missing" : reliability };
}

function bounded(value: string | null | undefined, max: number): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function ageHours(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 3_600_000) : null;
}

function intentLabels(subject: string | null | undefined, body: string | null | undefined): string[] {
  const text = `${subject ?? ""} ${body ?? ""}`.toLowerCase();
  const labels: Array<[RegExp, string]> = [
    [/\b(price|pricing|cost|budget)\b/, "pricing_request"],
    [/\b(quote|proposal|commercial terms|scope)\b/, "proposal_or_scope"],
    [/\b(renew|renewal|contract ends|expir)/, "renewal_risk"],
    [/\b(expand|expansion|additional seats|upsell|more work)\b/, "expansion_interest"],
    [/\b(meeting|call|demo|next step|availability)\b/, "meeting_or_next_step"],
    [/\b(waiting|follow up|following up|any update|still interested)\b/, "follow_up_needed"],
  ];
  return labels.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
}

function commercialReason(intent: string[], deal: RevenueCrmOpportunity | null, unansweredHours: number | null): string[] {
  const reasons = intent.map((item) => item.replace(/_/g, " "));
  if (deal?.amount != null && deal.currency) reasons.push(`${deal.currency.toUpperCase()} ${deal.amount.toLocaleString()} active opportunity`);
  if (deal?.stage) reasons.push(`${deal.stage} stage`);
  if (unansweredHours != null && unansweredHours >= 24) reasons.push(`no response for ${Math.floor(unansweredHours / 24)} day${Math.floor(unansweredHours / 24) === 1 ? "" : "s"}`);
  return reasons.slice(0, 8);
}

export function buildRevenueContext(input: {
  provider: "gmail" | "microsoft";
  threadId?: string | null;
  subject?: string | null;
  body?: string | null;
  receivedAt?: string | null;
  person?: RevenueCrmPerson | null;
  company?: RevenueCrmCompany | null;
  opportunity?: RevenueCrmOpportunity | null;
  directSignals?: string[];
  requestSignals?: string[];
  contextSignals?: string[];
}): RevenueContext {
  const person = input.person ?? null;
  const company = input.company ?? null;
  const deal = input.opportunity ?? null;
  const commercialIntent = [...new Set([...(input.directSignals ?? []), ...(input.requestSignals ?? []), ...(input.contextSignals ?? []), ...intentLabels(input.subject, input.body)])].slice(0, 12);
  const unansweredHours = ageHours(input.receivedAt);
  const priorityReasons = commercialReason(commercialIntent, deal, unansweredHours);
  let priority = 45;
  if (commercialIntent.some((item) => /pricing|proposal|scope|renewal/.test(item))) priority += 15;
  if (deal?.amount != null && deal.amount >= 10_000) priority += 15;
  if (deal?.stage && /proposal|negotiat|decision|renew/i.test(deal.stage)) priority += 10;
  if (unansweredHours != null && unansweredHours >= 48) priority += 10;
  priority = Math.min(100, priority);

  const needsCommercialInformation = commercialIntent.some((item) => /pricing|proposal_or_scope/.test(item)) && (!deal || deal.amount == null || !deal.currency);
  const feasibilityDependency = /\b(feasible|feasibility|timeline|delivery|implementation|scope)\b/i.test(`${input.subject ?? ""} ${input.body ?? ""}`);
  const preparationState: RevenuePreparationState = needsCommercialInformation
    ? "needs_commercial_information"
    : feasibilityDependency
      ? "feasibility_dependency"
      : commercialIntent.includes("follow_up_needed") || (unansweredHours != null && unansweredHours >= 48)
        ? "follow_up_needed"
        : "ready_to_follow_up";

  const contactReliability: PolicyContextReliability = person ? "verified" : "missing";
  const accountReliability: PolicyContextReliability = company ? "verified" : "missing";
  const dealReliability: PolicyContextReliability = deal ? "verified" : "missing";
  const businessContext: PolicyBusinessContext = {
    deal: {
      amount: value(deal?.amount, dealReliability),
      currency: value(deal?.currency?.toUpperCase() ?? null, dealReliability),
      stage: value(deal?.stage, dealReliability),
    },
    customer: {
      tier: value(null, "missing"),
      region: value(null, "missing"),
    },
  };

  return {
    provider: input.provider,
    threadId: bounded(input.threadId, 240),
    contact: { email: bounded(person?.email ?? null, 240), name: bounded([person?.firstName, person?.lastName].filter(Boolean).join(" "), 160), role: bounded(person?.title, 120), reliability: contactReliability },
    account: { id: bounded(company?.id, 160), name: bounded(company?.name ?? person?.companyName, 180), status: "unknown", owner: bounded(company?.ownerName ?? person?.ownerName, 160), reliability: accountReliability },
    deal: { id: bounded(deal?.id, 160), name: bounded(deal?.name, 180), amount: deal?.amount ?? null, currency: bounded(deal?.currency?.toUpperCase(), 16), stage: bounded(deal?.stage, 120), closeDate: bounded(deal?.closeDate, 40), owner: bounded(deal?.ownerName, 160), reliability: dealReliability },
    communication: { subject: bounded(input.subject, 240), commercialIntent, unansweredHours, knownCommitment: null },
    preparationState,
    priority,
    priorityReasons,
    supportingOperators: feasibilityDependency ? ["operations"] : [],
    businessContext,
  };
}

export function publicRevenueContext(context: RevenueContext): Record<string, unknown> {
  return {
    provider: context.provider,
    threadId: context.threadId,
    contact: context.contact,
    account: context.account,
    deal: context.deal,
    communication: context.communication,
    preparationState: context.preparationState,
    priority: context.priority,
    priorityReasons: context.priorityReasons,
    supportingOperators: context.supportingOperators,
  };
}
