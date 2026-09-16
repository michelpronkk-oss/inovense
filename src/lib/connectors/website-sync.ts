import "server-only";

import dns from "node:dns/promises";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { appendMemoryVersion } from "@/lib/memory/materialize";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";

import { WEBSITE_LIMITS, cadenceMs, nextWebsiteSyncAt, type WebsiteSyncCadence } from "./website-limits";
import { safeWebsiteFetch, WebsiteFetchError } from "./website-fetch";
import { extractWebsitePage, observationsFromWebsitePage } from "./website-extraction";
import { isWebsitePathAllowed, parseRobotsTxt, serializeRobotsRules, type RobotsPolicy } from "./website-robots";
import { acceptSitemapUrls, parseSitemapXml } from "./website-sitemap";
import { canonicalizeWebsiteUrl, normalizePathRule, normalizeWebsiteOrigin, websitePathOf, websiteUrlAllowed, type NormalizedWebsiteOrigin } from "./website-url";
import type { WebsiteHealthStatus, WebsiteObservationReviewStatus, WebsiteSourceSummary, WebsiteVerificationMethod } from "./website-types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

type WebsiteSourceRow = {
  id: string;
  workspace_id: string;
  canonical_origin: string;
  hostname: string;
  allowed_subdomains: unknown;
  sync_enabled: boolean;
  cadence: WebsiteSyncCadence;
  include_paths: unknown;
  exclude_paths: unknown;
  max_pages: number;
  verification_status: "pending" | "verified" | "failed" | "expired";
  verification_method: WebsiteVerificationMethod | null;
  verified_at: string | null;
  verification_expires_at: string | null;
  robots_status: "unknown" | "allowed" | "blocked" | "unavailable" | "error";
  robots_rules: unknown;
  robots_sitemaps: unknown;
  robots_fetched_at: string | null;
  robots_expires_at: string | null;
  health_status: WebsiteHealthStatus;
  last_run_id: string | null;
  last_successful_sync_at: string | null;
  next_sync_at: string | null;
  pages_discovered: number;
  pages_checked: number;
  pages_changed: number;
  pages_skipped: number;
  pages_failed: number;
  observations_pending: number;
  conflicts_pending: number;
  disconnected_at: string | null;
  retain_observations_on_disconnect: boolean;
  created_at: string;
  updated_at: string;
};

type WebsitePageRow = {
  id: string;
  workspace_id: string;
  source_id: string;
  fetched_url: string;
  canonical_url: string;
  status: string;
  robots_status: string;
  noindex: boolean;
  noarchive: boolean;
  title: string | null;
  meta_description: string | null;
  language: string | null;
  canonical_tag: string | null;
  etag: string | null;
  last_modified: string | null;
  last_checked_at: string | null;
  last_successful_fetch_at: string | null;
  last_http_status: number | null;
  consecutive_failure_count: number;
  next_eligible_at: string | null;
  content_hash: string | null;
  extraction_version: string | null;
  normalized_text: string | null;
  removed_at: string | null;
  tombstone_count: number;
};

type WebsiteObservationRow = {
  id: string;
  page_id: string;
  observation_key: string;
  observation_value: string;
  observation_value_hash: string;
  conflict_status: "none" | "conflict" | "resolved";
  review_status: WebsiteObservationReviewStatus;
  freshness_status: "fresh" | "stale" | "withdrawn" | "unsupported";
  memory_entry_id: string | null;
};

function stringArray(value: unknown, max: number): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, max) : [];
}

function safeCode(error: unknown): string {
  const raw = error instanceof WebsiteFetchError ? error.code : error instanceof Error ? error.message : "website_sync_failed";
  return raw.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").slice(0, 80) || "website_sync_failed";
}

function boundedError(error: unknown): string {
  return safeCode(error);
}

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function verificationSecret(): string {
  const secret = process.env.WEBSITE_SYNC_VERIFICATION_SECRET?.trim() || process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error("Website verification is not configured.");
  return secret;
}

function verificationHash(token: string): Buffer {
  return createHash("sha256").update(`${verificationSecret()}|${token}`, "utf8").digest();
}

function sameSecret(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function sourceOrigin(source: WebsiteSourceRow): NormalizedWebsiteOrigin {
  return normalizeWebsiteOrigin(source.canonical_origin, { allowedSubdomains: stringArray(source.allowed_subdomains, 10) });
}

function sourceAllowedSubdomains(source: WebsiteSourceRow): string[] {
  return stringArray(source.allowed_subdomains, 10);
}

function sourceIncludePaths(source: WebsiteSourceRow): string[] {
  return stringArray(source.include_paths, 20);
}

function sourceExcludePaths(source: WebsiteSourceRow): string[] {
  return stringArray(source.exclude_paths, 40);
}

function sourceUrlAllowed(source: WebsiteSourceRow, url: string): boolean {
  const origin = sourceOrigin(source);
  return websiteUrlAllowed({ url, origin, allowedSubdomains: sourceAllowedSubdomains(source), includePaths: sourceIncludePaths(source), excludePaths: sourceExcludePaths(source) });
}

function sourceSummary(source: WebsiteSourceRow): WebsiteSourceSummary {
  return {
    id: source.id,
    workspaceId: source.workspace_id,
    canonicalOrigin: source.canonical_origin,
    hostname: source.hostname,
    allowedSubdomains: sourceAllowedSubdomains(source),
    syncEnabled: source.sync_enabled,
    cadence: source.cadence,
    includePaths: sourceIncludePaths(source),
    excludePaths: sourceExcludePaths(source),
    maxPages: source.max_pages,
    verificationStatus: source.verification_status,
    verificationMethod: source.verification_method,
    verifiedAt: source.verified_at,
    verificationExpiresAt: source.verification_expires_at,
    robotsStatus: source.robots_status,
    healthStatus: source.health_status,
    lastSuccessfulSyncAt: source.last_successful_sync_at,
    nextSyncAt: source.next_sync_at,
    pagesDiscovered: source.pages_discovered,
    pagesChecked: source.pages_checked,
    pagesChanged: source.pages_changed,
    pagesSkipped: source.pages_skipped,
    pagesFailed: source.pages_failed,
    observationsPending: source.observations_pending,
    conflictsPending: source.conflicts_pending,
    lastRunId: source.last_run_id,
    disconnectedAt: source.disconnected_at,
    updatedAt: source.updated_at,
  };
}

export async function getWebsiteSource(input: { workspaceId: string; sourceId?: string; supabase?: SupabaseAdmin }): Promise<WebsiteSourceRow | null> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  let query = supabase.from("os_website_sources").select("*").eq("workspace_id", input.workspaceId).is("disconnected_at", null);
  if (input.sourceId) query = query.eq("id", input.sourceId);
  const result = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new Error("Website sync storage is unavailable.");
  return result.data as WebsiteSourceRow | null;
}

export async function getWebsiteSummary(input: { workspaceId: string; supabase?: SupabaseAdmin }): Promise<{ source: WebsiteSourceSummary | null; pendingObservations: number; conflicts: number; staleObservations: number; latestRun: Record<string, unknown> | null; errorCode?: string }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  try {
    const source = await getWebsiteSource({ ...input, supabase });
    if (!source) return { source: null, pendingObservations: 0, conflicts: 0, staleObservations: 0, latestRun: null };
    const [pending, conflicts, stale, latestRun] = await Promise.all([
      supabase.from("os_website_observations").select("id", { count: "exact", head: true }).eq("workspace_id", input.workspaceId).eq("source_id", source.id).eq("review_status", "pending"),
      supabase.from("os_website_observations").select("id", { count: "exact", head: true }).eq("workspace_id", input.workspaceId).eq("source_id", source.id).eq("conflict_status", "conflict").eq("review_status", "pending"),
      supabase.from("os_website_observations").select("id", { count: "exact", head: true }).eq("workspace_id", input.workspaceId).eq("source_id", source.id).in("freshness_status", ["stale", "withdrawn", "unsupported"]),
      supabase.from("os_website_crawl_runs").select("id,state,trigger_type,created_at,completed_at,discovered_count,checked_count,changed_count,skipped_count,failed_count,observation_count,conflict_count,error_code").eq("workspace_id", input.workspaceId).eq("source_id", source.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      source: { ...sourceSummary(source), observationsPending: pending.count ?? source.observations_pending, conflictsPending: conflicts.count ?? source.conflicts_pending },
      pendingObservations: pending.count ?? 0,
      conflicts: conflicts.count ?? 0,
      staleObservations: stale.count ?? 0,
      latestRun: latestRun.data as Record<string, unknown> | null,
      ...(latestRun.error ? { errorCode: "latest_run_unavailable" } : {}),
    };
  } catch {
    return { source: null, pendingObservations: 0, conflicts: 0, staleObservations: 0, latestRun: null, errorCode: "website_sync_storage_unavailable" };
  }
}

export async function configureWebsiteSource(input: {
  workspaceId: string;
  origin: string;
  allowedSubdomains?: string[];
  syncEnabled?: boolean;
  cadence?: WebsiteSyncCadence;
  includePaths?: string[];
  excludePaths?: string[];
  maxPages?: number;
  supabase?: SupabaseAdmin;
}): Promise<WebsiteSourceSummary> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const normalized = normalizeWebsiteOrigin(input.origin);
  const allowedSubdomains = Array.from(new Set((input.allowedSubdomains ?? []).slice(0, 10).map((value) => normalizeWebsiteOrigin(`https://${value.trim()}`).hostname).filter((value) => value !== normalized.hostname && value.endsWith(`.${normalized.hostname}`))));
  if ((input.allowedSubdomains ?? []).length !== allowedSubdomains.length) throw new Error("Allowed subdomains must be valid hosts beneath the configured website.");
  const includePaths = Array.from(new Set((input.includePaths ?? []).map(normalizePathRule).filter((value): value is string => Boolean(value)))).slice(0, 20);
  const excludePaths = Array.from(new Set((input.excludePaths ?? []).map(normalizePathRule).filter((value): value is string => Boolean(value)))).slice(0, 40);
  if (input.includePaths?.some((value) => !normalizePathRule(value)) || input.excludePaths?.some((value) => !normalizePathRule(value))) throw new Error("Path rules must begin with / and cannot contain dot segments.");
  const maxPages = Math.min(Math.max(Math.floor(input.maxPages ?? WEBSITE_LIMITS.defaultMaxPages), 1), WEBSITE_LIMITS.maxPagesPerRun);
  const cadence: WebsiteSyncCadence = input.cadence === "manual" || input.cadence === "daily" || input.cadence === "monthly" ? input.cadence : "weekly";
  const existing = await getWebsiteSource({ workspaceId: input.workspaceId, supabase });
  const changedOrigin = Boolean(existing && existing.canonical_origin !== normalized.origin);
  const payload = {
    workspace_id: input.workspaceId,
    canonical_origin: normalized.origin,
    hostname: normalized.hostname,
    allowed_subdomains: allowedSubdomains,
    sync_enabled: input.syncEnabled === true,
    cadence,
    include_paths: includePaths,
    exclude_paths: excludePaths,
    max_pages: maxPages,
    ...(changedOrigin ? { verification_status: "pending", verification_method: null, verified_at: null, verification_expires_at: null, robots_status: "unknown", health_status: "verification_pending", next_sync_at: null } : {}),
    ...(existing ? {} : { health_status: "verification_pending" }),
    disconnected_at: null,
  };
  const saved = await supabase.from("os_website_sources").upsert(payload, { onConflict: "workspace_id,canonical_origin" }).select("*").single();
  if (saved.error || !saved.data) throw new Error("Website configuration could not be saved.");
  return sourceSummary(saved.data as WebsiteSourceRow);
}

export async function issueWebsiteVerificationChallenge(input: { workspaceId: string; sourceId: string; method: WebsiteVerificationMethod; supabase?: SupabaseAdmin }): Promise<{ challengeId: string; method: WebsiteVerificationMethod; token: string; dnsRecord: string; htmlMeta: string; htmlFilePath: string; expiresAt: string }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const source = await getWebsiteSource({ workspaceId: input.workspaceId, sourceId: input.sourceId, supabase });
  if (!source) throw new Error("Website source not found.");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + WEBSITE_LIMITS.verificationTtlMs).toISOString();
  await supabase.from("os_website_verification_challenges").update({ status: "superseded" }).eq("source_id", source.id).eq("status", "pending");
  const created = await supabase.from("os_website_verification_challenges").insert({ workspace_id: input.workspaceId, source_id: source.id, token_hash: verificationHash(token).toString("hex"), method: input.method, expires_at: expiresAt }).select("id").single();
  if (created.error || !created.data) throw new Error("Verification challenge could not be created.");
  return {
    challengeId: String(created.data.id), method: input.method, token,
    dnsRecord: `auterim-site-verification=${token}`,
    htmlMeta: `<meta name="auterim-site-verification" content="${token}">`,
    htmlFilePath: "/.well-known/auterim-site-verification.txt",
    expiresAt,
  };
}

export async function verifyWebsiteChallenge(input: { workspaceId: string; sourceId: string; challengeId: string; token: string; supabase?: SupabaseAdmin }): Promise<WebsiteSourceSummary> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const source = await getWebsiteSource({ workspaceId: input.workspaceId, sourceId: input.sourceId, supabase });
  if (!source) throw new Error("Website source not found.");
  const challenge = await supabase.from("os_website_verification_challenges").select("*").eq("workspace_id", input.workspaceId).eq("source_id", source.id).eq("id", input.challengeId).maybeSingle();
  if (challenge.error || !challenge.data || challenge.data.status !== "pending") throw new Error("Verification challenge is not available.");
  if (Date.parse(String(challenge.data.expires_at)) <= Date.now()) { await supabase.from("os_website_verification_challenges").update({ status: "expired" }).eq("id", input.challengeId); throw new Error("Verification challenge expired."); }
  const provided = verificationHash(input.token.trim());
  const stored = Buffer.from(String(challenge.data.token_hash), "hex");
  if (!input.token.trim() || !sameSecret(provided, stored)) throw new Error("Verification token did not match.");
  const origin = sourceOrigin(source);
  const approved = [source.canonical_origin];
  let verified = false;
  if (challenge.data.method === "dns_txt") {
    try {
      const records = await dns.resolveTxt(source.hostname);
      const expected = `auterim-site-verification=${input.token.trim()}`;
      verified = records.flat().some((value) => sameSecret(Buffer.from(value), Buffer.from(expected)));
    } catch { verified = false; }
  } else {
    const path = challenge.data.method === "html_file" ? "/.well-known/auterim-site-verification.txt" : "/";
    try {
      const response = await safeWebsiteFetch({ url: `${origin.origin}${path}`, kind: "verification", approvedOrigins: approved, allowedSubdomains: sourceAllowedSubdomains(source) });
      verified = challenge.data.method === "html_file"
        ? response.body.trim() === input.token.trim()
        : Array.from(response.body.matchAll(/<meta\b[^>]*>/gi)).some((match) => {
          const tag = match[0];
          return /auterim-site-verification/i.test(tag) && new RegExp(`content\\s*=\\s*['"]${input.token.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`, "i").test(tag);
        });
    } catch { verified = false; }
  }
  if (!verified) {
    await supabase.from("os_website_verification_challenges").update({ status: "failed" }).eq("id", input.challengeId);
    await supabase.from("os_website_sources").update({ verification_status: "failed", health_status: "verification_pending" }).eq("id", source.id).eq("workspace_id", input.workspaceId);
    throw new Error("Auterim could not verify the configured domain.");
  }
  const verifiedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString();
  await supabase.from("os_website_verification_challenges").update({ status: "verified", verified_at: verifiedAt }).eq("id", input.challengeId);
  const saved = await supabase.from("os_website_sources").update({ verification_status: "verified", verification_method: challenge.data.method, verified_at: verifiedAt, verification_expires_at: expiresAt, health_status: source.sync_enabled ? "connected" : "connected", next_sync_at: source.sync_enabled ? nextWebsiteSyncAt(source.cadence) : null }).eq("id", source.id).eq("workspace_id", input.workspaceId).select("*").single();
  if (saved.error || !saved.data) throw new Error("Verified domain could not be saved.");
  return sourceSummary(saved.data as WebsiteSourceRow);
}

export async function createWebsiteCrawlRun(input: { workspaceId: string; sourceId: string; triggerType: "manual" | "scheduled" | "reconciliation"; supabase?: SupabaseAdmin }): Promise<{ runId: string; reused: boolean }> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const source = await getWebsiteSource({ workspaceId: input.workspaceId, sourceId: input.sourceId, supabase });
  if (!source || source.verification_status !== "verified") throw new Error("Verify the website domain before synchronizing it.");
  if (source.verification_expires_at && Date.parse(source.verification_expires_at) <= Date.now()) {
    await supabase.from("os_website_sources").update({ verification_status: "expired", health_status: "reconnect_required", sync_enabled: false, next_sync_at: null }).eq("id", source.id).eq("workspace_id", input.workspaceId);
    throw new Error("Website verification has expired. Reverify the domain before synchronizing it.");
  }
  const active = await supabase.from("os_website_crawl_runs").select("id").eq("workspace_id", input.workspaceId).eq("source_id", source.id).in("state", ["queued", "claimed", "verifying", "discovering", "fetching", "extracting", "review_ready"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (active.data?.id) return { runId: String(active.data.id), reused: true };
  const slot = input.triggerType === "manual" ? `manual:${Math.floor(Date.now() / (5 * 60 * 1_000))}` : `${input.triggerType}:${Math.floor(Date.now() / cadenceMs(source.cadence))}`;
  const created = await supabase.from("os_website_crawl_runs").insert({ workspace_id: input.workspaceId, source_id: source.id, trigger_type: input.triggerType, scheduled_slot: slot, state: "queued" }).select("id").single();
  if (!created.error && created.data?.id) return { runId: String(created.data.id), reused: false };
  const duplicate = await supabase.from("os_website_crawl_runs").select("id").eq("source_id", source.id).eq("scheduled_slot", slot).maybeSingle();
  if (duplicate.data?.id) return { runId: String(duplicate.data.id), reused: true };
  throw new Error("Website sync could not be queued.");
}

function pagePriority(url: string): number {
  const path = websitePathOf(url).toLowerCase();
  const high = ["/", "/about", "/product", "/platform", "/features", "/pricing", "/security", "/trust", "/docs", "/contact"];
  const index = high.findIndex((item) => path === item || path.startsWith(`${item}/`));
  if (index >= 0) return index;
  if (/blog|changelog|news|policy|privacy|terms/.test(path)) return 20;
  if (path.split("/").length > 5 || /page=|sort=|filter=/.test(url)) return 90;
  return 40;
}

function pageNextAt(source: WebsiteSourceRow, now = Date.now()): string {
  return new Date(now + cadenceMs(source.cadence) + Math.floor(Math.random() * 15 * 60 * 1_000)).toISOString();
}

function retryAt(error: unknown): string | null {
  if (!(error instanceof WebsiteFetchError) || !error.retryAfter) return null;
  const seconds = Number(error.retryAfter);
  const timestamp = Number.isFinite(seconds) && seconds >= 0
    ? Date.now() + Math.min(seconds, 24 * 60 * 60) * 1_000
    : Date.parse(error.retryAfter);
  return Number.isFinite(timestamp) ? new Date(Math.max(Date.now() + WEBSITE_LIMITS.minimumRequestIntervalMs, timestamp)).toISOString() : null;
}

async function updateRun(supabase: SupabaseAdmin, runId: string, values: Record<string, unknown>): Promise<void> {
  await supabase.from("os_website_crawl_runs").update(values).eq("id", runId);
}

async function pageByCanonical(supabase: SupabaseAdmin, sourceId: string, canonicalUrl: string): Promise<WebsitePageRow | null> {
  const result = await supabase.from("os_website_pages").select("*").eq("source_id", sourceId).eq("canonical_url", canonicalUrl).maybeSingle();
  return result.data as WebsitePageRow | null;
}

async function persistPageDiscovery(supabase: SupabaseAdmin, source: WebsiteSourceRow, item: { url: string; lastmod: string | null; discoveredFrom: string }): Promise<WebsitePageRow | null> {
  const existing = await pageByCanonical(supabase, source.id, item.url);
  if (existing) {
    const updated = await supabase.from("os_website_pages").update({ fetched_url: item.url, discovered_from: item.discoveredFrom, lastmod_hint: item.lastmod }).eq("id", existing.id).eq("workspace_id", source.workspace_id).select("*").single();
    return updated.data as WebsitePageRow | null;
  }
  const saved = await supabase.from("os_website_pages").insert({ workspace_id: source.workspace_id, source_id: source.id, fetched_url: item.url, canonical_url: item.url, discovered_from: item.discoveredFrom, lastmod_hint: item.lastmod, status: "queued", robots_status: "unknown", next_eligible_at: new Date().toISOString() }).select("*").single();
  return saved.data as WebsitePageRow | null;
}

function policyFromSource(source: WebsiteSourceRow): RobotsPolicy {
  return { rules: Array.isArray(source.robots_rules) ? source.robots_rules as RobotsPolicy["rules"] : [], sitemaps: stringArray(source.robots_sitemaps, 10), crawlDelayMs: null };
}

async function loadRobots(input: { supabase: SupabaseAdmin; source: WebsiteSourceRow }): Promise<{ policy: RobotsPolicy; status: "allowed" | "blocked" | "unavailable" | "error" }> {
  const { source, supabase } = input;
  if (source.robots_expires_at && Date.parse(source.robots_expires_at) > Date.now() && source.robots_status !== "unknown") return { policy: policyFromSource(source), status: source.robots_status === "blocked" ? "blocked" : source.robots_status === "error" ? "error" : source.robots_status === "unavailable" ? "unavailable" : "allowed" };
  try {
    const response = await safeWebsiteFetch({ url: `${source.canonical_origin}/robots.txt`, kind: "robots", approvedOrigins: [source.canonical_origin], allowedSubdomains: sourceAllowedSubdomains(source) });
    const policy = parseRobotsTxt(response.body);
    await supabase.from("os_website_sources").update({ robots_status: "allowed", robots_rules: serializeRobotsRules(policy), robots_sitemaps: policy.sitemaps, robots_fetched_at: new Date().toISOString(), robots_expires_at: new Date(Date.now() + WEBSITE_LIMITS.robotsCacheMs).toISOString() }).eq("id", source.id).eq("workspace_id", source.workspace_id);
    return { policy, status: "allowed" };
  } catch (error) {
    if (error instanceof WebsiteFetchError && error.status === 404) {
      const policy: RobotsPolicy = { rules: [], sitemaps: [], crawlDelayMs: null };
      await supabase.from("os_website_sources").update({ robots_status: "allowed", robots_rules: [], robots_sitemaps: [], robots_fetched_at: new Date().toISOString(), robots_expires_at: new Date(Date.now() + WEBSITE_LIMITS.robotsCacheMs).toISOString() }).eq("id", source.id).eq("workspace_id", source.workspace_id);
      return { policy, status: "allowed" };
    }
    await supabase.from("os_website_sources").update({ robots_status: "unavailable", health_status: "blocked_by_robots" }).eq("id", source.id).eq("workspace_id", source.workspace_id);
    return { policy: policyFromSource(source), status: "unavailable" };
  }
}

async function discoverUrls(input: { source: WebsiteSourceRow; policy: RobotsPolicy; supabase: SupabaseAdmin }): Promise<Array<{ url: string; lastmod: string | null; discoveredFrom: string }>> {
  const { source, policy, supabase } = input;
  const origin = sourceOrigin(source);
  const accepted = new Map<string, { url: string; lastmod: string | null; discoveredFrom: string }>();
  const sitemapQueue = [...policy.sitemaps, `${source.canonical_origin}/sitemap.xml`].map((url) => canonicalizeWebsiteUrl(url, origin, { allowedSubdomains: sourceAllowedSubdomains(source) })).filter((url): url is string => Boolean(url));
  const visited = new Set<string>();
  let files = 0;
  const visit = async (url: string, depth: number): Promise<void> => {
    if (files >= WEBSITE_LIMITS.maxSitemapFilesPerRun || depth > WEBSITE_LIMITS.maxSitemapDepth || visited.has(url)) return;
    visited.add(url); files += 1;
    try {
      const response = await safeWebsiteFetch({ url, kind: "sitemap", approvedOrigins: [source.canonical_origin], allowedSubdomains: sourceAllowedSubdomains(source) });
      const document = parseSitemapXml(response.body);
      for (const entry of acceptSitemapUrls({ document, origin, allowedSubdomains: sourceAllowedSubdomains(source), includePaths: sourceIncludePaths(source), excludePaths: sourceExcludePaths(source), limit: WEBSITE_LIMITS.maxSitemapEntriesPerRun })) accepted.set(entry.url, { ...entry, discoveredFrom: url });
      for (const index of document.indexes.slice(0, WEBSITE_LIMITS.maxSitemapFilesPerRun)) {
        const canonical = canonicalizeWebsiteUrl(index, origin, { allowedSubdomains: sourceAllowedSubdomains(source) });
        if (canonical) await visit(canonical, depth + 1);
      }
    } catch { /* one bad sitemap must not erase the approved inventory */ }
  };
  for (const sitemap of sitemapQueue) await visit(sitemap, 0);
  const existingPages = await supabase.from("os_website_pages").select("canonical_url,lastmod_hint,status").eq("source_id", source.id).in("status", ["active", "not_modified", "queued", "discovered"]).limit(source.max_pages);
  for (const page of existingPages.data ?? []) if (typeof page.canonical_url === "string" && sourceUrlAllowed(source, page.canonical_url)) accepted.set(page.canonical_url, { url: page.canonical_url, lastmod: typeof page.lastmod_hint === "string" ? page.lastmod_hint : null, discoveredFrom: "approved_inventory" });
  const home = canonicalizeWebsiteUrl(source.canonical_origin, origin, { allowedSubdomains: sourceAllowedSubdomains(source) });
  if (home && !accepted.has(home)) accepted.set(home, { url: home, lastmod: null, discoveredFrom: "canonical_origin" });
  if (accepted.size <= 1) {
    try {
      const homepage = await safeWebsiteFetch({ url: home ?? source.canonical_origin, kind: "html", approvedOrigins: [source.canonical_origin], allowedSubdomains: sourceAllowedSubdomains(source) });
      const extracted = extractWebsitePage(homepage.body);
      for (const link of extracted.links) {
        const canonical = canonicalizeWebsiteUrl(link, origin, { allowedSubdomains: sourceAllowedSubdomains(source) });
        if (canonical && sourceUrlAllowed(source, canonical)) accepted.set(canonical, { url: canonical, lastmod: null, discoveredFrom: home ?? source.canonical_origin });
        if (accepted.size >= WEBSITE_LIMITS.maxSitemapEntriesPerRun) break;
      }
    } catch { /* the run retains sitemap/inventory results */ }
  }
  return Array.from(accepted.values()).sort((a, b) => pagePriority(a.url) - pagePriority(b.url) || a.url.localeCompare(b.url)).slice(0, Math.min(source.max_pages, WEBSITE_LIMITS.maxPagesPerRun));
}

function observationCategory(type: string): "business" | "commercial" | "support" | "operating_rules" {
  if (/pricing|product|positioning|region/i.test(type)) return "commercial";
  if (/contact|policy|security/i.test(type)) return "operating_rules";
  return "business";
}

function normalizedValue(value: string): string { return value.trim().replace(/\s+/g, " ").toLowerCase(); }

async function persistObservation(input: { supabase: SupabaseAdmin; source: WebsiteSourceRow; page: WebsitePageRow; observation: ReturnType<typeof observationsFromWebsitePage>[number]; contentHash: string; checkedAt: string }): Promise<{ created: boolean; conflict: boolean; pending: boolean }> {
  const { supabase, source, page, observation, contentHash, checkedAt } = input;
  const valueHash = hash(normalizedValue(observation.observationValue));
  const existingResult = await supabase.from("os_website_observations").select("*").eq("page_id", page.id).eq("source_content_hash", contentHash).eq("observation_key", observation.observationKey).eq("observation_value_hash", valueHash).eq("extraction_version", WEBSITE_LIMITS.extractionVersion).maybeSingle();
  const existing = existingResult.data as WebsiteObservationRow | null;
  const observationId = existing?.id ?? randomUUID();
  const owner = await supabase.from("os_memory_entries").select("id,content,reliability").eq("workspace_id", source.workspace_id).eq("canonical_key", observation.observationKey).eq("reliability", "verified").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const ownerContent = typeof owner.data?.content === "string" ? owner.data.content : null;
  const conflict = Boolean(ownerContent && normalizedValue(ownerContent) !== normalizedValue(observation.observationValue));
  const wasDismissed = existing && ["dismissed", "ignored"].includes(existing.review_status) && existing.observation_value_hash === valueHash;
  const reviewStatus: WebsiteObservationReviewStatus = wasDismissed ? existing.review_status : conflict ? "pending" : existing?.review_status === "kept_observed" || existing?.review_status === "confirmed_owner" || existing?.review_status === "edited_owner" ? existing.review_status : "pending";
  const saved = await supabase.from("os_website_observations").upsert({
    id: observationId, workspace_id: source.workspace_id, source_id: source.id, page_id: page.id, canonical_source_url: page.canonical_url, source_content_hash: contentHash,
    observation_type: observation.observationType, observation_key: observation.observationKey, observation_value: observation.observationValue, observation_value_hash: valueHash, evidence_excerpt: observation.evidenceExcerpt,
    observed_at: checkedAt, source_last_checked_at: checkedAt, extraction_method: "deterministic", extraction_version: WEBSITE_LIMITS.extractionVersion, confidence: observation.confidence, trust_level: "observed", freshness_status: "fresh", conflict_status: conflict ? "conflict" : existing?.conflict_status === "conflict" && reviewStatus !== "pending" ? "resolved" : "none", review_status: reviewStatus,
    memory_entry_id: existing?.memory_entry_id ?? null, metadata: { websiteUntrusted: true, sourceContentHash: contentHash },
  }, { onConflict: "page_id,source_content_hash,observation_key,observation_value_hash,extraction_version" }).select("id,memory_entry_id,review_status").single();
  if (saved.error) throw new Error("Website observation could not be stored.");
  let memoryEntryId = existing?.memory_entry_id ?? null;
  if (!wasDismissed) {
    const memory = await appendMemoryVersion({ supabase, memory: {
      workspaceId: source.workspace_id, canonicalKey: observation.observationKey, category: observationCategory(observation.observationType), label: observation.observationType.replace(/_/g, " "), summary: "Observed from the authorized public website.", content: observation.observationValue,
      sourceType: "connector_observed", sourceLabel: `Website · ${source.hostname}`, sourceRef: page.canonical_url, sourceConnector: "website", sourceEntityId: observationId, evidence: [`${page.canonical_url} · ${observation.evidenceExcerpt}`], observedAt: checkedAt, confidence: observation.confidence, policyRelevant: false, operatorRelevance: ["revenue", "client_flow", "operations"], metadata: { websiteObservationId: observationId, websiteUntrusted: true, conflict, reviewStatus },
      reliability: "observed",
    } });
    memoryEntryId = memory.id;
    await supabase.from("os_website_observations").update({ memory_entry_id: memoryEntryId }).eq("id", observationId).eq("workspace_id", source.workspace_id);
  }
  return { created: !existing, conflict, pending: reviewStatus === "pending" };
}

async function withdrawPageObservations(supabase: SupabaseAdmin, pageId: string, workspaceId: string, reason: string): Promise<void> {
  await supabase.from("os_website_observations").update({ freshness_status: "withdrawn", metadata: { reason: reason.slice(0, 120), withdrawnAt: new Date().toISOString() } }).eq("page_id", pageId).eq("workspace_id", workspaceId).neq("review_status", "confirmed_owner");
}

async function stalePriorPageObservations(supabase: SupabaseAdmin, pageId: string, workspaceId: string, contentHash: string, checkedAt: string): Promise<void> {
  const prior = await supabase.from("os_website_observations").select("id,memory_entry_id").eq("page_id", pageId).eq("workspace_id", workspaceId).neq("source_content_hash", contentHash).neq("review_status", "confirmed_owner");
  if (prior.error) throw new Error("Prior website observations could not be checked.");
  await supabase.from("os_website_observations").update({ freshness_status: "stale" }).eq("page_id", pageId).eq("workspace_id", workspaceId).neq("source_content_hash", contentHash).neq("review_status", "confirmed_owner");
  const memoryIds = (prior.data ?? []).map((row) => row.memory_entry_id).filter((id): id is string => typeof id === "string" && id.length > 0);
  if (memoryIds.length) await supabase.from("os_memory_entries").update({ reliability: "stale", stale_after: checkedAt }).in("id", memoryIds).eq("workspace_id", workspaceId).neq("reliability", "verified");
}

async function processPage(input: { supabase: SupabaseAdmin; source: WebsiteSourceRow; page: WebsitePageRow; policy: RobotsPolicy; runId: string; counters: { checked: number; changed: number; skipped: number; failed: number; observations: number; conflicts: number } }): Promise<void> {
  const { source, page, policy, supabase, counters } = input;
  if (!isWebsitePathAllowed(policy, websitePathOf(page.canonical_url))) {
    counters.skipped += 1;
    await supabase.from("os_website_pages").update({ status: "blocked", robots_status: "blocked", last_checked_at: new Date().toISOString(), next_eligible_at: pageNextAt(source) }).eq("id", page.id).eq("workspace_id", source.workspace_id);
    return;
  }
  const checkedAt = new Date().toISOString();
  try {
    const response = await safeWebsiteFetch({ url: page.fetched_url, kind: "html", approvedOrigins: [source.canonical_origin], allowedSubdomains: sourceAllowedSubdomains(source), headers: { ...(page.etag ? { "if-none-match": page.etag } : {}), ...(page.last_modified ? { "if-modified-since": page.last_modified } : {}) } });
    counters.checked += 1;
    if (response.notModified) {
      await supabase.from("os_website_pages").update({ status: "not_modified", robots_status: "allowed", last_checked_at: checkedAt, last_http_status: 304, consecutive_failure_count: 0, next_eligible_at: pageNextAt(source) }).eq("id", page.id).eq("workspace_id", source.workspace_id);
      return;
    }
    const extracted = extractWebsitePage(response.body);
    const acceptedCanonical = extracted.canonical ? canonicalizeWebsiteUrl(extracted.canonical, sourceOrigin(source), { allowedSubdomains: sourceAllowedSubdomains(source) }) : null;
    const finalUrl = canonicalizeWebsiteUrl(response.finalUrl, sourceOrigin(source), { allowedSubdomains: sourceAllowedSubdomains(source) }) ?? page.fetched_url;
    const canonicalUrl = acceptedCanonical && sourceUrlAllowed(source, acceptedCanonical) ? acceptedCanonical : finalUrl;
    const meaningfulChanged = page.content_hash !== extracted.contentHash;
    counters.changed += meaningfulChanged ? 1 : 0;
    await supabase.from("os_website_pages").update({ fetched_url: response.finalUrl, canonical_url: canonicalUrl, status: extracted.noindex || extracted.noarchive ? "skipped" : "active", robots_status: "allowed", noindex: extracted.noindex, noarchive: extracted.noarchive, title: extracted.title, meta_description: extracted.metaDescription, language: extracted.language, canonical_tag: extracted.canonical, etag: response.headers.get("etag"), last_modified: response.headers.get("last-modified"), last_checked_at: checkedAt, last_successful_fetch_at: checkedAt, last_http_status: response.status, consecutive_failure_count: 0, next_eligible_at: pageNextAt(source), content_hash: extracted.contentHash, extraction_version: WEBSITE_LIMITS.extractionVersion, normalized_text: extracted.readableText.slice(0, WEBSITE_LIMITS.normalizedPageTextChars), removed_at: null }).eq("id", page.id).eq("workspace_id", source.workspace_id);
    if (!meaningfulChanged && page.extraction_version === WEBSITE_LIMITS.extractionVersion) return;
    await supabase.from("os_website_page_versions").upsert({ workspace_id: source.workspace_id, source_id: source.id, page_id: page.id, content_hash: extracted.contentHash, extraction_version: WEBSITE_LIMITS.extractionVersion, normalized_length: extracted.readableText.length, fetched_at: checkedAt }, { onConflict: "page_id,content_hash,extraction_version" });
    if (meaningfulChanged) await stalePriorPageObservations(supabase, page.id, source.workspace_id, extracted.contentHash, checkedAt);
    if (extracted.noindex || extracted.noarchive) {
      await withdrawPageObservations(supabase, page.id, source.workspace_id, extracted.noindex ? "noindex" : "noarchive");
      counters.skipped += 1;
      return;
    }
    for (const observation of observationsFromWebsitePage(extracted).slice(0, 12)) {
      const result = await persistObservation({ supabase, source, page: { ...page, canonical_url: canonicalUrl }, observation, contentHash: extracted.contentHash, checkedAt });
      if (result.created) counters.observations += 1;
      if (result.conflict) counters.conflicts += 1;
    }
  } catch (error) {
    counters.failed += 1;
    const is404 = error instanceof WebsiteFetchError && error.status === 404;
    const is410 = error instanceof WebsiteFetchError && error.status === 410;
    const failureWindowExpired = Boolean(page.last_checked_at && Date.now() - Date.parse(page.last_checked_at) >= WEBSITE_LIMITS.pageFailureTombstoneWindowMs);
    const failureCount = failureWindowExpired ? 1 : page.consecutive_failure_count + 1;
    const tombstone = is410 || (is404 && failureCount >= WEBSITE_LIMITS.pageFailureTombstoneThreshold);
    await supabase.from("os_website_pages").update({ status: tombstone ? "tombstoned" : "failed", last_checked_at: checkedAt, last_http_status: error instanceof WebsiteFetchError ? error.status : null, consecutive_failure_count: failureCount, tombstone_count: tombstone ? page.tombstone_count + 1 : page.tombstone_count, removed_at: tombstone ? checkedAt : null, next_eligible_at: tombstone ? null : retryAt(error) ?? pageNextAt(source) }).eq("id", page.id).eq("workspace_id", source.workspace_id);
    if (tombstone) await withdrawPageObservations(supabase, page.id, source.workspace_id, is410 ? "http_410" : "repeated_http_404");
  }
}

export async function runWebsiteSync(input: { runId: string; supabase?: SupabaseAdmin }): Promise<Record<string, unknown>> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const leaseToken = randomUUID();
  const claim = await supabase.rpc("claim_os_website_crawl_run", { p_run_id: input.runId, p_lease_token: leaseToken, p_lease_seconds: 900 });
  if (claim.error || claim.data !== true) return { runId: input.runId, status: "already_claimed" };
  const run = await supabase.from("os_website_crawl_runs").select("*").eq("id", input.runId).maybeSingle();
  if (run.error || !run.data) { await supabase.rpc("release_os_website_crawl_run", { p_run_id: input.runId, p_lease_token: leaseToken, p_state: "failed", p_error_code: "run_not_found" }); return { runId: input.runId, status: "failed", errorCode: "run_not_found" }; }
  const sourceResult = await supabase.from("os_website_sources").select("*").eq("id", run.data.source_id).eq("workspace_id", run.data.workspace_id).maybeSingle();
  const source = sourceResult.data as WebsiteSourceRow | null;
  if (!source || !source.sync_enabled || source.verification_status !== "verified") { await supabase.rpc("release_os_website_crawl_run", { p_run_id: input.runId, p_lease_token: leaseToken, p_state: "cancelled", p_error_code: "source_not_ready" }); return { runId: input.runId, status: "cancelled", errorCode: "source_not_ready" }; }
  if (source.verification_expires_at && Date.parse(source.verification_expires_at) <= Date.now()) { await supabase.from("os_website_sources").update({ verification_status: "expired", health_status: "reconnect_required", sync_enabled: false }).eq("id", source.id); await supabase.rpc("release_os_website_crawl_run", { p_run_id: input.runId, p_lease_token: leaseToken, p_state: "failed", p_error_code: "verification_expired" }); return { runId: input.runId, status: "failed", errorCode: "verification_expired" }; }
  const counters = { checked: 0, changed: 0, skipped: 0, failed: 0, observations: 0, conflicts: 0 };
  try {
    await updateRun(supabase, input.runId, { state: "verifying", heartbeat_at: new Date().toISOString() });
    const robots = await loadRobots({ supabase, source });
    if (robots.status === "unavailable" || robots.status === "error" || robots.status === "blocked") {
      await updateRun(supabase, input.runId, { state: "partial", error_code: "robots_unavailable", failed_count: 1 });
      await supabase.from("os_website_sources").update({ health_status: "blocked_by_robots", last_run_id: input.runId, pages_failed: 1, next_sync_at: nextWebsiteSyncAt(source.cadence) }).eq("id", source.id);
      await supabase.rpc("release_os_website_crawl_run", { p_run_id: input.runId, p_lease_token: leaseToken, p_state: "partial", p_error_code: "robots_unavailable" });
      return { runId: input.runId, status: "partial", errorCode: "robots_unavailable" };
    }
    await updateRun(supabase, input.runId, { state: "discovering", heartbeat_at: new Date().toISOString() });
    const discovered = await discoverUrls({ source, policy: robots.policy, supabase });
    for (const item of discovered) await persistPageDiscovery(supabase, source, item);
    await updateRun(supabase, input.runId, { state: "fetching", discovered_count: discovered.length, heartbeat_at: new Date().toISOString() });
    const pagesResult = await supabase.from("os_website_pages").select("*").eq("source_id", source.id).in("status", ["queued", "discovered", "active", "not_modified", "failed"]).order("next_eligible_at", { ascending: true, nullsFirst: true }).limit(WEBSITE_LIMITS.maxPagesPerRun);
    const now = Date.now();
    const pages = ((pagesResult.data ?? []) as WebsitePageRow[])
      .filter((page) => run.data.trigger_type === "manual" || !page.next_eligible_at || Date.parse(page.next_eligible_at) <= now)
      .slice(0, Math.min(source.max_pages, WEBSITE_LIMITS.maxPagesPerRun));
    let lastRequestAt = 0;
    const requestInterval = Math.max(WEBSITE_LIMITS.minimumRequestIntervalMs, robots.policy.crawlDelayMs ?? 0);
    for (const page of pages) {
      const wait = requestInterval - (Date.now() - lastRequestAt);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastRequestAt = Date.now();
      await updateRun(supabase, input.runId, { state: "extracting", heartbeat_at: new Date().toISOString() });
      await processPage({ supabase, source, page, policy: robots.policy, runId: input.runId, counters });
      if (counters.checked % 10 === 0) await updateRun(supabase, input.runId, { checked_count: counters.checked, changed_count: counters.changed, skipped_count: counters.skipped, failed_count: counters.failed, observation_count: counters.observations, conflict_count: counters.conflicts, heartbeat_at: new Date().toISOString() });
    }
    const pending = await supabase.from("os_website_observations").select("id", { count: "exact", head: true }).eq("source_id", source.id).eq("review_status", "pending");
    const conflicts = await supabase.from("os_website_observations").select("id", { count: "exact", head: true }).eq("source_id", source.id).eq("review_status", "pending").eq("conflict_status", "conflict");
    const finalState = counters.failed > 0 || counters.skipped > 0 ? "partial" : (pending.count ?? 0) > 0 ? "review_ready" : "completed";
    const health: WebsiteHealthStatus = counters.failed > 0 ? "partial" : "healthy";
    await updateRun(supabase, input.runId, { state: finalState, discovered_count: discovered.length, checked_count: counters.checked, changed_count: counters.changed, skipped_count: counters.skipped, failed_count: counters.failed, observation_count: counters.observations, conflict_count: counters.conflicts, completed_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() });
    await supabase.from("os_website_sources").update({ health_status: health, last_run_id: input.runId, last_successful_sync_at: counters.failed < pages.length ? new Date().toISOString() : source.last_successful_sync_at, next_sync_at: nextWebsiteSyncAt(source.cadence), pages_discovered: discovered.length, pages_checked: counters.checked, pages_changed: counters.changed, pages_skipped: counters.skipped, pages_failed: counters.failed, observations_pending: pending.count ?? 0, conflicts_pending: conflicts.count ?? 0 }).eq("id", source.id).eq("workspace_id", source.workspace_id);
    await supabase.rpc("release_os_website_crawl_run", { p_run_id: input.runId, p_lease_token: leaseToken, p_state: finalState, p_error_code: counters.failed > 0 ? "page_failures" : null });
    return { runId: input.runId, status: finalState, discovered: discovered.length, ...counters, pendingObservations: pending.count ?? 0, conflicts: conflicts.count ?? 0 };
  } catch (error) {
    await updateRun(supabase, input.runId, { state: "failed", error_code: boundedError(error), error_detail: null, completed_at: new Date().toISOString(), ...counters });
    await supabase.from("os_website_sources").update({ health_status: "failed", last_run_id: input.runId, pages_failed: counters.failed + 1 }).eq("id", source.id).eq("workspace_id", source.workspace_id);
    await supabase.rpc("release_os_website_crawl_run", { p_run_id: input.runId, p_lease_token: leaseToken, p_state: "failed", p_error_code: boundedError(error) });
    return { runId: input.runId, status: "failed", errorCode: boundedError(error), ...counters };
  }
}

export async function reviewWebsiteObservation(input: { workspaceId: string; observationId: string; action: "confirm" | "keep_observed" | "edit_confirm" | "dismiss" | "ignore" | "resolve_conflict"; editedValue?: string; supabase?: SupabaseAdmin }): Promise<void> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const result = await supabase.from("os_website_observations").select("*").eq("id", input.observationId).eq("workspace_id", input.workspaceId).maybeSingle();
  const observation = result.data as (WebsiteObservationRow & { canonical_source_url: string; observation_type: string; observation_value: string; evidence_excerpt: string; source_id: string; page_id: string; confidence: "low" | "medium" | "high" }) | null;
  if (result.error || !observation) throw new Error("Website observation not found.");
  const value = input.action === "edit_confirm" ? input.editedValue?.trim().slice(0, WEBSITE_LIMITS.observationValueChars) : observation.observation_value;
  if (input.action === "edit_confirm" && !value) throw new Error("Enter the corrected observed value.");
  if (["confirm", "edit_confirm"].includes(input.action)) {
    const memory = await appendMemoryVersion({ supabase, memory: {
      workspaceId: input.workspaceId, canonicalKey: observation.observation_key, category: observationCategory(observation.observation_type), label: observation.observation_type.replace(/_/g, " "), summary: "Owner-confirmed from reviewed website evidence.", content: value ?? observation.observation_value, sourceType: "owner_confirmed", sourceLabel: "Owner-confirmed website context", sourceRef: observation.canonical_source_url, sourceEntityId: observation.id, evidence: [observation.canonical_source_url, observation.evidence_excerpt], observedAt: new Date().toISOString(), lastConfirmedAt: new Date().toISOString(), reliability: "verified", metadata: { websiteObservationId: observation.id, reviewedWebsiteEvidence: true },
    } });
    await supabase.from("os_website_observations").update({ review_status: input.action === "edit_confirm" ? "edited_owner" : "confirmed_owner", conflict_status: observation.conflict_status === "conflict" ? "resolved" : observation.conflict_status, memory_entry_id: memory.id }).eq("id", observation.id).eq("workspace_id", input.workspaceId);
  } else if (input.action === "keep_observed" || input.action === "resolve_conflict") {
    await supabase.from("os_website_observations").update({ review_status: "kept_observed", conflict_status: observation.conflict_status === "conflict" ? "resolved" : observation.conflict_status }).eq("id", observation.id).eq("workspace_id", input.workspaceId);
  } else {
    await supabase.from("os_website_observations").update({ review_status: input.action === "ignore" ? "ignored" : "dismissed", dismissed_fingerprint: observation.observation_value_hash }).eq("id", observation.id).eq("workspace_id", input.workspaceId);
  }
}

export async function disconnectWebsiteSource(input: { workspaceId: string; sourceId: string; retainObservations: boolean; supabase?: SupabaseAdmin }): Promise<void> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const source = await getWebsiteSource({ workspaceId: input.workspaceId, sourceId: input.sourceId, supabase });
  if (!source) return;
  const now = new Date().toISOString();
  await supabase.from("os_website_crawl_runs").update({ state: "cancelled", error_code: "source_disconnected" }).eq("source_id", source.id).in("state", ["queued", "claimed", "verifying", "discovering", "fetching", "extracting"]);
  await supabase.from("os_website_sources").update({ sync_enabled: false, verification_status: "pending", verification_method: null, verified_at: null, verification_expires_at: null, health_status: "setup_required", next_sync_at: null, disconnected_at: now, retain_observations_on_disconnect: input.retainObservations }).eq("id", source.id).eq("workspace_id", input.workspaceId);
  if (!input.retainObservations) {
    await supabase.from("os_website_observations").delete().eq("source_id", source.id).eq("workspace_id", input.workspaceId);
    await supabase.from("os_website_pages").delete().eq("source_id", source.id).eq("workspace_id", input.workspaceId);
    await supabase.from("os_website_page_versions").delete().eq("source_id", source.id).eq("workspace_id", input.workspaceId);
  } else {
    await supabase.from("os_website_observations").update({ freshness_status: "withdrawn", metadata: { disconnectedAt: now } }).eq("source_id", source.id).eq("workspace_id", input.workspaceId).neq("review_status", "confirmed_owner");
  }
}
