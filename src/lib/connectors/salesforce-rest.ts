/**
 * Centralized Salesforce REST client. This is the ONLY place in the codebase
 * that is allowed to make a raw fetch() call to Salesforce. Every SOQL query
 * used elsewhere must go through the typed helpers exported here so that (a)
 * every string interpolated into a SOQL WHERE clause is escaped through
 * escapeSoqlString, and (b) the 401/expired-session retry-once behavior is
 * applied uniformly.
 *
 * Read-only. This module never creates, updates, or deletes any Salesforce
 * record - it only issues SELECT queries via the REST Query resource.
 */
import {
  forceRefreshSalesforceAccessToken,
  normalizeSalesforceInstanceUrl,
  resolveSalesforceAccessToken,
  type StoredSalesforceCredential,
} from "@/lib/connectors/salesforce";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

/** Single place the Salesforce REST API version is declared. */
export const SALESFORCE_API_VERSION = "v60.0";

/**
 * Escapes a value for safe interpolation inside a SOQL string literal.
 * Salesforce SOQL has no parameterized-query API over REST, so this is the
 * only safety boundary against SOQL injection for any user-controlled value
 * (e.g. an inbound email address). Per Salesforce's SOQL string literal
 * rules, backslashes and single quotes must be escaped with a backslash.
 * Backslashes MUST be escaped first, otherwise escaping the quote would
 * double-escape the just-inserted backslash.
 */
export function escapeSoqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

type SalesforceErrorEntry = { message?: string; errorCode?: string };

export class SalesforceApiError extends Error {
  status: number;
  errorCode?: string;
  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = "SalesforceApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

async function parseSalesforceErrorBody(response: Response): Promise<SalesforceApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body - fall through with a generic message below.
  }
  // Salesforce returns an ARRAY of {message, errorCode} on failure, not a
  // single object - handle that shape explicitly.
  const entries = Array.isArray(body) ? (body as SalesforceErrorEntry[]) : [];
  const first = entries[0];
  return new SalesforceApiError(
    first?.message || `Salesforce request failed with status ${response.status}`,
    response.status,
    first?.errorCode,
  );
}

function isAuthError(error: SalesforceApiError): boolean {
  return error.status === 401 || error.errorCode === "INVALID_SESSION_ID";
}

async function fetchSalesforce(instanceUrl: string, accessToken: string, path: string): Promise<Response> {
  return fetch(`${instanceUrl}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

/**
 * Issues a single authenticated GET against the Salesforce REST API.
 * instanceUrl is re-validated through normalizeSalesforceInstanceUrl on
 * every call - a stored value is never trusted blindly, even though it was
 * validated once at connect time. Retries exactly once on a 401 or
 * INVALID_SESSION_ID response by forcing a token refresh; a genuine refresh
 * failure surfaces as a SalesforceReconnectionRequiredError from
 * forceRefreshSalesforceAccessToken (which itself marks the credential
 * needs_attention).
 */
export async function salesforceApiRequest<T>(input: {
  workspaceId: string;
  credential: StoredSalesforceCredential;
  path: string;
  supabase?: ReturnType<typeof createSupabaseAdmin>;
}): Promise<T> {
  const rawInstanceUrl = typeof input.credential.metadata?.instanceUrl === "string" ? input.credential.metadata.instanceUrl : "";
  const instanceUrl = normalizeSalesforceInstanceUrl(rawInstanceUrl);
  const supabase = input.supabase ?? createSupabaseAdmin();

  let accessToken = await resolveSalesforceAccessToken({ workspaceId: input.workspaceId, credential: input.credential, supabase });
  let response = await fetchSalesforce(instanceUrl, accessToken, input.path);

  if (!response.ok) {
    const error = await parseSalesforceErrorBody(response);
    if (!isAuthError(error)) throw error;

    accessToken = await forceRefreshSalesforceAccessToken({ workspaceId: input.workspaceId, credential: input.credential, supabase });
    response = await fetchSalesforce(instanceUrl, accessToken, input.path);
    if (!response.ok) throw await parseSalesforceErrorBody(response);
  }

  return (await response.json()) as T;
}

async function soqlQuery<T>(input: {
  workspaceId: string;
  credential: StoredSalesforceCredential;
  soql: string;
  supabase?: ReturnType<typeof createSupabaseAdmin>;
}): Promise<{ records: T[]; totalSize: number }> {
  const path = `/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(input.soql)}`;
  const result = await salesforceApiRequest<{ records?: T[]; totalSize?: number }>({
    workspaceId: input.workspaceId,
    credential: input.credential,
    path,
    supabase: input.supabase,
  });
  return { records: result.records ?? [], totalSize: result.totalSize ?? (result.records ?? []).length };
}

// ── Normalized record shapes (standard Salesforce fields only) ──────────

export type SalesforceOwnerRef = { Name?: string | null } | null;

export type SalesforceContactRecord = {
  Id: string;
  FirstName: string | null;
  LastName: string | null;
  Email: string | null;
  Title: string | null;
  AccountId: string | null;
  OwnerId: string | null;
  Owner?: SalesforceOwnerRef;
};

export type SalesforceLeadRecord = {
  Id: string;
  FirstName: string | null;
  LastName: string | null;
  Email: string | null;
  Title: string | null;
  Company: string | null;
  OwnerId: string | null;
  Status: string | null;
  Owner?: SalesforceOwnerRef;
};

export type SalesforceAccountRecord = {
  Id: string;
  Name: string | null;
  Website: string | null;
  Industry: string | null;
  OwnerId: string | null;
  Owner?: SalesforceOwnerRef;
};

export type SalesforceOpportunityRecord = {
  Id: string;
  Name: string | null;
  StageName: string | null;
  IsClosed: boolean;
  Amount: number | null;
  CloseDate: string | null;
  OwnerId: string | null;
  AccountId: string | null;
  LastModifiedDate: string | null;
  Owner?: SalesforceOwnerRef;
};

// ── Person lookup (Contact first, then Lead) ─────────────────────────────

export type SalesforcePersonMatch = {
  type: "contact" | "lead";
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  ownerId: string | null;
  ownerName: string | null;
  accountId: string | null;
  companyName: string | null;
  leadStatus: string | null;
};

export type SalesforcePersonLookupResult =
  | { status: "matched"; person: SalesforcePersonMatch }
  | { status: "ambiguous"; type: "contact" | "lead"; count: number }
  | { status: "no_match" }
  | { status: "error"; message: string };

function normalizeContact(record: SalesforceContactRecord): SalesforcePersonMatch {
  return {
    type: "contact",
    id: record.Id,
    email: record.Email ?? null,
    firstName: record.FirstName ?? null,
    lastName: record.LastName ?? null,
    title: record.Title ?? null,
    ownerId: record.OwnerId ?? null,
    ownerName: record.Owner?.Name ?? null,
    accountId: record.AccountId ?? null,
    companyName: null,
    leadStatus: null,
  };
}

function normalizeLead(record: SalesforceLeadRecord): SalesforcePersonMatch {
  return {
    type: "lead",
    id: record.Id,
    email: record.Email ?? null,
    firstName: record.FirstName ?? null,
    lastName: record.LastName ?? null,
    title: record.Title ?? null,
    ownerId: record.OwnerId ?? null,
    ownerName: record.Owner?.Name ?? null,
    accountId: null,
    companyName: record.Company ?? null,
    leadStatus: record.Status ?? null,
  };
}

/**
 * Looks up a person by email: Contact first, then Lead if no Contact
 * matches. If more than one record matches the same email, this returns an
 * explicit "ambiguous" result rather than guessing which one is relevant.
 */
export async function findSalesforcePersonByEmail(input: {
  workspaceId: string;
  credential: StoredSalesforceCredential;
  email: string;
  supabase?: ReturnType<typeof createSupabaseAdmin>;
}): Promise<SalesforcePersonLookupResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) return { status: "no_match" };
  const safeEmail = escapeSoqlString(normalizedEmail);

  try {
    const contacts = await soqlQuery<SalesforceContactRecord>({
      workspaceId: input.workspaceId,
      credential: input.credential,
      supabase: input.supabase,
      soql: `SELECT Id, FirstName, LastName, Email, Title, AccountId, OwnerId, Owner.Name FROM Contact WHERE Email = '${safeEmail}' LIMIT 2`,
    });
    if (contacts.records.length > 1) return { status: "ambiguous", type: "contact", count: contacts.records.length };
    if (contacts.records.length === 1) return { status: "matched", person: normalizeContact(contacts.records[0]) };

    const leads = await soqlQuery<SalesforceLeadRecord>({
      workspaceId: input.workspaceId,
      credential: input.credential,
      supabase: input.supabase,
      soql: `SELECT Id, FirstName, LastName, Email, Title, Company, OwnerId, Status, Owner.Name FROM Lead WHERE Email = '${safeEmail}' LIMIT 2`,
    });
    if (leads.records.length > 1) return { status: "ambiguous", type: "lead", count: leads.records.length };
    if (leads.records.length === 1) return { status: "matched", person: normalizeLead(leads.records[0]) };

    return { status: "no_match" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Salesforce person lookup failed." };
  }
}

// ── Account (company) lookup ─────────────────────────────────────────────

export type SalesforceAccountMatch = {
  id: string;
  name: string | null;
  website: string | null;
  industry: string | null;
  ownerId: string | null;
  ownerName: string | null;
};

export type SalesforceAccountLookupResult =
  | { status: "matched"; account: SalesforceAccountMatch }
  | { status: "no_match" }
  | { status: "error"; message: string };

/** For a Contact's non-null AccountId. Leads have no Account relationship. */
export async function getSalesforceAccountById(input: {
  workspaceId: string;
  credential: StoredSalesforceCredential;
  accountId: string;
  supabase?: ReturnType<typeof createSupabaseAdmin>;
}): Promise<SalesforceAccountLookupResult> {
  try {
    const safeId = escapeSoqlString(input.accountId);
    const result = await soqlQuery<SalesforceAccountRecord>({
      workspaceId: input.workspaceId,
      credential: input.credential,
      supabase: input.supabase,
      soql: `SELECT Id, Name, Website, Industry, OwnerId, Owner.Name FROM Account WHERE Id = '${safeId}' LIMIT 1`,
    });
    const record = result.records[0];
    if (!record) return { status: "no_match" };
    return {
      status: "matched",
      account: {
        id: record.Id,
        name: record.Name ?? null,
        website: record.Website ?? null,
        industry: record.Industry ?? null,
        ownerId: record.OwnerId ?? null,
        ownerName: record.Owner?.Name ?? null,
      },
    };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Salesforce account lookup failed." };
  }
}

// ── Opportunity lookup ────────────────────────────────────────────────────

export type SalesforceOpportunityMatch = {
  id: string;
  name: string | null;
  stage: string | null;
  isClosed: boolean;
  amount: number | null;
  closeDate: string | null;
  ownerId: string | null;
  ownerName: string | null;
  accountId: string | null;
};

export type SalesforceOpenOpportunitiesResult =
  | { status: "matched"; opportunities: SalesforceOpportunityMatch[] }
  | { status: "no_match" }
  | { status: "error"; message: string };

function normalizeOpportunity(record: SalesforceOpportunityRecord): SalesforceOpportunityMatch {
  return {
    id: record.Id,
    name: record.Name ?? null,
    stage: record.StageName ?? null,
    isClosed: Boolean(record.IsClosed),
    amount: typeof record.Amount === "number" ? record.Amount : null,
    closeDate: record.CloseDate ?? null,
    ownerId: record.OwnerId ?? null,
    ownerName: record.Owner?.Name ?? null,
    accountId: record.AccountId ?? null,
  };
}

/**
 * Returns open (IsClosed = false) Opportunities for an Account, most
 * recently modified first. ORDER BY LastModifiedDate DESC is the
 * deterministic tie-break rule: the most recently touched open opportunity
 * is the one most likely to reflect the active deal context a rep cares
 * about right now, and it is stable (never a random/first-returned pick).
 * LIMIT 5 keeps the read small; callers that only want "the" active
 * opportunity should take index 0 of the returned list.
 */
export async function getOpenSalesforceOpportunitiesForAccount(input: {
  workspaceId: string;
  credential: StoredSalesforceCredential;
  accountId: string;
  supabase?: ReturnType<typeof createSupabaseAdmin>;
}): Promise<SalesforceOpenOpportunitiesResult> {
  try {
    const safeId = escapeSoqlString(input.accountId);
    const result = await soqlQuery<SalesforceOpportunityRecord>({
      workspaceId: input.workspaceId,
      credential: input.credential,
      supabase: input.supabase,
      soql: `SELECT Id, Name, StageName, IsClosed, Amount, CloseDate, OwnerId, AccountId, LastModifiedDate, Owner.Name FROM Opportunity WHERE AccountId = '${safeId}' AND IsClosed = false ORDER BY LastModifiedDate DESC LIMIT 5`,
    });
    if (result.records.length === 0) return { status: "no_match" };
    return { status: "matched", opportunities: result.records.map(normalizeOpportunity) };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Salesforce opportunity lookup failed." };
  }
}
