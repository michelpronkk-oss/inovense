import { Nango, type HTTP_METHOD } from "@nangohq/node";
import { HUBSPOT_PROVIDER_CONFIG_KEY } from "@/lib/integrations/nango";
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
};

export type HubSpotDealInput = {
  dealname: string;
  amount?: number | null;
  stageLabel?: string | null;
  pipelineLabel?: string | null;
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
  note?: { status: "prepared_not_enabled"; reason: string };
  task?: { status: "prepared_not_enabled"; reason: string };
  error?: Record<string, unknown>;
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
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstname: parts[0] };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

function buildContactProperties(input: HubSpotContactInput): Record<string, string> {
  const fromName = splitName(input.firstname && input.lastname ? `${input.firstname} ${input.lastname}` : input.firstname || input.lastname || null);
  const properties: Record<string, string> = { email: input.email.trim().toLowerCase() };
  const firstname = cleanString(input.firstname) ?? fromName.firstname;
  const lastname = cleanString(input.lastname) ?? fromName.lastname;
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
  if (typeof input.amount === "number" && Number.isFinite(input.amount)) {
    properties.amount = String(input.amount);
  }
  return properties;
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

export async function createOrUpdateContact(workspaceId: string, input: HubSpotContactInput): Promise<Record<string, unknown>> {
  const existing = await findContactByEmail(workspaceId, input.email);
  const properties = buildContactProperties(input);
  if (existing?.id) {
    const updated = await hubspotRequest<HubSpotObjectResult>(workspaceId, "PATCH", `/crm/v3/objects/contacts/${existing.id}`, { properties });
    return { status: "updated", id: updated.id ?? existing.id, properties: updated.properties ?? properties };
  }
  const created = await hubspotRequest<HubSpotObjectResult>(workspaceId, "POST", "/crm/v3/objects/contacts", { properties });
  return { status: "created", id: created.id ?? null, properties: created.properties ?? properties };
}

async function findDealByName(workspaceId: string, dealname: string): Promise<HubSpotObjectResult | null> {
  const data = await hubspotRequest<HubSpotSearchResult>(workspaceId, "POST", "/crm/v3/objects/deals/search", {
    filterGroups: [{
      filters: [{ propertyName: "dealname", operator: "EQ", value: dealname }],
    }],
    properties: ["dealname", "amount", "dealstage", "pipeline"],
    limit: 1,
  });
  return data.results?.[0] ?? null;
}

export async function createOrUpdateDeal(workspaceId: string, input: HubSpotDealInput): Promise<Record<string, unknown>> {
  const properties = buildDealProperties(input);
  const existing = await findDealByName(workspaceId, properties.dealname);
  if (existing?.id) {
    const updated = await hubspotRequest<HubSpotObjectResult>(workspaceId, "PATCH", `/crm/v3/objects/deals/${existing.id}`, { properties });
    return { status: "updated", id: updated.id ?? existing.id, properties: updated.properties ?? properties };
  }
  const created = await hubspotRequest<HubSpotObjectResult>(workspaceId, "POST", "/crm/v3/objects/deals", { properties });
  return { status: "created", id: created.id ?? null, properties: created.properties ?? properties };
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
  const contact = await createOrUpdateContact(workspaceId, {
    email: contactEmail,
    firstname: cleanString(prepared.contact?.firstname) ?? split.firstname ?? null,
    lastname: cleanString(prepared.contact?.lastname) ?? split.lastname ?? null,
    companyName: cleanString(prepared.contact?.companyName) ?? cleanString(crm.companyName),
    source: "gmail",
  });

  const deal = await createOrUpdateDeal(workspaceId, {
    dealname: safeDealName(prepared.deal?.dealname, contactEmail),
    amount: typeof prepared.deal?.amount === "number" ? prepared.deal.amount : null,
    stageLabel: prepared.deal?.stageLabel ?? cleanString(crm.suggestedDealStage),
    pipelineLabel: prepared.deal?.pipelineLabel ?? "Default",
  });

  const contactId = cleanString(contact.id);
  const dealId = cleanString(deal.id);
  const association = contactId && dealId
    ? await associateContactToDeal(workspaceId, contactId, dealId)
    : { status: "skipped", reason: "missing_contact_or_deal_id", contactId, dealId };

  return {
    status: "completed",
    contactId,
    dealId,
    contact,
    deal,
    association,
    note: { status: "prepared_not_enabled", reason: "HubSpot note execution is intentionally not enabled in v1.6." },
    task: { status: "prepared_not_enabled", reason: "HubSpot task execution is intentionally not enabled in v1.6." },
  };
}
