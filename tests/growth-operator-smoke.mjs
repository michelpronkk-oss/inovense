import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20260917_growth_operator.sql");
const runtime = read("src/lib/operators/growth/runtime.ts");
const scanRoute = read("src/app/api/operators/growth/scan/route.ts");
const approval = read("src/app/api/approvals/[id]/approve/route.ts");
const reject = read("src/app/api/approvals/[id]/reject/route.ts");
const page = read("src/app/app/agents/growth/page.tsx");

assert.match(migration, /begin;[\s\S]*commit;/i, "Growth migration is transactional");
assert.match(migration, /os_growth_opportunities[\s\S]*unique \(workspace_id, fingerprint\)/, "opportunities are workspace-scoped and deduplicated");
assert.match(migration, /os_growth_campaign_revisions[\s\S]*content_hash text[\s\S]*unique \(campaign_id, content_hash\)/, "campaign content hashes are immutable/deduplicated");
assert.match(migration, /approval_id text references public\.os_approvals/, "Growth reuses canonical approvals");
assert.match(migration, /trust_level text not null default 'derived' check \(trust_level = 'derived'\)/, "learning cannot be stored as owner truth");
assert.match(migration, /status in \('draft','pending_approval','approved','exported','measured','cancelled'\)/, "campaign lifecycle is explicit");
assert.match(migration, /alter table public\.%I enable row level security/, "all Growth tables enable RLS");
assert.match(migration, /public\.is_workspace_member\(workspace_id\)/, "RLS checks workspace membership");
assert.match(migration, /public\.workspace_role_key\(workspace_id\) in \('owner','admin'\)/, "Growth writes are admin/owner gated");
assert.match(migration, /declare\s+table_name text/i, "migration smoke catches the dynamic RLS loop dependency");

assert.match(runtime, /import "server-only"/, "Growth runtime is server-only");
assert.match(runtime, /os_website_observations[\s\S]*trust_level.*observed[\s\S]*freshness_status.*fresh/, "scan reads fresh observed Website evidence");
assert.match(runtime, /in\("review_status", \["pending", "kept_observed", "confirmed_owner", "edited_owner"\]\)/, "scan excludes dismissed/ignored Website observations");
assert.match(runtime, /workspace_id: input\.workspaceId/, "writes carry workspace attribution");
assert.match(runtime, /opportunityFromObservation[\s\S]*fingerprint: sha256/, "dedupe fingerprint is source-derived");
assert.match(runtime, /if \(existing\.data\?\.id\)/, "repeat scans refresh instead of duplicating opportunities");
assert.match(runtime, /websiteContent: "observed_untrusted"/, "Website content remains untrusted evidence");
assert.match(runtime, /instructionsFromWebsite: false/, "Website text cannot become executable instructions");
assert.match(runtime, /publication: "manual_export_only"/, "no fake external publishing connector");
assert.match(runtime, /approvalId.*contentHash/, "approval records carry revision/hash lineage");
assert.match(runtime, /trust_level: "derived"[\s\S]*approval_status: "pending"[\s\S]*applied_to_memory: false/, "learning remains derived and unapplied");
assert.match(runtime, /status: "pending"/, "scan runs are durable before Trigger dispatch");
assert.match(scanRoute, /growthOperatorScan\.trigger/, "manual scan dispatches through Trigger.dev");
assert.match(scanRoute, /admin: true/, "manual Growth actions are admin-gated server-side");
assert.match(approval, /continuationKind === "growth\.content_review"[\s\S]*approveGrowthContentReview/, "canonical approval route handles Growth reviews");
assert.match(reject, /rawContinuation\.kind === "growth\.content_review"[\s\S]*rejectGrowthContentReview/, "rejections remain visible and governed");
assert.match(page, /Run scan[\s\S]*Prepare campaign/, "Growth UI exposes the real scan-to-prepare loop");
assert.match(page, /Nothing was published/, "Growth UI states export-only behavior");

console.log("growth-operator-smoke: PASS");
