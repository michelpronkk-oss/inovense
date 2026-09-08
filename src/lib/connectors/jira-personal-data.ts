import "server-only";

import { fetchJiraIdentity, resolveJiraAccessToken, type StoredJiraCredential } from "@/lib/connectors/jira";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

export const JIRA_PERSONAL_DATA_REPORTING_URL = "https://api.atlassian.com/app/report-accounts/";
export const JIRA_REPORT_BATCH_LIMIT = 90;
export const JIRA_REPORT_DEFAULT_CYCLE_MS = 7 * 24 * 60 * 60 * 1000;

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export type PersistedJiraAccount = {
  workspaceId: string;
  accountId: string;
  dataUpdatedAt: string;
};

type CredentialRow = StoredJiraCredential & { created_at?: string | null; updated_at?: string | null };
function validAccountId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9:-]{1,128}$/.test(value) && value !== "unknown";
}

export function dedupePersistedJiraAccounts(rows: Array<{ workspaceId: string; accountId?: string | null; dataUpdatedAt?: string | null }>): PersistedJiraAccount[] {
  const result = new Map<string, PersistedJiraAccount>();
  for (const row of rows) {
    if (!validAccountId(row.accountId) || !row.workspaceId) continue;
    const key = `${row.workspaceId}:${row.accountId}`;
    const current = result.get(key);
    const candidate = { workspaceId: row.workspaceId, accountId: row.accountId, dataUpdatedAt: row.dataUpdatedAt || new Date(0).toISOString() };
    if (!current || new Date(candidate.dataUpdatedAt).getTime() < new Date(current.dataUpdatedAt).getTime()) result.set(key, candidate);
  }
  return [...result.values()];
}

export function batchJiraReportAccounts(accounts: PersistedJiraAccount[], limit = JIRA_REPORT_BATCH_LIMIT): PersistedJiraAccount[][] {
  const bounded = Math.max(1, Math.min(limit, JIRA_REPORT_BATCH_LIMIT));
  const batches: PersistedJiraAccount[][] = [];
  for (let index = 0; index < accounts.length; index += bounded) batches.push(accounts.slice(index, index + bounded));
  return batches;
}

export function cyclePeriodMs(value: string | null | undefined): number {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : JIRA_REPORT_DEFAULT_CYCLE_MS;
}

export function jiraReportBody(accounts: PersistedJiraAccount[]): { accounts: Array<{ accountId: string; updatedAt: string }> } {
  return { accounts: accounts.map((account) => ({ accountId: account.accountId, updatedAt: account.dataUpdatedAt })) };
}

export function parseJiraReportResponse(status: number, text: string): Array<{ accountId: string; status: "closed" | "updated" }> {
  if (status === 204 || !text) return [];
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { return []; }
  if (!body || typeof body !== "object" || !Array.isArray((body as { accounts?: unknown }).accounts)) return [];
  return (body as { accounts: unknown[] }).accounts.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const accountId = (entry as { accountId?: unknown }).accountId;
    const statusValue = (entry as { status?: unknown }).status;
    return validAccountId(accountId) && (statusValue === "closed" || statusValue === "updated") ? [{ accountId, status: statusValue }] : [];
  });
}

async function discoverCredentialRows(supabase: SupabaseAdmin, workspaceId?: string): Promise<CredentialRow[]> {
  let query = supabase.from("os_connector_credentials")
    .select("workspace_id,connector_key,provider_account_id,provider_email,encrypted_access_token,encrypted_refresh_token,token_expires_at,scopes,status,metadata,created_at,updated_at")
    .eq("connector_key", "jira")
    .not("provider_account_id", "is", null);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const result = await query.limit(5000);
  if (result.error) throw new Error(`Could not discover Jira personal data: ${result.error.message}`);
  return (Array.isArray(result.data) ? result.data : []) as CredentialRow[];
}

/** Discover the exact accountIds currently retained by Jira credentials. */
export async function discoverPersistedJiraAccounts(input: { workspaceId?: string; supabase?: SupabaseAdmin } = {}): Promise<PersistedJiraAccount[]> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const rows = await discoverCredentialRows(supabase, input.workspaceId);
  return dedupePersistedJiraAccounts(rows.map((row) => ({ workspaceId: row.workspace_id, accountId: row.provider_account_id, dataUpdatedAt: row.created_at || row.updated_at || new Date().toISOString() })));
}

async function ensureLedgerRows(supabase: SupabaseAdmin, accounts: PersistedJiraAccount[]): Promise<void> {
  if (!accounts.length) return;
  const existing = await supabase.from("os_jira_personal_data_reports").select("workspace_id,account_id,data_updated_at,next_report_at,status").in("workspace_id", [...new Set(accounts.map((account) => account.workspaceId))]).limit(5000);
  if (existing.error) throw new Error(`Could not read Jira reporting state: ${existing.error.message}`);
  const known = new Set((Array.isArray(existing.data) ? existing.data : []).map((row) => `${row.workspace_id}:${row.account_id}`));
  const missing = accounts.filter((account) => !known.has(`${account.workspaceId}:${account.accountId}`));
  if (!missing.length) return;
  const insert = await supabase.from("os_jira_personal_data_reports").insert(missing.map((account) => ({ workspace_id: account.workspaceId, account_id: account.accountId, data_updated_at: account.dataUpdatedAt, status: "active" })));
  if (insert.error && !/duplicate|unique/i.test(insert.error.message)) throw new Error(`Could not initialize Jira reporting state: ${insert.error.message}`);
}

async function reportBatch(token: string, accounts: PersistedJiraAccount[]): Promise<{ status: number; cycleMs: number; actions: Array<{ accountId: string; status: string }> }> {
  const response = await fetch(JIRA_PERSONAL_DATA_REPORTING_URL, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(jiraReportBody(accounts)),
    cache: "no-store",
  });
  const cycleMs = cyclePeriodMs(response.headers.get("cycle-period"));
  if (response.status === 204) return { status: 204, cycleMs, actions: [] };
  const text = await response.text();
  if (response.status < 200 || response.status >= 300) {
    // Never persist or log Atlassian's response body: it can contain personal
    // data or provider diagnostics. The HTTP status is sufficient for retry.
    throw Object.assign(new Error(`Jira personal-data reporting failed (${response.status}).`), { status: response.status, retryAfterMs: Number(response.headers.get("retry-after")) * 1000 || 0 });
  }
  return { status: response.status, cycleMs, actions: parseJiraReportResponse(response.status, text) };
}

async function updateLedger(supabase: SupabaseAdmin, account: PersistedJiraAccount, patch: Record<string, unknown>): Promise<void> {
  const result = await supabase.from("os_jira_personal_data_reports").update(patch).eq("workspace_id", account.workspaceId).eq("account_id", account.accountId);
  if (result.error) throw new Error(`Could not update Jira reporting state: ${result.error.message}`);
}

/**
 * Report all due Jira accountIds, in tenant-scoped batches of at most 90.
 * Trigger payloads contain no credentials; tokens are decrypted only while a
 * workspace's request is in flight.
 */
export async function reportPersistedJiraPersonalData(input: { now?: Date; supabase?: SupabaseAdmin } = {}): Promise<{ discovered: number; reported: number; erased: number; refreshed: number; deferred: number; failed: number }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const now = input.now ?? new Date();
  const credentials = await discoverCredentialRows(supabase);
  const accounts = dedupePersistedJiraAccounts(credentials.map((row) => ({ workspaceId: row.workspace_id, accountId: row.provider_account_id, dataUpdatedAt: row.created_at || row.updated_at || now.toISOString() })));
  await ensureLedgerRows(supabase, accounts);
  if (!accounts.length) return { discovered: 0, reported: 0, erased: 0, refreshed: 0, deferred: 0, failed: 0 };
  const stateResult = await supabase.from("os_jira_personal_data_reports").select("workspace_id,account_id,data_updated_at,next_report_at,status").in("workspace_id", [...new Set(accounts.map((account) => account.workspaceId))]).limit(5000);
  if (stateResult.error) throw new Error(`Could not load Jira reporting state: ${stateResult.error.message}`);
  const state = (Array.isArray(stateResult.data) ? stateResult.data : []) as Array<{ workspace_id: string; account_id: string; data_updated_at: string; next_report_at?: string | null; status?: string | null }>;
  const activeKeys = new Set(accounts.map((account) => `${account.workspaceId}:${account.accountId}`));
  // A disconnect or an erasure can remove the credential before the next
  // scheduled pass. Do not leave its accountId in the reporting ledger.
  await Promise.all(state.filter((row) => !activeKeys.has(`${row.workspace_id}:${row.account_id}`)).map((row) => supabase.from("os_jira_personal_data_reports").delete().eq("workspace_id", row.workspace_id).eq("account_id", row.account_id)));
  const due = state.filter((row) => activeKeys.has(`${row.workspace_id}:${row.account_id}`) && row.status !== "erased" && (!row.next_report_at || new Date(row.next_report_at).getTime() <= now.getTime())).map((row) => ({ workspaceId: row.workspace_id, accountId: row.account_id, dataUpdatedAt: row.data_updated_at }));
  const credentialByWorkspace = new Map(credentials.map((row) => [row.workspace_id, row]));
  let reported = 0; let erased = 0; let refreshed = 0; const deferred = accounts.length - due.length; let failed = 0;
  for (const [workspaceId, workspaceAccounts] of new Map([...due.reduce((map, account) => { const list = map.get(account.workspaceId) ?? []; list.push(account); map.set(account.workspaceId, list); return map; }, new Map<string, PersistedJiraAccount[]>())])) {
    const credential = credentialByWorkspace.get(workspaceId);
    if (!credential) continue;
    let token: string;
    try { token = await resolveJiraAccessToken({ workspaceId, credential, supabase }); }
    catch { failed += workspaceAccounts.length; continue; }
    for (const batch of batchJiraReportAccounts(workspaceAccounts)) {
      try {
        const result = await reportBatch(token, batch);
        const next = new Date(now.getTime() + result.cycleMs).toISOString();
        for (const account of batch) {
          await updateLedger(supabase, account, { last_reported_at: now.toISOString(), next_report_at: next, last_response_status: String(result.status), last_error_code: null });
        }
        reported += batch.length;
        for (const action of result.actions) {
          const account = batch.find((item) => item.accountId === action.accountId);
          if (!account) continue;
          if (action.status === "closed") {
            await supabase.from("os_connector_credentials").update({ provider_account_id: null, provider_email: null }).eq("workspace_id", workspaceId).eq("connector_key", "jira").eq("provider_account_id", account.accountId);
            await updateLedger(supabase, account, { status: "erased", next_report_at: null, last_response_status: "closed" });
            erased += 1;
          } else if (action.status === "updated") {
            try {
              const identity = await fetchJiraIdentity(token);
              if (validAccountId(identity.accountId) && identity.accountId !== account.accountId) {
                await supabase.from("os_connector_credentials").update({ provider_account_id: identity.accountId, provider_email: null }).eq("workspace_id", workspaceId).eq("connector_key", "jira").eq("provider_account_id", account.accountId);
                await supabase.from("os_jira_personal_data_reports").delete().eq("workspace_id", workspaceId).eq("account_id", account.accountId);
                await supabase.from("os_jira_personal_data_reports").insert({ workspace_id: workspaceId, account_id: identity.accountId, data_updated_at: now.toISOString(), status: "active", next_report_at: next });
              } else {
                await updateLedger(supabase, account, { status: "active", data_updated_at: now.toISOString() });
              }
              refreshed += 1;
            } catch { failed += 1; }
          }
        }
      } catch (error) {
        failed += batch.length;
        const retryMs = Number((error as { retryAfterMs?: number }).retryAfterMs) || 0;
        const next = new Date(now.getTime() + Math.max(retryMs, 60 * 60 * 1000)).toISOString();
        for (const account of batch) await updateLedger(supabase, account, { next_report_at: next, last_error_code: `http_${Number((error as { status?: number }).status) || "unknown"}` });
      }
    }
  }
  return { discovered: accounts.length, reported, erased, refreshed, deferred, failed };
}
