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
for (const current of ["Revenue Operator", "Client Flow Operator", "Operations Operator", "Gmail", "Google Drive", "Microsoft 365", "HubSpot", "Salesforce", "Trello", "Slack", "Microsoft Teams"]) includes(roadmap, current, "roadmap available truth");
includes(roadmap, "Writes are not enabled.", "roadmap preserves Salesforce boundary");
// Microsoft Teams shipped, so it must appear exactly once and only as
// available - never duplicated across the planned/next lists.
assert.match(roadmap, /name: "Microsoft Teams", type: "connector", status: "available"/, "Microsoft Teams must be listed as an available connector");
assert.equal(roadmap.split('name: "Microsoft Teams"').length - 1, 1, "Microsoft Teams must appear exactly once in the roadmap");
assert.ok(!/name: "Microsoft Teams"[^\n]*status: "(next|exploring)"/.test(roadmap), "Microsoft Teams must not remain in the next/exploring roadmap lists");
for (const future of ["Asana", "Jira", "Intercom"]) includes(roadmap, future, "roadmap future direction");
assert.ok(!roadmap.includes("2027-"), "roadmap has no delivery dates");

const sidebar = read("src/components/dashboard/sidebar.tsx");
includes(sidebar, "Feedback", "desktop navigation exposes feedback");
includes(sidebar, "openFeedback", "mobile navigation opens feedback modal");
const appNavigation = read("src/lib/app-navigation.ts");
includes(appNavigation, 'label: "Roadmap"', "desktop and mobile navigation expose roadmap");
const dialog = read("src/components/dashboard/feedback-dialog.tsx");
includes(dialog, "Connector request", "feedback supports connector requests");
includes(dialog, "Operator request", "feedback supports operator requests");
includes(dialog, "Follow-up email", "feedback uses known account email");
const roadmapPage = read("src/app/app/roadmap/page.tsx");
includes(roadmapPage, "RoadmapFeedbackButton", "roadmap closes the feedback loop");

console.log("feedback-roadmap-smoke: feedback safety and roadmap truth checks passed.");
