import { Nango, type HTTP_METHOD } from "@nangohq/node";
import { HUBSPOT_PROVIDER_CONFIG_KEY, verifyNangoConnection } from "@/lib/integrations/nango";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type HubSpotConnection = {
  workspaceId: string;
  providerConfigKey: string;
  nangoConnectionId: string;
  accountEmail?: string | null;
};

export type HubSpotContactInput = {
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  companyName?: string | null;
  source?: string | null;
  attribution?: HubSpotAttributionInput | null;
  propertyReadiness?: HubSpotPropertyReadiness | null;
};

export type HubSpotDealInput = {
  dealname: string;
  contactEmail?: string | null;
  amount?: number | null;
  stageLabel?: string | null;
  pipelineLabel?: string | null;
  attribution?: HubSpotAttributionInput | null;
  pipelineId?: string | null;
  dealstageId?: string | null;
  propertyReadiness?: HubSpotPropertyReadiness | null;
};

export type HubSpotAttributionInput = {
  workspaceId?: string | null;
  sourceSubject?: string | null;
  classification?: string | null;
  confidence?: string | null;
  suggestedNextStep?: string | null;
  dedupeKey?: string | null;
  gmailMessageId?: string | null;
  gmailThreadId?: string | null;
  contactEmail?: string | null;
  normalizedSubject?: string | null;
  signalSource?: string | null;
};

export type PreparedHubSpotActions = {
  contact?: HubSpotContactInput;
  deal?: HubSpotDealInput;
  note?: {
    body?: string | null;
  };
  task?: {
    title?: string | null;
    dueSuggestion?: string | null;
    type?: "follow_up" | string;
  };
  executionStatus?: "prepared" | "execution_enabled" | "prepared_not_enabled";
};

export type HubSpotExecutionResult = {
  status: "completed" | "skipped" | "failed";
  contactId?: string | null;
  dealId?: string | null;
  contact?: Record<string, unknown> | null;
  deal?: Record<string, unknown> | null;
  association?: Record<string, unknown> | null;
  note?: { status: "created" | "skipped" | "failed"; id?: string | null; reason?: string; error?: Record<string, unknown> };
  task?: { status: "created" | "skipped" | "failed"; id?: string | null; reason?: string; error?: Record<string, unknown> };
  error?: Record<string, unknown>;
  attributionWriteStatus?: "standard_only" | "custom_properties_written" | "custom_properties_missing" | "failed";
  propertySetupStatus?: HubSpotPropertySetupStatus;
  missingCustomProperties?: {
    contacts: string[];
    deals: string[];
  };
  hubspotSetupRecommendation?: {
    missingContactProperties: string[];
    missingDealProperties: string[];
    suggestedAction: string;
    severity: "non_blocking";
  } | null;
  pipelineId?: string | null;
  pipelineLabel?: string | null;
  dealstageId?: string | null;
  dealstageLabel?: string | null;
  pipelineSelectionReason?: string | null;
};

type HubSpotSearchResult = {
  results?: Array<{
    id?: string;
    properties?: Record<string, unknown>;
  }>;
};

type HubSpotObjectResult = {
  id?: string;
  properties?: Record<string, unknown>;
};

const HUBSPOT_NAME_CONTAMINATION = new Set(["hi", "hello", "hey", "dear", "hoi", "hallo", "michel"]);
const ENABLE_HUBSPOT_PROPERTY_AUTO_CREATE = false;
const INOVENSE_CUSTOM_PROPERTY_NAMES = [
  "inovense_source",
  "inovense_operator",
  "inovense_signal_source",
  "inovense_signal_type",
  "inovense_confidence",
  "inovense_original_subject",
  "inovense_workspace_id",
  "inovense_created_by_operator",
] as const;

export type HubSpotPropertySetupStatus =
  | "custom_properties_ready"
  | "custom_properties_partial"
  | "custom_properties_missing"
  | "property_check_failed";

export type HubSpotPropertyReadiness = {
  status: HubSpotPropertySetupStatus;
  contactExistingProperties: string[];
  dealExistingProperties: string[];
  missingContactProperties: string[];
  missingDealProperties: string[];
  autoCreateEnabled: boolean;
  error?: unknown;
};

export type HubSpotPipelineMapping = {
  status: "ready" | "fallback" | "failed";
  pipelineId: string | null;
  pipelineLabel: string | null;
  dealstageId: string | null;
  dealstageLabel: string | null;
  pipelineSelectionReason: string;
  error?: unknown;
};

export class HubSpotExecutionError extends Error {
  details: {
    step: string;
    method?: string;
    path?: string;
    status: number | null;
    statusText: string | null;
    responseBody: unknown;
  };

  constructor(message: string, details: HubSpotExecutionError["details"]) {
    super(message);
    this.name = "HubSpotExecutionError";
    this.details = details;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function nangoHost(): string {
  return (process.env.NANGO_HOST || "https://api.nango.dev").replace(/\/+$/, "");
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asErrorDetails(error: unknown, step: string, method?: string, path?: string): HubSpotExecutionError["details"] {
  const maybe = error as {
    response?: {
      status?: number;
      statusText?: string;
      data?: unknown;
    };
  };
  return {
    step,
    method,
    path,
    status: typeof maybe.response?.status === "number" ? maybe.response.status : null,
    statusText: maybe.response?.statusText ?? null,
    responseBody: maybe.response?.data ?? null,
  };
}

function createHubSpotError(error: unknown, step: string, method?: string, path?: string): HubSpotExecutionError {
  const details = asErrorDetails(error, step, method, path);
  const message = error instanceof Error ? error.message : "HubSpot execution failed.";
  return new HubSpotExecutionError(message, details);
}

function splitName(name: string | null | undefined): { firstname?: string; lastname?: string } {
  if (!name) return {};
  let parts = name.trim().split(/\s+/).filter(Boolean);
  const contaminationIndex = parts.findIndex((part, index) => index > 0 && HUBSPOT_NAME_CONTAMINATION.has(part.toLowerCase()));
  if (contaminationIndex > 0) {
    parts = parts.slice(0, contaminationIndex);
  }
  if (parts.some((part) => /[@\d]/.test(part) || /[^\p{L}'-]/u.test(part))) return {};
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstname: parts[0] };
  return { firstname: parts[0], lastname: parts.slice(1, 3).join(" ") };
}

function buildContactProperties(input: HubSpotContactInput): Record<string, string> {
  const fromName = splitName(input.firstname && input.lastname ? `${input.firstname} ${input.lastname}` : input.firstname || input.lastname || null);
  const properties: Record<string, string> = { email: input.email.trim().toLowerCase() };
  const firstname = fromName.firstname ?? cleanString(input.firstname);
  const lastname = fromName.lastname ?? null;
  const company = cleanString(input.companyName);
  if (firstname) properties.firstname = firstname;
  if (lastname) properties.lastname = lastname;
  if (company) properties.company = company;
  return properties;
}

function buildDealProperties(input: HubSpotDealInput): Record<string, string> {
  const properties: Record<string, string> = {
    dealname: input.dealname.trim(),
  };
  if (input.pipelineId) properties.pipeline = input.pipelineId;
  if (input.dealstageId) properties.dealstage = input.dealstageId;
  if (typeof input.amount === "number" && Number.isFinite(input.amount)) {
    properties.amount = String(input.amount);
  }
  return properties;
}

function buildStandardContactAttribution(): Record<string, string> {
  return {
    lifecyclestage: "lead",
    hs_lead_status: "NEW",
  };
}

function buildCustomAttribution(input: HubSpotAttributionInput | null | undefined): Record<string, string> {
  return {
    inovense_source: "Inovense OS",
    inovense_operator: "revenue",
    inovense_signal_source: input?.signalSource || "gmail",
    inovense_signal_type: "revenue_opportunity",
    inovense_confidence: input?.confidence || "high",
    inovense_original_subject: input?.sourceSubject || "",
    inovense_workspace_id: input?.workspaceId || "",
    inovense_created_by_operator: "true",
  };
}

function filterProperties(properties: Record<string, string>, allowed: string[]): Record<string, string> {
  const allowedSet = new Set(allowed);
  return Object.fromEntries(Object.entries(properties).filter(([key]) => allowedSet.has(key)));
}

function propertySetupStatus(missingContact: string[], missingDeal: string[]): HubSpotPropertySetupStatus {
  const missingTotal = missingContact.length + missingDeal.length;
  if (missingTotal === 0) return "custom_properties_ready";
  if (missingTotal === INOVENSE_CUSTOM_PROPERTY_NAMES.length * 2) return "custom_properties_missing";
  return "custom_properties_partial";
}

function setupRecommendation(readiness: HubSpotPropertyReadiness) {
  if (readiness.status === "custom_properties_ready") return null;
  return {
    missingContactProperties: readiness.missingContactProperties,
    missingDealProperties: readiness.missingDealProperties,
    suggestedAction: "Create Inovense attribution properties in HubSpot to preserve full source context.",
    severity: "non_blocking" as const,
  };
}

export async function getHubSpotPropertyReadiness(workspaceId: string): Promise<HubSpotPropertyReadiness> {
  try {
    const [contactProperties, dealProperties] = await Promise.all([
      hubspotRequest<{ results?: { name?: string }[] }>(workspaceId, "GET", "/crm/v3/properties/contacts"),
      hubspotRequest<{ results?: { name?: string }[] }>(workspaceId, "GET", "/crm/v3/properties/deals"),
    ]);
    const contactExistingProperties = (contactProperties.results ?? []).map((property) => property.name).filter((name): name is string => typeof name === "string");
    const dealExistingProperties = (dealProperties.results ?? []).map((property) => property.name).filter((name): name is string => typeof name === "string");
    const missingContactProperties = INOVENSE_CUSTOM_PROPERTY_NAMES.filter((name) => !contactExistingProperties.includes(name));
    const missingDealProperties = INOVENSE_CUSTOM_PROPERTY_NAMES.filter((name) => !dealExistingProperties.includes(name));
    return {
      status: propertySetupStatus(missingContactProperties, missingDealProperties),
      contactExistingProperties,
      dealExistingProperties,
      missingContactProperties,
      missingDealProperties,
      autoCreateEnabled: ENABLE_HUBSPOT_PROPERTY_AUTO_CREATE,
    };
  } catch (error) {
    return {
      status: "property_check_failed",
      contactExistingProperties: [],
      dealExistingProperties: [],
      missingContactProperties: [...INOVENSE_CUSTOM_PROPERTY_NAMES],
      missingDealProperties: [...INOVENSE_CUSTOM_PROPERTY_NAMES],
      autoCreateEnabled: ENABLE_HUBSPOT_PROPERTY_AUTO_CREATE,
      error: error instanceof HubSpotExecutionError ? error.details : error instanceof Error ? error.message : "HubSpot property check failed.",
    };
  }
}

type HubSpotPipelineResult = {
  results?: {
    id?: string;
    label?: string;
    displayOrder?: number;
    stages?: {
      id?: string;
      label?: string;
      displayOrder?: number;
      metadata?: Record<string, unknown>;
    }[];
  }[];
};

function isClosedStage(stage: { label?: string; metadata?: Record<string, unknown> }): boolean {
  const label = (stage.label ?? "").toLowerCase();
  const metadata = stage.metadata ?? {};
  return label.includes("closed") || label.includes("won") || label.includes("lost") || metadata.isClosed === "true" || metadata.isClosed === true;
}

function scorePipeline(label: string): number {
  const normalized = label.toLowerCase();
  if (normalized.includes("sales pipeline")) return 100;
  if (normalized.includes("sales")) return 80;
  if (normalized.includes("deal")) return 40;
  return 10;
}

function scoreStage(label: string): number {
  const normalized = label.toLowerCase();
  const preferred = [
    { needle: "new inbound opportunity", score: 100 },
    { needle: "appointment scheduled", score: 92 },
    { needle: "qualified to buy", score: 88 },
    { needle: "discovery", score: 84 },
    { needle: "proposal", score: 72 },
    { needle: "pricing", score: 70 },
    { needle: "new", score: 64 },
  ];
  return preferred.find((item) => normalized.includes(item.needle))?.score ?? 10;
}

export async function getHubSpotDealPipelineMapping(workspaceId: string): Promise<HubSpotPipelineMapping> {
  try {
    const pipelines = await hubspotRequest<HubSpotPipelineResult>(workspaceId, "GET", "/crm/v3/pipelines/deals");
    const available = (pipelines.results ?? []).filter((pipeline) => pipeline.id && Array.isArray(pipeline.stages));
    if (available.length === 0) {
      return { status: "failed", pipelineId: null, pipelineLabel: null, dealstageId: null, dealstageLabel: null, pipelineSelectionReason: "No HubSpot deal pipelines were returned." };
    }
    const pipeline = [...available].sort((a, b) => {
      const scoreDiff = scorePipeline(b.label ?? "") - scorePipeline(a.label ?? "");
      if (scoreDiff !== 0) return scoreDiff;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    })[0];
    const stages = (pipeline.stages ?? []).filter((stage) => stage.id && !isClosedStage(stage));
    const stage = [...stages].sort((a, b) => {
      const scoreDiff = scoreStage(b.label ?? "") - scoreStage(a.label ?? "");
      if (scoreDiff !== 0) return scoreDiff;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    })[0];
    if (!stage?.id) {
      return { status: "failed", pipelineId: pipeline.id ?? null, pipelineLabel: pipeline.label ?? null, dealstageId: null, dealstageLabel: null, pipelineSelectionReason: "No non-closed deal stage was available." };
    }
    const pipelineScore = scorePipeline(pipeline.label ?? "");
    const stageScore = scoreStage(stage.label ?? "");
    return {
      status: pipelineScore >= 80 && stageScore >= 64 ? "ready" : "fallback",
      pipelineId: pipeline.id ?? null,
      pipelineLabel: pipeline.label ?? null,
      dealstageId: stage.id,
      dealstageLabel: stage.label ?? null,
      pipelineSelectionReason: `Selected ${pipeline.label ?? "pipeline"} / ${stage.label ?? "stage"} using ${pipelineScore >= 80 && stageScore >= 64 ? "preferred" : "fallback"} matching.`,
    };
  } catch (error) {
    return {
      status: "failed",
      pipelineId: null,
      pipelineLabel: null,
      dealstageId: null,
      dealstageLabel: null,
      pipelineSelectionReason: "HubSpot pipeline discovery failed.",
      error: error instanceof HubSpotExecutionError ? error.details : error instanceof Error ? error.message : "HubSpot pipeline discovery failed.",
    };
  }
}

function buildDealAttributionDescription(input: HubSpotAttributionInput | null | undefined): string {
  return [
    "Created by Inovense OS Revenue Operator.",
    `Source channel: ${input?.signalSource === "microsoft" ? "Microsoft 365/email" : "Gmail/email"}.`,
    `Source subject: ${input?.sourceSubject || "-"}.`,
    `Classification: ${input?.classification || "revenue_opportunity"}.`,
    `Confidence: ${input?.confidence || "high"}.`,
    `Suggested next step: ${input?.suggestedNextStep || "-"}`,
  ].join("\n");
}

function safeDealName(value: unknown, fallbackEmail: string): string {
  const dealName = cleanString(value);
  return dealName || `Inbound opportunity - ${fallbackEmail}`;
}

export async function getHubSpotConnection(workspaceId: string, supabase = createSupabaseAdmin()): Promise<HubSpotConnection | null> {
  const res = await supabase
    .from("os_connectors")
    .select("workspace_id,connector_key,status,provider_email,provider_config_key,nango_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "hubspot")
    .eq("status", "connected")
    .maybeSingle();

  if (res.error) throw new Error(res.error.message);
  if (!res.data?.provider_config_key || !res.data?.nango_connection_id) return null;

  const verification = await verifyNangoConnection({
    connectorKey: "hubspot",
    providerConfigKey: String(res.data.provider_config_key),
    connectionId: String(res.data.nango_connection_id),
  });
  if (!verification.ok) return null;

  return {
    workspaceId,
    providerConfigKey: String(res.data.provider_config_key || HUBSPOT_PROVIDER_CONFIG_KEY),
    nangoConnectionId: String(res.data.nango_connection_id),
    accountEmail: typeof res.data.provider_email === "string" ? res.data.provider_email : null,
  };
}

async function hubspotRequestWithConnection<T = unknown>(
  connection: HubSpotConnection,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const nango = new Nango({
    secretKey: required("NANGO_SECRET_KEY"),
    host: nangoHost(),
    providerConfigKey: connection.providerConfigKey,
    connectionId: connection.nangoConnectionId,
  });

  try {
    const response = await nango.proxy<T>({
      method,
      endpoint: path,
      data: body,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
    return response.data;
  } catch (error) {
    throw createHubSpotError(error, `hubspot.${method.toLowerCase()}`, method, path);
  }
}

export async function hubspotRequest<T = unknown>(
  workspaceId: string,
  method: HTTP_METHOD,
  path: string,
  body?: unknown,
): Promise<T> {
  const connection = await getHubSpotConnection(workspaceId);
  if (!connection) {
    throw new HubSpotExecutionError("HubSpot is not connected for this workspace.", {
      step: "hubspot.connection",
      method,
      path,
      status: 409,
      statusText: "Missing HubSpot connection",
      responseBody: { error: "hubspot_not_connected" },
    });
  }
  return hubspotRequestWithConnection<T>(connection, method, path, body);
}

export async function findContactByEmail(workspaceId: string, email: string): Promise<HubSpotObjectResult | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const data = await hubspotRequest<HubSpotSearchResult>(workspaceId, "POST", "/crm/v3/objects/contacts/search", {
    filterGroups: [{
      filters: [{ propertyName: "email", operator: "EQ", value: normalizedEmail }],
    }],
    properties: ["email", "firstname", "lastname", "company"],
    limit: 1,
  });
  return data.results?.[0] ?? null;
}

async function writeHubSpotObject(input: {
  workspaceId: string;
  objectType: "contacts" | "deals";
  existingId?: string | null;
  baseProperties: Record<string, string>;
  enhancedProperties: Record<string, string>;
  hasCustomProperties: boolean;
}) {
  const path = input.existingId
    ? `/crm/v3/objects/${input.objectType}/${input.existingId}`
    : `/crm/v3/objects/${input.objectType}`;
  const method: HTTP_METHOD = input.existingId ? "PATCH" : "POST";
  try {
    const result = await hubspotRequest<HubSpotObjectResult>(input.workspaceId, method, path, { properties: input.enhancedProperties });
    return {
      result,
      attributionWriteStatus: input.hasCustomProperties ? "custom_properties_written" as const : "standard_only" as const,
    };
  } catch (error) {
    const fallback = await hubspotRequest<HubSpotObjectResult>(input.workspaceId, method, path, { properties: input.baseProperties });
    return {
      result: fallback,
      attributionWriteStatus: "custom_properties_missing" as const,
      attributionError: error instanceof HubSpotExecutionError ? error.details : error instanceof Error ? error.message : "HubSpot attribution properties were rejected.",
    };
  }
}

export async function createOrUpdateContact(workspaceId: string, input: HubSpotContactInput): Promise<Record<string, unknown>> {
  const existing = await findContactByEmail(workspaceId, input.email);
  const baseProperties = buildContactProperties(input);
  const customProperties = input.propertyReadiness?.status === "property_check_failed"
    ? {}
    : filterProperties(buildCustomAttribution(input.attribution), input.propertyReadiness?.contactExistingProperties ?? []);
  const enhancedProperties = {
    ...baseProperties,
    ...buildStandardContactAttribution(),
    ...customProperties,
  };
  const write = await writeHubSpotObject({
    workspaceId,
    objectType: "contacts",
    existingId: existing?.id,
    baseProperties,
    enhancedProperties,
    hasCustomProperties: Object.keys(customProperties).length > 0,
  });
  return {
    status: existing?.id ? "updated" : "created",
    id: write.result.id ?? existing?.id ?? null,
    properties: write.result.properties ?? baseProperties,
    attributionWriteStatus: write.attributionWriteStatus,
    attributionError: write.attributionError,
  };
}

async function findMatchingOpenDeal(workspaceId: string, input: {
  dealname: string;
  sourceSubject?: string | null;
  propertyReadiness?: HubSpotPropertyReadiness | null;
}): Promise<HubSpotObjectResult | null> {
  const filters: Record<string, string>[] = [{ propertyName: "dealname", operator: "EQ", value: input.dealname }];
  const canFilterBySubject = Boolean(
    input.sourceSubject
    && input.propertyReadiness?.dealExistingProperties?.includes("inovense_original_subject")
  );
  if (canFilterBySubject && input.sourceSubject) {
    filters.push({ propertyName: "inovense_original_subject", operator: "EQ", value: input.sourceSubject });
  }
  const data = await hubspotRequest<HubSpotSearchResult>(workspaceId, "POST", "/crm/v3/objects/deals/search", {
    filterGroups: [{
      filters,
    }],
    properties: ["dealname", "amount", "dealstage", "pipeline", "inovense_original_subject"],
    limit: 1,
  });
  return data.results?.[0] ?? null;
}

export async function createOrUpdateDeal(workspaceId: string, input: HubSpotDealInput): Promise<Record<string, unknown>> {
  const baseProperties = buildDealProperties(input);
  const customProperties = input.propertyReadiness?.status === "property_check_failed"
    ? {}
    : filterProperties(buildCustomAttribution(input.attribution), input.propertyReadiness?.dealExistingProperties ?? []);
  const enhancedProperties = {
    ...baseProperties,
    description: buildDealAttributionDescription(input.attribution),
    ...customProperties,
  };
  const existing = await findMatchingOpenDeal(workspaceId, {
    dealname: baseProperties.dealname,
    sourceSubject: input.attribution?.sourceSubject,
    propertyReadiness: input.propertyReadiness,
  });
  const write = await writeHubSpotObject({
    workspaceId,
    objectType: "deals",
    existingId: existing?.id,
    baseProperties,
    enhancedProperties,
    hasCustomProperties: Object.keys(customProperties).length > 0,
  });
  return {
    status: existing?.id ? "updated_existing" : "created",
    id: write.result.id ?? existing?.id ?? null,
    properties: write.result.properties ?? baseProperties,
    attributionWriteStatus: write.attributionWriteStatus,
    attributionError: write.attributionError,
  };
}

/**
 * Real HubSpot note creation, associated to the contact and (when present)
 * the deal. Approval/policy gating happens one layer up: this function is
 * only ever invoked from executeHubSpotRevenueActions, which itself only
 * runs after a human has approved the outbound email and the approve route
 * confirmed preparedHubSpotActions.executionStatus === "execution_enabled".
 * Failures here are non-fatal to the overall approval - they are reported as
 * a "failed" note status rather than throwing, so a note-creation problem
 * never blocks the contact/deal write that already succeeded.
 */
export async function createHubSpotNote(workspaceId: string, input: {
  body?: string | null;
  contactId?: string | null;
  dealId?: string | null;
}): Promise<{ status: "created" | "skipped" | "failed"; id?: string | null; reason?: string; error?: Record<string, unknown> }> {
  const body = cleanString(input.body);
  if (!body) return { status: "skipped", reason: "missing_note_body" };
  if (!input.contactId && !input.dealId) return { status: "skipped", reason: "missing_contact_or_deal_id" };
  try {
    const created = await hubspotRequest<HubSpotObjectResult>(workspaceId, "POST", "/crm/v3/objects/notes", {
      properties: {
        hs_note_body: body,
        hs_timestamp: String(Date.now()),
      },
    });
    const noteId = cleanString(created.id);
    if (noteId) {
      if (input.contactId) {
        await hubspotRequest(workspaceId, "PUT", `/crm/v4/objects/notes/${noteId}/associations/default/contacts/${input.contactId}`).catch(() => null);
      }
      if (input.dealId) {
        await hubspotRequest(workspaceId, "PUT", `/crm/v4/objects/notes/${noteId}/associations/default/deals/${input.dealId}`).catch(() => null);
      }
    }
    return { status: "created", id: noteId };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof HubSpotExecutionError ? error.details : { message: error instanceof Error ? error.message : "HubSpot note creation failed." },
    };
  }
}

/**
 * Real HubSpot follow-up task creation, associated to the contact. Same
 * non-fatal failure contract as createHubSpotNote above.
 */
export async function createHubSpotTask(workspaceId: string, input: {
  title?: string | null;
  body?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  dueAt?: Date | null;
}): Promise<{ status: "created" | "skipped" | "failed"; id?: string | null; reason?: string; error?: Record<string, unknown> }> {
  const title = cleanString(input.title);
  if (!title) return { status: "skipped", reason: "missing_task_title" };
  if (!input.contactId && !input.dealId) return { status: "skipped", reason: "missing_contact_or_deal_id" };
  const dueAt = input.dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
  try {
    const created = await hubspotRequest<HubSpotObjectResult>(workspaceId, "POST", "/crm/v3/objects/tasks", {
      properties: {
        hs_task_subject: title,
        hs_task_body: cleanString(input.body) ?? "",
        hs_task_status: "NOT_STARTED",
        hs_task_type: "TODO",
        hs_timestamp: String(dueAt.getTime()),
      },
    });
    const taskId = cleanString(created.id);
    if (taskId) {
      if (input.contactId) {
        await hubspotRequest(workspaceId, "PUT", `/crm/v4/objects/tasks/${taskId}/associations/default/contacts/${input.contactId}`).catch(() => null);
      }
      if (input.dealId) {
        await hubspotRequest(workspaceId, "PUT", `/crm/v4/objects/tasks/${taskId}/associations/default/deals/${input.dealId}`).catch(() => null);
      }
    }
    return { status: "created", id: taskId };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof HubSpotExecutionError ? error.details : { message: error instanceof Error ? error.message : "HubSpot task creation failed." },
    };
  }
}

export async function associateContactToDeal(workspaceId: string, contactId: string, dealId: string): Promise<Record<string, unknown>> {
  try {
    await hubspotRequest(workspaceId, "PUT", `/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`);
    return { status: "associated", contactId, dealId };
  } catch (error) {
    if (error instanceof HubSpotExecutionError) {
      return { status: "failed", contactId, dealId, error: error.details };
    }
    return { status: "failed", contactId, dealId, error: error instanceof Error ? error.message : "Association failed." };
  }
}

export async function executeHubSpotRevenueActions(workspaceId: string, payload: {
  to?: string;
  subject?: string;
  crmPreparation?: Record<string, unknown> | null;
  preparedHubSpotActions?: PreparedHubSpotActions | null;
}): Promise<HubSpotExecutionResult> {
  const connection = await getHubSpotConnection(workspaceId);
  if (!connection) {
    return { status: "skipped", error: { code: "hubspot_not_connected" } };
  }

  const prepared = payload.preparedHubSpotActions ?? {};
  const crm = payload.crmPreparation ?? {};
  const contactEmail = cleanString(prepared.contact?.email) ?? cleanString(crm.contactEmail) ?? cleanString(payload.to);
  if (!contactEmail) {
    return { status: "skipped", error: { code: "missing_contact_email" } };
  }

  const contactName = cleanString(crm.contactName);
  const split = splitName(contactName);
  const safeContactLabel = [split.firstname, split.lastname].filter(Boolean).join(" ").trim();
  const [propertyReadiness, pipelineMapping] = await Promise.all([
    getHubSpotPropertyReadiness(workspaceId),
    getHubSpotDealPipelineMapping(workspaceId),
  ]);
  const attribution = {
    workspaceId,
    sourceSubject: cleanString(crm.sourceSubject) ?? cleanString(payload.subject),
    classification: cleanString(crm.classification),
    confidence: cleanString(crm.confidence),
    suggestedNextStep: cleanString(crm.suggestedNextStep),
    dedupeKey: cleanString(crm.dedupeKey),
    gmailMessageId: cleanString(crm.gmailMessageId),
    gmailThreadId: cleanString(crm.gmailThreadId),
    contactEmail,
    normalizedSubject: cleanString(crm.normalizedSubject),
    signalSource: cleanString(crm.source),
  };
  const contact = await createOrUpdateContact(workspaceId, {
    email: contactEmail,
    firstname: cleanString(prepared.contact?.firstname) ?? split.firstname ?? null,
    lastname: cleanString(prepared.contact?.lastname) ?? split.lastname ?? null,
    companyName: cleanString(prepared.contact?.companyName) ?? cleanString(crm.companyName),
    source: "gmail",
    attribution,
    propertyReadiness,
  });

  const deal = await createOrUpdateDeal(workspaceId, {
    dealname: safeContactLabel ? `New inbound opportunity: ${safeContactLabel}` : safeDealName(prepared.deal?.dealname, contactEmail),
    contactEmail,
    amount: typeof prepared.deal?.amount === "number" ? prepared.deal.amount : null,
    stageLabel: prepared.deal?.stageLabel ?? cleanString(crm.suggestedDealStage),
    pipelineLabel: prepared.deal?.pipelineLabel ?? "Default",
    pipelineId: pipelineMapping.pipelineId,
    dealstageId: pipelineMapping.dealstageId,
    attribution,
    propertyReadiness,
  });

  const contactId = cleanString(contact.id);
  const dealId = cleanString(deal.id);
  const association = contactId && dealId
    ? await associateContactToDeal(workspaceId, contactId, dealId)
    : { status: "skipped", reason: "missing_contact_or_deal_id", contactId, dealId };

  const noteResult = await createHubSpotNote(workspaceId, {
    body: prepared.note?.body ?? null,
    contactId,
    dealId,
  });
  const taskResult = await createHubSpotTask(workspaceId, {
    title: prepared.task?.title ?? null,
    body: attribution.suggestedNextStep,
    contactId,
    dealId,
  });

  return {
    status: "completed",
    contactId,
    dealId,
    contact,
    deal,
    association,
    propertySetupStatus: propertyReadiness.status,
    missingCustomProperties: {
      contacts: propertyReadiness.missingContactProperties,
      deals: propertyReadiness.missingDealProperties,
    },
    hubspotSetupRecommendation: setupRecommendation(propertyReadiness),
    pipelineId: pipelineMapping.pipelineId,
    pipelineLabel: pipelineMapping.pipelineLabel,
    dealstageId: pipelineMapping.dealstageId,
    dealstageLabel: pipelineMapping.dealstageLabel,
    pipelineSelectionReason: pipelineMapping.pipelineSelectionReason,
    attributionWriteStatus: contact.attributionWriteStatus === "custom_properties_written" || deal.attributionWriteStatus === "custom_properties_written"
      ? "custom_properties_written"
      : propertyReadiness.status === "custom_properties_missing" || propertyReadiness.status === "custom_properties_partial" || contact.attributionWriteStatus === "custom_properties_missing" || deal.attributionWriteStatus === "custom_properties_missing"
        ? "custom_properties_missing"
        : "standard_only",
    note: noteResult,
    task: taskResult,
  };
}
