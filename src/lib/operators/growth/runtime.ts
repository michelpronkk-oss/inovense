import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import { logOperatorEvent, operatorRuntimeId } from "@/lib/operators/logging";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

export const GROWTH_OPERATOR_KEY = "growth" as const;
export const GROWTH_AGENT_MARK = "GR";
export const GROWTH_AGENT_COLOR = "#A78BFA";
export const GROWTH_CHANNELS = ["x", "linkedin", "founder_update", "email_newsletter", "reusable_announcement"] as const;
export type GrowthChannel = (typeof GROWTH_CHANNELS)[number];

type WebsiteObservation = {
  id: string;
  source_id: string;
  canonical_source_url: string;
  observation_type: string;
  observation_key: string;
  observation_value: string;
  evidence_excerpt: string;
  observed_at: string;
  source_last_checked_at: string;
  confidence: string;
  freshness_status: string;
  review_status: string;
  trust_level: string;
};

type OwnerMemory = {
  id: string;
  canonical_key: string;
  label: string;
  summary: string;
  content: string;
  source_type: string;
  reliability: string;
  updated_at: string;
};

type Opportunity = {
  id: string;
  title: string;
  summary: string;
  evidence: unknown[];
  trust_level: string;
  freshness_status: string;
  score: number;
  status: string;
  source_type: string;
  source_ref: string;
};

function bounded(value: string, max: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function safeObservedText(value: string): string {
  // Website text is evidence only. It is never parsed as instructions, code,
  // tool input, policy, or an authorization source.
  return bounded(value.replace(/<[^>]*>/g, " "), 360);
}

function opportunityFromObservation(observation: WebsiteObservation) {
  const key = observation.observation_key;
  const title = key === "website.pricing.statement"
    ? "Clarify the public pricing story"
    : key === "website.positioning.description"
      ? "Strengthen the public positioning story"
      : key === "website.content.headings"
        ? "Turn the public service story into a campaign"
        : key === "website.security.public_claim"
          ? "Prepare a trust and security proof moment"
          : "Use a verified website observation as a growth signal";
  const value = safeObservedText(observation.observation_value);
  const excerpt = safeObservedText(observation.evidence_excerpt);
  return {
    fingerprint: sha256({ source: "website_observation", sourceId: observation.id, key, value: observation.observation_value }),
    dedupeKey: `${key}:${sha256(observation.observation_value)}`,
    sourceType: "website_observation",
    sourceRef: `website-observation:${observation.id}`,
    title,
    summary: value || "A fresh website observation is available for owner review.",
    evidence: [{ source: "website", trust: "observed", observationId: observation.id, url: observation.canonical_source_url, key, excerpt, observedAt: observation.observed_at, lastCheckedAt: observation.source_last_checked_at, confidence: observation.confidence }],
    trustLevel: "observed",
    freshnessStatus: observation.freshness_status,
    score: observation.confidence === "high" ? 0.8 : observation.confidence === "medium" ? 0.6 : 0.4,
    observedAt: observation.observed_at,
  };
}

function toOpportunity(row: Record<string, unknown>): Opportunity {
  return {
    id: String(row.id),
    title: String(row.title ?? "Growth opportunity"),
    summary: String(row.summary ?? ""),
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    trust_level: String(row.trust_level ?? "observed"),
    freshness_status: String(row.freshness_status ?? "fresh"),
    score: typeof row.score === "number" ? row.score : Number(row.score ?? 0),
    status: String(row.status ?? "detected"),
    source_type: String(row.source_type ?? "unknown"),
    source_ref: String(row.source_ref ?? ""),
  };
}

async function loadOwnerMemory(supabase: SupabaseAdmin, workspaceId: string): Promise<OwnerMemory[]> {
  const result = await supabase.from("os_memory_entries")
    .select("id,canonical_key,label,summary,content,source_type,reliability,updated_at")
    .eq("workspace_id", workspaceId)
    .in("source_type", ["owner_confirmed", "owner_entered"])
    .in("reliability", ["verified", "observed"])
    .order("updated_at", { ascending: false }).limit(30);
  if (result.error) throw new Error("Owner-confirmed Memory is temporarily unavailable.");
  return (result.data ?? []) as OwnerMemory[];
}

export async function runGrowthOperatorScan(input: { workspaceId: string; runId: string; supabase?: SupabaseAdmin }) {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const startedAt = new Date().toISOString();
  await supabase.from("os_operator_runs").update({ status: "running", started_at: startedAt, error: null }).eq("id", input.runId).eq("workspace_id", input.workspaceId).eq("operator_key", GROWTH_OPERATOR_KEY);

  try {
    const observations = await supabase.from("os_website_observations")
      .select("id,source_id,canonical_source_url,observation_type,observation_key,observation_value,evidence_excerpt,observed_at,source_last_checked_at,confidence,freshness_status,review_status,trust_level")
      .eq("workspace_id", input.workspaceId)
      .eq("trust_level", "observed")
      .in("freshness_status", ["fresh"])
      .in("review_status", ["pending", "kept_observed", "confirmed_owner", "edited_owner"])
      .order("observed_at", { ascending: false }).limit(120);
    if (observations.error) throw new Error("Verified Website Knowledge is temporarily unavailable.");
    const ownerMemory = await loadOwnerMemory(supabase, input.workspaceId);
    const sourceRows = (observations.data ?? []) as WebsiteObservation[];
    let created = 0;
    let refreshed = 0;
    const opportunityIds: string[] = [];

    for (const observation of sourceRows) {
      const candidate = opportunityFromObservation(observation);
      const existing = await supabase.from("os_growth_opportunities")
        .select("id,status").eq("workspace_id", input.workspaceId).eq("fingerprint", candidate.fingerprint).maybeSingle();
      if (existing.error) throw new Error("Growth opportunity storage is temporarily unavailable.");
      if (existing.data?.id) {
        const update = await supabase.from("os_growth_opportunities").update({ last_seen_at: new Date().toISOString(), freshness_status: candidate.freshnessStatus, evidence: candidate.evidence }).eq("id", existing.data.id).eq("workspace_id", input.workspaceId);
        if (update.error) throw new Error("Growth opportunity refresh failed.");
        refreshed += 1;
        opportunityIds.push(String(existing.data.id));
      } else {
        const insert = await supabase.from("os_growth_opportunities").insert({
          workspace_id: input.workspaceId, fingerprint: candidate.fingerprint, source_type: candidate.sourceType,
          source_ref: candidate.sourceRef, title: candidate.title, summary: candidate.summary, evidence: candidate.evidence,
          trust_level: candidate.trustLevel, freshness_status: candidate.freshnessStatus, score: candidate.score,
          dedupe_key: candidate.dedupeKey, observed_at: candidate.observedAt, last_seen_at: new Date().toISOString(),
          metadata: { governance: "website_content_is_observed_untrusted_evidence_only", ownerMemoryIds: ownerMemory.map((item) => item.id).slice(0, 10) },
        }).select("id").single();
        if (insert.error || !insert.data) throw new Error("Growth opportunity creation failed.");
        created += 1;
        opportunityIds.push(String(insert.data.id));
      }
    }

    const output = { type: "growth_scan_summary", status: "completed", sourceMode: "manual", observationsRead: sourceRows.length, opportunitiesCreated: created, opportunitiesRefreshed: refreshed, opportunityIds, ownerMemoryContextCount: ownerMemory.length, governance: { websiteContent: "observed_untrusted", executableInstructions: false, policyChanges: false, publishing: "manual_export_or_owner_confirmed_external_publish_only" }, completedAt: new Date().toISOString() };
    await supabase.from("os_operator_runs").update({ status: "completed", output, completed_at: output.completedAt }).eq("id", input.runId).eq("workspace_id", input.workspaceId);
    await logOperatorEvent({ supabase, workspaceId: input.workspaceId, runId: input.runId, eventType: "growth.scan.completed", message: "Growth scanned governed Website Knowledge and workspace context.", metadata: { observationsRead: sourceRows.length, opportunitiesCreated: created, opportunitiesRefreshed: refreshed, ownerMemoryContextCount: ownerMemory.length } });
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Growth scan failed.";
    await supabase.from("os_operator_runs").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", input.runId).eq("workspace_id", input.workspaceId);
    await logOperatorEvent({ supabase, workspaceId: input.workspaceId, runId: input.runId, level: "error", eventType: "growth.scan.failed", message: "Growth scan failed safely.", metadata: { error: message } });
    throw error;
  }
}

export async function queueGrowthScan(input: { workspaceId: string; actor: string; supabase?: SupabaseAdmin }) {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const existing = await supabase.from("os_operator_runs").select("id,status,created_at")
    .eq("workspace_id", input.workspaceId).eq("operator_key", GROWTH_OPERATOR_KEY)
    .in("status", ["pending", "running"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing.error) throw new Error("Growth run state is temporarily unavailable.");
  if (existing.data) return { runId: String(existing.data.id), reused: true, state: String(existing.data.status) };
  const runId = operatorRuntimeId("growth-run");
  const created = await supabase.from("os_operator_runs").insert({
    id: runId, workspace_id: input.workspaceId, operator_key: GROWTH_OPERATOR_KEY, trigger_type: "manual",
    status: "pending", input: { sourceMode: "manual", actor: input.actor }, output: {}, readiness: { governed: true }, risk_level: "medium",
  });
  if (created.error) throw new Error("Growth scan could not be queued.");
  return { runId, reused: false, state: "pending" };
}

export async function listGrowthStatus(input: { workspaceId: string; supabase?: SupabaseAdmin }) {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const [runs, opportunities, campaigns, approvals, outcomes, learnings] = await Promise.all([
    supabase.from("os_operator_runs").select("id,status,output,error,created_at,started_at,completed_at").eq("workspace_id", input.workspaceId).eq("operator_key", GROWTH_OPERATOR_KEY).order("created_at", { ascending: false }).limit(20),
    supabase.from("os_growth_opportunities").select("id,title,summary,evidence,trust_level,freshness_status,score,status,source_type,source_ref,updated_at").eq("workspace_id", input.workspaceId).order("updated_at", { ascending: false }).limit(50),
    supabase.from("os_growth_campaigns").select("id,opportunity_id,objective,status,created_at,updated_at,approved_at,exported_at,measured_at").eq("workspace_id", input.workspaceId).order("updated_at", { ascending: false }).limit(30),
    supabase.from("os_approvals").select("id,title,body,status,created_at,resolved_at,continuation_payload").eq("workspace_id", input.workspaceId).eq("agent_id", GROWTH_OPERATOR_KEY).order("created_at", { ascending: false }).limit(30),
    supabase.from("os_growth_outcomes").select("id,campaign_id,channel,outcome_type,value,attribution_level,attribution_source,observed_at").eq("workspace_id", input.workspaceId).order("observed_at", { ascending: false }).limit(30),
    supabase.from("os_growth_learnings").select("id,campaign_id,outcome_id,statement,evidence,trust_level,approval_status,applied_to_memory,created_at").eq("workspace_id", input.workspaceId).order("created_at", { ascending: false }).limit(30),
  ]);
  if ([runs, opportunities, campaigns, approvals, outcomes, learnings].some((result) => result.error)) throw new Error("Growth workspace state is temporarily unavailable.");
  return { runs: runs.data ?? [], opportunities: opportunities.data ?? [], campaigns: campaigns.data ?? [], approvals: approvals.data ?? [], outcomes: outcomes.data ?? [], learnings: learnings.data ?? [] };
}

export async function getGrowthOpportunity(input: { workspaceId: string; opportunityId: string; supabase?: SupabaseAdmin }): Promise<Opportunity | null> {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const result = await supabase.from("os_growth_opportunities").select("id,title,summary,evidence,trust_level,freshness_status,score,status,source_type,source_ref").eq("workspace_id", input.workspaceId).eq("id", input.opportunityId).maybeSingle();
  if (result.error) throw new Error("Growth opportunity is temporarily unavailable.");
  return result.data ? toOpportunity(result.data as Record<string, unknown>) : null;
}

export function buildCampaignContent(input: { opportunity: Opportunity; objective: string }) {
  const summary = bounded(input.opportunity.summary, 240);
  const evidenceRefs = input.opportunity.evidence.map((item) => {
    const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { source: String(value.source ?? input.opportunity.source_type), ref: String(value.observationId ?? input.opportunity.source_ref), trust: "observed" };
  }).slice(0, 10);
  const base = `A verified Website Knowledge observation suggests: ${summary}`;
  const channels = {
    x: { status: "draft", text: `${base} What would you want to explore next?` },
    linkedin: { status: "draft", text: `${base}\n\nWe are turning this signal into a practical conversation, not a claim of customer demand.` },
    founder_update: { status: "draft", text: `Founder note: ${base} Next step: validate the message with the owner before sharing.` },
    email_newsletter: { status: "draft", subject: "A useful next step", body: `${base}\n\nThis is a draft for review. It is not scheduled or sent.` },
    reusable_announcement: { status: "draft", text: `${base}\n\nReusable announcement draft — review evidence, audience, and claims before export.` },
  } satisfies Record<GrowthChannel, Record<string, string>>;
  return {
    objective: bounded(input.objective, 240), channels, evidenceRefs,
    governance: { websiteContent: "observed_untrusted", ownerMemoryUsedFor: "context_only", instructionsFromWebsite: false, externalPublishing: "unsupported_manual_export_only", requiresOwnerReview: true },
  };
}

export async function prepareGrowthCampaign(input: { workspaceId: string; opportunityId: string; objective: string; actor: string; supabase?: SupabaseAdmin }) {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const opportunity = await getGrowthOpportunity({ workspaceId: input.workspaceId, opportunityId: input.opportunityId, supabase });
  if (!opportunity) throw new Error("Growth opportunity not found.");
  if (opportunity.freshness_status !== "fresh") throw new Error("This opportunity is stale and must be rescanned before preparation.");
  if (opportunity.trust_level === "derived") throw new Error("Derived signals cannot be used as sole campaign evidence.");
  const objective = bounded(input.objective || "Validate the observed opportunity", 240);
  const existing = await supabase.from("os_growth_campaigns").select("id,status").eq("workspace_id", input.workspaceId).eq("opportunity_id", opportunity.id).eq("objective", objective).maybeSingle();
  if (existing.error) throw new Error("Growth campaign storage is temporarily unavailable.");
  if (existing.data) return { campaignId: String(existing.data.id), reused: true, status: String(existing.data.status) };
  const campaign = await supabase.from("os_growth_campaigns").insert({ workspace_id: input.workspaceId, opportunity_id: opportunity.id, objective, status: "draft", created_by: input.actor, metadata: { publication: "manual_export_only" } }).select("id").single();
  if (campaign.error || !campaign.data) {
    if (campaign.error?.code === "23505") {
      const concurrent = await supabase.from("os_growth_campaigns").select("id,status").eq("workspace_id", input.workspaceId).eq("opportunity_id", opportunity.id).eq("objective", objective).maybeSingle();
      if (concurrent.data) return { campaignId: String(concurrent.data.id), reused: true, status: String(concurrent.data.status) };
    }
    throw new Error("Growth campaign could not be prepared.");
  }
  const content = buildCampaignContent({ opportunity, objective });
  const contentHash = sha256(content);
  const revision = await supabase.from("os_growth_campaign_revisions").insert({ workspace_id: input.workspaceId, campaign_id: campaign.data.id, revision: 1, content, content_hash: contentHash, status: "pending_approval", created_by: input.actor }).select("id").single();
  if (revision.error || !revision.data) throw new Error("Growth campaign revision could not be stored.");
  const approvalId = operatorRuntimeId("growth-approval");
  const approval = await supabase.from("os_approvals").insert({
    id: approvalId, workspace_id: input.workspaceId, type: "growth_content_review", title: `Review Growth campaign: ${opportunity.title}`,
    body: "Review the prepared channel drafts and their evidence before export. No channel is published by Auterim.", agent_id: GROWTH_OPERATOR_KEY,
    agent_mark: GROWTH_AGENT_MARK, agent_color: GROWTH_AGENT_COLOR, run_id: null, status: "pending", dedupe_key: `growth:${campaign.data.id}:${contentHash}`,
    continuation_payload: { kind: "growth.content_review", workspaceId: input.workspaceId, operatorKey: GROWTH_OPERATOR_KEY, campaignId: campaign.data.id, revisionId: revision.data.id, contentHash, growthContent: content, publication: "manual_export_only", evidenceRefs: content.evidenceRefs, websiteContentTrust: "observed_untrusted" },
    policy_reason: "Growth content cannot be exported or externally published until an owner or admin reviews the immutable content hash.",
  });
  if (approval.error) {
    await supabase.from("os_growth_campaign_revisions").delete().eq("id", revision.data.id).eq("workspace_id", input.workspaceId);
    await supabase.from("os_growth_campaigns").delete().eq("id", campaign.data.id).eq("workspace_id", input.workspaceId);
    throw new Error("Growth approval could not be created.");
  }
  const revisionLink = await supabase.from("os_growth_campaign_revisions").update({ approval_id: approvalId }).eq("id", revision.data.id).eq("workspace_id", input.workspaceId);
  const campaignState = await supabase.from("os_growth_campaigns").update({ status: "pending_approval" }).eq("id", campaign.data.id).eq("workspace_id", input.workspaceId);
  if (revisionLink.error || campaignState.error) throw new Error("Growth campaign approval lineage could not be completed.");
  return { campaignId: String(campaign.data.id), revisionId: String(revision.data.id), approvalId, contentHash, status: "pending_approval", content };
}

export async function approveGrowthContentReview(input: { workspaceId: string; approvalId: string; resolvedBy: string; supabase?: SupabaseAdmin }) {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const approval = await supabase.from("os_approvals").select("id,status,workspace_id,continuation_payload").eq("id", input.approvalId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (approval.error || !approval.data) throw new Error("Growth approval not found.");
  const payload = approval.data.continuation_payload as Record<string, unknown>;
  const campaignId = String(payload.campaignId ?? "");
  const revisionId = String(payload.revisionId ?? "");
  const contentHash = String(payload.contentHash ?? "");
  if (payload.workspaceId !== input.workspaceId || !campaignId || !revisionId || !/^[0-9a-f]{64}$/.test(contentHash)) throw new Error("Growth approval lineage is invalid.");
  const revision = await supabase.from("os_growth_campaign_revisions").select("id,content_hash,status").eq("id", revisionId).eq("campaign_id", campaignId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (revision.error || !revision.data) throw new Error("Growth revision not found.");
  if (revision.data.content_hash !== contentHash) throw new Error("Growth content changed; review the new revision.");
  const revisionUpdate = await supabase.from("os_growth_campaign_revisions").update({ status: "approved" }).eq("id", revisionId).eq("workspace_id", input.workspaceId).eq("status", "pending_approval");
  if (revisionUpdate.error) throw new Error("Growth revision could not be approved.");
  const campaignUpdate = await supabase.from("os_growth_campaigns").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", campaignId).eq("workspace_id", input.workspaceId);
  if (campaignUpdate.error) throw new Error("Growth campaign could not be approved.");
  const approvalUpdate = await supabase.from("os_approvals").update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: input.resolvedBy }).eq("id", input.approvalId).eq("workspace_id", input.workspaceId).eq("status", "pending");
  if (approvalUpdate.error) throw new Error("Growth approval could not be resolved.");
  return { ok: true, status: "approved", campaignId, revisionId, contentHash, publication: "manual_export_only" };
}

export async function rejectGrowthContentReview(input: { workspaceId: string; approvalId: string; reason: string; resolvedBy: string; supabase?: SupabaseAdmin }) {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const approval = await supabase.from("os_approvals").select("continuation_payload").eq("id", input.approvalId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (approval.error || !approval.data) throw new Error("Growth approval not found.");
  const payload = approval.data.continuation_payload as Record<string, unknown>;
  const campaignId = String(payload.campaignId ?? "");
  const revisionId = String(payload.revisionId ?? "");
  if (payload.workspaceId !== input.workspaceId || !campaignId || !revisionId) throw new Error("Growth approval lineage is invalid.");
  await supabase.from("os_growth_campaign_revisions").update({ status: "rejected" }).eq("id", revisionId).eq("workspace_id", input.workspaceId).eq("status", "pending_approval");
  await supabase.from("os_growth_campaigns").update({ status: "draft", metadata: { rejectionReason: bounded(input.reason, 500), rejectedBy: input.resolvedBy } }).eq("id", campaignId).eq("workspace_id", input.workspaceId);
  return { ok: true, status: "rejected", campaignId, revisionId };
}

export async function recordGrowthOutcome(input: { workspaceId: string; campaignId: string; revisionId?: string; channel: string; outcomeType: string; value?: number | null; attributionLevel: string; attributionSource: string; evidence?: string[]; actor: string; supabase?: SupabaseAdmin }) {
  const supabase = input.supabase ?? createSupabaseAdmin();
  const campaign = await supabase.from("os_growth_campaigns").select("id,status").eq("workspace_id", input.workspaceId).eq("id", input.campaignId).maybeSingle();
  if (campaign.error || !campaign.data) throw new Error("Growth campaign not found.");
  if (!GROWTH_CHANNELS.includes(input.channel as GrowthChannel) && input.channel !== "other") throw new Error("Unsupported Growth channel.");
  const allowedAttribution = ["provider", "owner_confirmed", "manual", "derived"];
  if (!allowedAttribution.includes(input.attributionLevel)) throw new Error("Unsupported attribution level.");
  const created = await supabase.from("os_growth_outcomes").insert({ workspace_id: input.workspaceId, campaign_id: input.campaignId, revision_id: input.revisionId || null, channel: input.channel, outcome_type: input.outcomeType, value: input.value ?? null, attribution_level: input.attributionLevel, attribution_source: bounded(input.attributionSource, 240), evidence: (input.evidence ?? []).map((item) => bounded(item, 300)).slice(0, 20), created_by: input.actor }).select("id").single();
  if (created.error || !created.data) throw new Error("Growth outcome could not be recorded.");
  await supabase.from("os_growth_campaigns").update({ status: "measured", measured_at: new Date().toISOString() }).eq("id", input.campaignId).eq("workspace_id", input.workspaceId);
  const learning = await supabase.from("os_growth_learnings").insert({ workspace_id: input.workspaceId, campaign_id: input.campaignId, outcome_id: created.data.id, statement: `Observed ${input.outcomeType} on ${input.channel}; attribution remains ${input.attributionLevel}.`, evidence: input.evidence ?? [], trust_level: "derived", approval_status: "pending", applied_to_memory: false }).select("id").single();
  if (learning.error) throw new Error("Derived Growth learning could not be recorded.");
  return { outcomeId: String(created.data.id), learningId: learning.data ? String(learning.data.id) : null, attributionLevel: input.attributionLevel, learningTrust: "derived" };
}
