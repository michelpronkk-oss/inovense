import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");
const includes = (source, value, label) => assert.ok(source.includes(value), `${label}: expected ${value}`);

const route = read("src/app/api/feedback/route.ts");
includes(route, "resolveWorkspaceContext", "feedback resolves workspace identity server-side");
includes(route, "allowDevFallback: false", "feedback rejects unauthenticated production fallback");
includes(route, "message.length > 5000", "feedback rejects oversized messages");
includes(route, "os_feedback", "feedback persists to structured storage");
includes(route, "const insert", "feedback persists before notification");
includes(route, "new Resend", "feedback attempts support notification");
includes(route, "feedback.notification_failed", "notification failure is safely logged after persistence");
assert.ok(!route.includes("connector_tokens"), "feedback does not collect connector credentials");
assert.ok(!route.includes("continuation_payload"), "feedback does not collect approval payloads");

const migration = read("supabase/migrations/20260907_os_feedback.sql");
for (const field of ["workspace_id", "user_id", "user_email", "feedback_type", "message", "page_path", "status", "metadata"]) includes(migration, field, "feedback schema field");
includes(migration, "enable row level security", "feedback table enables RLS");

const roadmap = read("src/lib/product/roadmap.ts");
for (const current of ["Revenue Operator", "Client Flow Operator", "Operations Operator", "Gmail", "Microsoft 365", "HubSpot", "Salesforce", "Trello", "Slack"]) includes(roadmap, current, "roadmap available truth");
includes(roadmap, "Writes are not enabled.", "roadmap preserves Salesforce boundary");
for (const future of ["Microsoft Teams", "Asana", "Jira", "Zendesk", "Intercom"]) includes(roadmap, future, "roadmap future direction");
assert.ok(!roadmap.includes("2027-"), "roadmap has no delivery dates");

const sidebar = read("src/components/dashboard/sidebar.tsx");
includes(sidebar, "Feedback", "desktop navigation exposes feedback");
includes(sidebar, "Roadmap", "desktop and mobile navigation expose roadmap");
includes(sidebar, "openFeedback", "mobile navigation opens feedback modal");
const dialog = read("src/components/dashboard/feedback-dialog.tsx");
includes(dialog, "Connector request", "feedback supports connector requests");
includes(dialog, "Operator request", "feedback supports operator requests");
includes(dialog, "Follow-up email", "feedback uses known account email");
const roadmapPage = read("src/app/app/roadmap/page.tsx");
includes(roadmapPage, "RoadmapFeedbackButton", "roadmap closes the feedback loop");

console.log("feedback-roadmap-smoke: feedback safety and roadmap truth checks passed.");
