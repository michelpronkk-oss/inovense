import type {
  PolicyBusinessContext,
  PolicyConditionField,
  PolicyContextReliability,
  PolicyContextValue,
} from "@/lib/policies/types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function valueOf<T>(value: unknown, fallbackReliability: PolicyContextReliability = "observed"): PolicyContextValue<T> {
  const rec = record(value);
  if (Object.prototype.hasOwnProperty.call(rec, "value") || Object.prototype.hasOwnProperty.call(rec, "reliability")) {
    const reliability = rec.reliability;
    return {
      value: (rec.value ?? null) as T | null,
      reliability: reliability === "verified" || reliability === "observed" || reliability === "derived" || reliability === "stale" || reliability === "missing"
        ? reliability
        : rec.value == null ? "missing" : fallbackReliability,
      observedAt: typeof rec.observedAt === "string" ? rec.observedAt : null,
    };
  }
  return { value: value == null ? null : value as T, reliability: value == null ? "missing" : fallbackReliability };
}

function numberValue(value: unknown): PolicyContextValue<number> {
  const normalized = valueOf<number>(value);
  if (normalized.value == null) return { ...normalized, value: null, reliability: normalized.reliability === "missing" ? "missing" : normalized.reliability };
  const numeric = typeof normalized.value === "number" ? normalized.value : Number(normalized.value);
  return Number.isFinite(numeric) ? { ...normalized, value: numeric } : { ...normalized, value: null, reliability: "missing" };
}

function booleanValue(value: unknown): PolicyContextValue<boolean> {
  const normalized = valueOf<boolean>(value);
  return { ...normalized, value: typeof normalized.value === "boolean" ? normalized.value : null, reliability: typeof normalized.value === "boolean" ? normalized.reliability : "missing" };
}

export function normalizeBusinessContext(value: unknown): PolicyBusinessContext | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = record(value);
  const deal = record(root.deal);
  const customer = record(root.customer);
  const refund = record(root.refund);
  const project = record(root.project);
  const task = record(root.task);
  const campaign = record(root.campaign);
  const document = record(root.document);
  const workspace = record(root.workspace);
  return {
    deal: Object.keys(deal).length ? {
      amount: numberValue(deal.amount),
      currency: valueOf<string>(deal.currency),
      stage: valueOf<string>(deal.stage),
      discount_percent: numberValue(deal.discount_percent),
    } : undefined,
    customer: Object.keys(customer).length ? {
      tier: valueOf<string>(customer.tier),
      region: valueOf<string>(customer.region),
      sentiment: valueOf<string>(customer.sentiment),
      sla_priority: valueOf<string>(customer.sla_priority),
    } : undefined,
    refund: Object.keys(refund).length ? { amount: numberValue(refund.amount) } : undefined,
    project: Object.keys(project).length ? {
      priority: valueOf<string>(project.priority),
      due_date_impact: valueOf<string>(project.due_date_impact),
    } : undefined,
    task: Object.keys(task).length ? {
      type: valueOf<string>(task.type),
      external_collaborator: booleanValue(task.external_collaborator),
    } : undefined,
    campaign: Object.keys(campaign).length ? {
      spend: numberValue(campaign.spend),
      audience_size: numberValue(campaign.audience_size),
    } : undefined,
    document: Object.keys(document).length ? { sensitivity: valueOf<string>(document.sensitivity) } : undefined,
    workspace: Object.keys(workspace).length ? { risk_level: valueOf<string>(workspace.risk_level) } : undefined,
  };
}

export function contextValue(context: PolicyBusinessContext | undefined, field: PolicyConditionField): PolicyContextValue<unknown> {
  const [group, key] = field.split(".") as [keyof PolicyBusinessContext, string];
  const groupValue = context?.[group] as UnknownRecord | undefined;
  const result = groupValue?.[key];
  if (result && typeof result === "object" && Object.prototype.hasOwnProperty.call(result, "reliability")) {
    return result as PolicyContextValue<unknown>;
  }
  return valueOf(result, "missing");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value) ?? "null";
  return `{${Object.keys(value as UnknownRecord).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as UnknownRecord)[key])}`).join(",")}}`;
}

/** Stable, non-reversible fingerprint for reapproval and idempotency evidence. */
export function businessContextFingerprint(context: PolicyBusinessContext | undefined): string | null {
  if (!context) return null;
  const input = canonical(context);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ctx-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function summarizeBusinessContext(context: PolicyBusinessContext | undefined): Record<string, string | number | boolean | null> {
  const summary: Record<string, string | number | boolean | null> = {};
  if (!context) return summary;
  for (const field of [
    "deal.amount", "deal.currency", "deal.stage", "deal.discount_percent",
    "customer.tier", "customer.region", "customer.sentiment", "customer.sla_priority",
    "refund.amount", "project.priority", "project.due_date_impact", "task.type",
    "task.external_collaborator", "campaign.spend", "campaign.audience_size",
    "document.sensitivity", "workspace.risk_level",
  ] as PolicyConditionField[]) {
    const value = contextValue(context, field);
    if (value.value !== null && value.value !== undefined) summary[field] = value.value as string | number | boolean;
  }
  return summary;
}

export function hubSpotBusinessContext(preparedHubSpotActions: unknown): PolicyBusinessContext | undefined {
  const root = record(preparedHubSpotActions);
  if (root.businessContext && typeof root.businessContext === "object") return normalizeBusinessContext(root.businessContext);
  const deal = record(root.deal);
  if (!Object.keys(deal).length) return undefined;
  return normalizeBusinessContext({
    deal: {
      amount: typeof deal.amount === "number" ? { value: deal.amount, reliability: "verified" } : { value: null, reliability: "missing" },
      currency: typeof deal.currency === "string" ? { value: deal.currency.toUpperCase(), reliability: "verified" } : { value: null, reliability: "missing" },
      stage: deal.stageLabel ?? deal.stage,
      discount_percent: deal.discount_percent ?? deal.discountPercent,
    },
  });
}
