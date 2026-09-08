import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const now = new Date("2026-09-08T12:00:00.000Z");
const ago = (minutes) => new Date(now.getTime() - minutes * 60_000).toISOString();
const tmp = path.join("tests", ".tmp-operational-incidents");
fs.mkdirSync(tmp, { recursive: true });

try {
  const source = fs.readFileSync("src/lib/admin/operational-incidents.ts", "utf8");
  const code = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" }).code;
  const file = path.join(tmp, "incidents.mjs");
  fs.writeFileSync(file, code);
  const { deriveOperationalSnapshot, isTaskHeartbeatStale } = await import(`${pathToFileURL(path.resolve(file)).href}?v=${Math.random()}`);

  const facts = (overrides = {}) => ({
    connectors: [], credentials: [], providerOperations: [], operatorRuns: [], operatorTriggers: [], signals: [], signalSync: [], workflowSteps: [], approvals: [], executionIntents: [], taskHeartbeats: [], emailDeliveries: [], billingSubscriptions: [], billingEvents: [], availableSources: new Set(), ...overrides,
  });
  const node = (snapshot, id) => snapshot.nodes.find((item) => item.nodeId === id);
  const reason = (snapshot, code) => snapshot.incidents.find((item) => item.reasonCode === code);

  // 1. Healthy connector mapping.
  let snapshot = deriveOperationalSnapshot(facts({ connectors: [{ connectorKey: "jira", status: "connected", updatedAt: ago(1) }], providerOperations: [{ connectorKey: "jira", operation: "read", lastSuccessAt: ago(1), lastFailureAt: ago(10), failureKind: null, consecutiveFailures: 0, last429At: null, updatedAt: ago(1) }] }), now);
  assert.equal(node(snapshot, "connector-jira").status, "healthy");
  assert.equal(snapshot.incidents.some((item) => item.nodeKey === "connector-jira"), false);

  // 2-5. Canonical connector failure mappings.
  snapshot = deriveOperationalSnapshot(facts({ connectors: [{ connectorKey: "hubspot", status: "connected", updatedAt: ago(1) }], providerOperations: [{ connectorKey: "hubspot", operation: "oauth_refresh", lastSuccessAt: ago(30), lastFailureAt: ago(1), failureKind: "reauth", consecutiveFailures: 2, last429At: null, updatedAt: ago(1) }] }), now);
  assert.equal(node(snapshot, "connector-hubspot").status, "reconnect_required");
  assert.equal(reason(snapshot, "oauth_refresh_failed").severity, "warning");

  snapshot = deriveOperationalSnapshot(facts({ connectors: [{ connectorKey: "google_drive", status: "connected", updatedAt: ago(1) }], providerOperations: [{ connectorKey: "google_drive", operation: "read", lastSuccessAt: ago(30), lastFailureAt: ago(1), failureKind: "permission", consecutiveFailures: 1, last429At: null, updatedAt: ago(1) }] }), now);
  assert.equal(node(snapshot, "connector-google_drive").status, "permission_required");

  snapshot = deriveOperationalSnapshot(facts({ connectors: [{ connectorKey: "jira", status: "not_connected", updatedAt: ago(1) }] }), now);
  assert.equal(node(snapshot, "connector-jira").status, "configuration_required");

  snapshot = deriveOperationalSnapshot(facts({ connectors: [{ connectorKey: "jira", status: "connected", updatedAt: ago(1) }], providerOperations: [{ connectorKey: "jira", operation: "read", lastSuccessAt: ago(30), lastFailureAt: ago(1), failureKind: "transient", consecutiveFailures: 3, last429At: null, updatedAt: ago(1) }] }), now);
  assert.equal(node(snapshot, "connector-jira").status, "degraded");

  // 6. A real success clears prior degraded state because the canonical row's
  // consecutive counter is zero.
  snapshot = deriveOperationalSnapshot(facts({ connectors: [{ connectorKey: "jira", status: "connected", updatedAt: ago(1) }], providerOperations: [{ connectorKey: "jira", operation: "read", lastSuccessAt: ago(1), lastFailureAt: ago(20), failureKind: "transient", consecutiveFailures: 0, last429At: null, updatedAt: ago(1) }] }), now);
  assert.equal(node(snapshot, "connector-jira").status, "healthy");

  // 7. Planned architecture nodes are absent from the measured snapshot and
  // therefore cannot inflate incident counts.
  assert.equal(snapshot.nodes.some((item) => item.status === "planned"), false);

  // 8. Deliberately inactive operators are neutral, not incidents.
  snapshot = deriveOperationalSnapshot(facts({ operatorTriggers: [{ operatorKey: "revenue", enabled: false, updatedAt: ago(5) }], operatorRuns: [{ operatorKey: "revenue", status: "completed", createdAt: ago(20), updatedAt: ago(19) }] }), now);
  assert.equal(node(snapshot, "operator-revenue").status, "inactive");
  assert.equal(snapshot.incidents.some((item) => item.nodeKey === "operator-revenue"), false);

  // 9 and 17. Impact follows the conservative explicit connector/operator
  // graph and never claims unrelated operators are broken.
  snapshot = deriveOperationalSnapshot(facts({ connectors: [{ connectorKey: "jira", status: "connected", updatedAt: ago(1) }], providerOperations: [{ connectorKey: "jira", operation: "read", lastSuccessAt: ago(40), lastFailureAt: ago(1), failureKind: "reauth", consecutiveFailures: 2, last429At: null, updatedAt: ago(1) }] }), now);
  assert.deepEqual(reason(snapshot, "credential_revoked").affectedNodeKeys, ["operator-operations"]);

  // 10. Short queues are normal; an old candidate is a signal backlog.
  snapshot = deriveOperationalSnapshot(facts({ availableSources: new Set(["signals"]), signals: [{ status: "new", createdAt: ago(20), updatedAt: ago(20) }] }), now);
  assert.equal(reason(snapshot, "signal_backlog").nodeKey, "gov-signal-engine");

  // 11-12. Stuck workflows and uncertain execution are visible and safe.
  snapshot = deriveOperationalSnapshot(facts({ availableSources: new Set(["workflows"]), workflowSteps: [{ status: "executing", blockReason: null, createdAt: ago(50), updatedAt: ago(40) }] }), now);
  assert.equal(reason(snapshot, "workflow_stuck").nodeKey, "gov-workflow-runtime");
  snapshot = deriveOperationalSnapshot(facts({ availableSources: new Set(["workflows"]), workflowSteps: [{ status: "blocked", blockReason: "execution_unknown", createdAt: ago(20), updatedAt: ago(10) }] }), now);
  assert.equal(reason(snapshot, "execution_unknown").status, "blocked");

  // 13. Normal human approval wait is explicitly not an incident.
  snapshot = deriveOperationalSnapshot(facts({ availableSources: new Set(["approvals"]), approvals: [{ status: "pending", createdAt: ago(15), updatedAt: ago(15) }] }), now);
  assert.equal(node(snapshot, "gov-approvals").status, "healthy");

  // 14-15. Three missed windows is stale. A daily job at 25h is healthy.
  assert.equal(isTaskHeartbeatStale({ taskId: "workflow-recovery-scan", lastStartedAt: ago(60), lastSucceededAt: ago(60), lastFailedAt: null, lastSafeErrorCode: null, expectedCadenceMinutes: 15 }, now), true);
  assert.equal(isTaskHeartbeatStale({ taskId: "workspace-daily-brief", lastStartedAt: ago(25 * 60), lastSucceededAt: ago(25 * 60), lastFailedAt: null, lastSafeErrorCode: null, expectedCadenceMinutes: 24 * 60 }, now), false);

  // 18. The public snapshot shape cannot contain the raw/sensitive fields the
  // server query deliberately never selects.
  const serialized = JSON.stringify(snapshot);
  for (const forbidden of ["access_token", "refresh_token", "raw_payload", "email_body", "ticket_text", "document_text"]) assert.equal(serialized.includes(forbidden), false);

  const route = fs.readFileSync("src/app/api/admin/system-map/route.ts", "utf8");
  const canvas = fs.readFileSync("src/app/admin/system-map/SystemMapCanvas.tsx", "utf8");
  const live = fs.readFileSync("src/lib/admin/system-map-live.ts", "utf8");
  // 16, 19-21. Admin gate, issue focus, bounded hidden-tab polling, preserved
  // selection/viewport, and snapshot-failure handling are source contracts.
  assert.match(route, /requireInternalAdmin/);
  assert.match(canvas, /focusNode\(incident\.nodeKey\)/);
  assert.match(canvas, /document\.visibilityState === "visible"/);
  assert.match(canvas, /setInterval\([^]*60_000\)/);
  assert.match(canvas, /Preserve the last successful snapshot/);
  assert.match(canvas, /setLiveError\(true\)/);
  assert.doesNotMatch(canvas, /setSelectedId\(null\)[^]*refreshLive/);
  assert.match(live, /\.limit\(500\)/);
  assert.match(live, /node\.status === "planned"/);
  assert.match(live, /No reliable live health source/);
  assert.doesNotMatch(live, /access_token|refresh_token|raw_payload|body,title,message,content_preview/);

  console.log("Operational incidents smoke: canonical mapping, recovery, impact, staleness, safety, admin gating, and UI refresh contracts verified.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
