import assert from "node:assert/strict";
import fs from "node:fs";

// Confirms the durable transition from a routed Client Flow HubSpot
// candidate all the way through to visible, live-refreshing current work -
// the exact gap: a candidate reaching os_signal_candidates.status=routed
// never producing anything the Client Flow operator page could show, and the
// page never refreshing to pick up new work even if it had.
const handoff = fs.readFileSync("src/lib/operators/client-flow/hubspot-handoff.ts", "utf8");
const processor = fs.readFileSync("src/trigger/hubspot-webhook-process.ts", "utf8");
const runsRoute = fs.readFileSync("src/app/api/operators/runs/route.ts", "utf8");
const statusRoute = fs.readFileSync("src/app/api/operators/client-flow/status/route.ts", "utf8");
const page = fs.readFileSync("src/app/app/agents/client-flow/page.tsx", "utf8");

// The handoff writes to os_operator_runs, the exact table the Client Flow
// page's "Current work" runs list already reads (via /api/operators/runs).
assert.match(handoff, /os_operator_runs/);
assert.match(handoff, /operator_key: "client_flow"/);
assert.match(handoff, /trigger_type: "hubspot_deal_closed_won"/);

// The generic runs endpoint must not filter by trigger_type - it has to keep
// returning every client_flow run, including the new HubSpot handoff kind,
// without a HubSpot-specific carve-out in the API layer.
assert.doesNotMatch(runsRoute, /\.eq\("trigger_type"/, "the shared runs selector must stay provider-agnostic and not filter by trigger_type");
assert.match(runsRoute, /\.eq\("operator_key", operatorKey\)/);

// The status route's own runs query (used only for scan-summary monitoring
// stats) is intentionally scoped to trigger_type=gmail_scan and must stay
// that way - it is a different query from the one that powers "Current
// work", so it should not accidentally pick up (or need to know about) the
// HubSpot handoff run.
assert.match(statusRoute, /\.eq\("trigger_type", "gmail_scan"\)/);

// The page must poll/refresh like Revenue's operator page already does,
// instead of loading once on mount - otherwise newly materialized work is
// invisible until a manual reload.
assert.match(page, /loadRuntime = useCallback\(async \(background = false\)/);
assert.match(page, /window\.setInterval\(refresh, 15_000\)/);
assert.match(page, /document\.addEventListener\("visibilitychange", refresh\)/);

// The current-work row must render HubSpot-specific context (source, stage,
// amount) instead of the generic "Client Flow run" fallback, and must not
// invent fixture/demo data - all fields come from the live run row.
assert.match(page, /output\?\.type === "hubspot_client_handoff"/);
assert.match(page, /formatAmount\(run\.output\?\.amount, run\.output\?\.currency\)/);
assert.doesNotMatch(page, /"Northstar"|"Auterim rollout"|mockRun|fixtureRun/i, "no hardcoded/demo HubSpot data may appear in the component");

// Idempotency/concurrency: the handoff id must be derived only from
// workspace + deal, never from the specific webhook/provider-event id, so a
// replayed webhook or a racing dealstage + closedate pair converge on the
// same row instead of duplicating current work.
assert.doesNotMatch(handoff, /providerEventId|eventId/i, "the handoff identity must not depend on the specific webhook delivery");

console.log("HubSpot Client Flow visibility smoke: handoff table wiring, provider-agnostic runs selector, live refresh, non-fixture rendering, and deal-scoped idempotent identity verified.");
