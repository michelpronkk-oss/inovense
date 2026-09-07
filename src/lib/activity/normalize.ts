import type { WorkforceActivityItem, WorkforceActivityPage, WorkforceActivitySummary } from "@/lib/activity/types";

type Row = Record<string, unknown>;

const asRecord = (value: unknown): Row => value && typeof value === "object" ? value as Row : {};
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;
const timestamp = (row: Row, fields: string[]) => fields.map((field) => text(row[field])).find((value): value is string => Boolean(value)) ?? null;
const operatorName = (key: string | null) => key ? key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Auterim";

function actionState(row: Row) {
  const payload = asRecord(row.continuation_payload);
  const result = asRecord(payload.executionResult);
  const action = asRecord(result.action);
  const prepared = asRecord(payload.preparedAction);
  const connectorKey = text(action.connectorKey) ?? text(prepared.connectorKey);
  const executed = text(result.gmailStatus) === "sent" || text(result.slackStatus) === "sent" || text(result.teamsStatus) === "sent" || text(result.trelloStatus) === "executed" || ["completed", "executed", "success"].includes(text(result.hubspotStatus) ?? "") || text(result.status) === "executed";
  const failed = text(row.status) === "failed" || text(result.status) === "failed" || text(result.teamsStatus) === "failed" || text(result.teamsStatus) === "blocked_by_policy";
  return { executed, failed, connectorKey: connectorKey ?? (result.teamsStatus ? "microsoft_teams" : null) };
}

/** A read-time projection: no payload fields that can contain customer content are serialized. */
export function normalizeWorkforceActivity(input: { approvals: Row[]; runs: Row[]; logs: Row[]; rangeStart: string; rangeEnd?: string; limit?: number }): WorkforceActivityPage {
  const start = new Date(input.rangeStart).getTime();
  const end = input.rangeEnd ? new Date(input.rangeEnd).getTime() : Date.now();
  const within = (value: string | null) => value !== null && Number.isFinite(new Date(value).getTime()) && new Date(value).getTime() >= start && new Date(value).getTime() <= end;
  const items: WorkforceActivityItem[] = [];

  for (const row of input.runs) {
    const occurredAt = timestamp(row, ["completed_at", "created_at"]);
    if (!within(occurredAt)) continue;
    const operatorKey = text(row.operator_key);
    const failed = text(row.status) === "failed" || text(row.status) === "error";
    items.push({ id: `run:${String(row.id)}`, occurredAt: occurredAt!, category: failed ? "failure" : "operator_run", title: failed ? `${operatorName(operatorKey)} run failed` : `${operatorName(operatorKey)} completed a run`, description: failed ? "The operator run did not complete. Technical details are available if you need them." : "The operator checked its connected workstream.", operatorKey, connectorKey: null, severity: failed ? "failure" : "success", status: text(row.status) ?? "completed", relatedRoute: failed ? "/logs" : "/agents", technicalEventId: String(row.id) });
  }

  for (const row of input.approvals) {
    const occurredAt = timestamp(row, ["resolved_at", "created_at"]);
    if (!within(occurredAt)) continue;
    const payload = asRecord(row.continuation_payload);
    const operatorKey = text(payload.operatorKey) ?? text(row.agent_id);
    const status = text(row.status) ?? "pending";
    const state = actionState(row);
    items.push({ id: `approval:${String(row.id)}`, occurredAt: occurredAt!, category: status === "failed" ? "failure" : "approval", title: status === "pending" ? "Approval requested" : status === "approved" ? "Approval approved" : status === "failed" ? "Approval failed" : "Approval updated", description: status === "pending" ? `${operatorName(operatorKey)} prepared work for review.` : `${operatorName(operatorKey)} approval was ${status.replace(/_/g, " ")}.`, operatorKey, connectorKey: state.connectorKey, severity: status === "pending" ? "attention" : status === "failed" ? "failure" : "success", status, relatedRoute: "/approvals", technicalEventId: String(row.id) });
    if (state.executed || state.failed) {
      items.push({ id: `execution:${String(row.id)}`, occurredAt: occurredAt!, category: state.failed ? "failure" : "execution", title: state.failed ? "Approved action failed" : "Approved action completed", description: state.failed ? "The approved action did not complete. Technical details are available if you need them." : "An approved action was completed under your workspace policy.", operatorKey, connectorKey: state.connectorKey, severity: state.failed ? "failure" : "success", status: state.failed ? "failed" : "completed", relatedRoute: state.failed ? "/logs" : "/approvals", technicalEventId: String(row.id) });
    }
  }

  // Only event names with a direct, user-relevant meaning are admitted from
  // technical logs. Their messages are deliberately never exposed here.
  for (const row of input.logs) {
    const event = text(row.event_type) ?? text(row.event);
    const occurredAt = timestamp(row, ["created_at", "occurred_at"]);
    if (!event || !within(occurredAt)) continue;
    const metadata = asRecord(row.metadata);
    const connectorKey = text(metadata.connectorKey);
    if (event.includes("connector_health")) {
      items.push({ id: `connector:${String(row.id ?? event)}`, occurredAt: occurredAt!, category: "connector", title: `${connectorKey ? operatorName(connectorKey) : "A connector"} needs attention`, description: "Reconnect this system so its dependent operators can continue using current context.", operatorKey: null, connectorKey, severity: "attention", status: "needs_attention", relatedRoute: "/connectors", technicalEventId: String(row.id ?? event) });
      continue;
    }
    if (!event.startsWith("policy_")) continue;
    const operatorKey = text(metadata.operatorKey);
    const denied = event.includes("blocked") || event.includes("denied") || event.includes("pause");
    const automatic = event.includes("allow_auto") || event.includes("auto_executed");
    items.push({
      id: `policy:${String(row.id ?? event)}`, occurredAt: occurredAt!, category: denied ? "failure" : "execution",
      title: denied ? "Action blocked by policy" : automatic ? "Action executed automatically" : "Action routed for approval",
      description: denied ? "Auterim stopped this action before it reached the connected system." : automatic ? "A low-risk action completed inside the active workspace boundary." : "The action is waiting for the required human review.",
      operatorKey, connectorKey, severity: denied ? "attention" : "success", status: denied ? "blocked" : automatic ? "completed" : "approval_required",
      relatedRoute: denied ? "/policies" : automatic ? null : "/approvals", technicalEventId: String(row.id ?? event),
    });
  }

  const sorted = items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  const visible = sorted.slice(0, input.limit ?? 40);
  return { items: visible, summary: summarizeWorkforceActivity(sorted, start, end), hasMore: sorted.length > visible.length, partialHistory: false };
}

export function summarizeWorkforceActivity(items: WorkforceActivityItem[], start: number, end: number): WorkforceActivitySummary {
  const days: Array<{ day: string; count: number }> = [];
  const dayCount = Math.max(1, Math.ceil((end - start) / 86400000));
  const cursor = new Date(end);
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - dayCount + 1);
  for (let index = 0; index < dayCount; index += 1, cursor.setUTCDate(cursor.getUTCDate() + 1)) days.push({ day: cursor.toISOString().slice(0, 10), count: 0 });
  const byDay = new Map(days.map((item) => [item.day, item]));
  for (const item of items) { const day = item.occurredAt.slice(0, 10); const bucket = byDay.get(day); if (bucket) bucket.count += 1; }
  return { runs: items.filter((item) => item.category === "operator_run").length, approvals: items.filter((item) => item.category === "approval").length, actions: items.filter((item) => item.category === "execution").length, issues: items.filter((item) => item.severity === "failure" || item.severity === "attention").length, total: items.length, daily: days };
}
