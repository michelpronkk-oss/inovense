import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

// Runtime behavior tests for the pure parts of the Microsoft Teams connector.
//
// Same chain-load pattern as tests/connector-impact-smoke.mjs and
// tests/admin-system-map-smoke.mjs: the real source files are compiled with
// esbuild and dynamically imported, with only their Supabase/server-only
// imports replaced, so these assertions run against the actual shipped logic
// rather than a reimplementation. No live database and no live Microsoft
// Graph call is made anywhere in this file.

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-microsoft-teams-runtime-smoke");
const results = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function check(number, name, fn) {
  fn();
  results.push(number);
  console.log(`  ${number}. ${name}`);
}

async function loadModule(relSourcePath, replacements = []) {
  let source = read(relSourcePath);
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected to find this exact snippet in ${relSourcePath}:\n${search}`);
    source = source.replace(search, replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

function message(overrides = {}) {
  return {
    provider: "microsoft_teams",
    teamId: "team-1",
    channelId: "channel-1",
    messageId: "msg-1",
    replyToId: null,
    senderName: "Sam Rivera",
    senderId: "user-1",
    occurredAt: "2026-09-01T10:00:00Z",
    textPreview: "hello",
    webUrl: null,
    ...overrides,
  };
}

async function main() {
  try {
    const teams = await loadModule("src/lib/connectors/microsoft-teams.ts", [[
      `import {
  MICROSOFT_TEAMS_READ_SCOPES,
  MICROSOFT_TEAMS_SEND_SCOPES,
  MicrosoftReauthRequiredError,
  getMicrosoftCredential,
  resolveMicrosoftAccessToken,
  type StoredMicrosoftCredential,
} from "@/lib/connectors/microsoft";`,
      `const MICROSOFT_TEAMS_READ_SCOPES = ["Team.ReadBasic.All", "Channel.ReadBasic.All", "ChannelMessage.Read.All"];
const MICROSOFT_TEAMS_SEND_SCOPES = ["ChannelMessage.Send"];
class MicrosoftReauthRequiredError extends Error {}
const getMicrosoftCredential = async () => null;
const resolveMicrosoftAccessToken = async () => "test-token";`,
    ], [
      'import { createSupabaseAdmin } from "@/lib/server/supabase-admin";',
      "const createSupabaseAdmin = () => { throw new Error('no database in this test'); };",
    ]]);

    const signals = await loadModule("src/lib/signals/teams.ts", [[
      'import type { SafeTeamsMessage } from "@/lib/connectors/microsoft-teams";',
      "",
    ], [
      'import type { SignalCandidate, SignalEvent } from "@/lib/signals/types";',
      "",
    ]]);

    // ── Scope truth ─────────────────────────────────────────────────────

    check(1, "Microsoft 365 mail scopes alone never grant Teams", () => {
      const state = teams.getMicrosoftTeamsScopeState(["User.Read", "Mail.Read", "Mail.Send", "Calendars.ReadWrite"]);
      assert.equal(state.readGranted, false);
      assert.equal(state.sendGranted, false);
      assert.equal(state.missingScopes.length, 4);
    });

    check(2, "Teams read consent alone does not imply send consent", () => {
      const state = teams.getMicrosoftTeamsScopeState(["Team.ReadBasic.All", "Channel.ReadBasic.All", "ChannelMessage.Read.All"]);
      assert.equal(state.readGranted, true);
      assert.equal(state.sendGranted, false);
      assert.deepEqual(state.missingSendScopes, ["ChannelMessage.Send"]);
    });

    check(3, "Full Teams consent is recognized case-insensitively", () => {
      const state = teams.getMicrosoftTeamsScopeState(["team.readbasic.all", "channel.readbasic.all", "channelmessage.read.all", "channelmessage.send"]);
      assert.equal(state.readGranted, true);
      assert.equal(state.sendGranted, true);
      assert.deepEqual(state.missingScopes, []);
    });

    check(4, "Missing or malformed scope lists fail closed", () => {
      for (const input of [null, undefined, []]) {
        const state = teams.getMicrosoftTeamsScopeState(input);
        assert.equal(state.readGranted, false);
        assert.equal(state.sendGranted, false);
      }
    });

    // ── SSRF-safe pagination ────────────────────────────────────────────

    check(5, "Only the exact Microsoft Graph host may be followed", () => {
      assert.equal(teams.isSafeGraphNextLink("https://graph.microsoft.com/v1.0/teams/x/channels/y/messages?$skiptoken=abc"), true);
      for (const hostile of [
        "http://graph.microsoft.com/v1.0/x",
        "https://graph.microsoft.com.evil.example/v1.0/x",
        "https://evil.example/graph.microsoft.com",
        "https://attacker.example/v1.0/x",
        "https://169.254.169.254/latest/meta-data",
        "file:///etc/passwd",
        "//graph.microsoft.com/v1.0/x",
        "",
        null,
        undefined,
      ]) {
        assert.equal(teams.isSafeGraphNextLink(hostile), false, `must refuse ${String(hostile)}`);
      }
    });

    // ── Content sanitization ────────────────────────────────────────────

    check(6, "HTML message bodies are reduced to safe plain text", () => {
      const html = '<div>Deploy is <b>blocked</b><script>fetch("https://evil.example")</script><img src=x onerror=alert(1)>&amp; waiting on infra</div>';
      const text = teams.toSafeTeamsText(html, "html");
      assert.doesNotMatch(text, /<[^>]+>/, "no markup may survive");
      assert.doesNotMatch(text, /fetch\(|onerror|alert\(/, "no script or handler content may survive");
      assert.match(text, /Deploy is blocked/);
      assert.match(text, /& waiting on infra/, "entities must be decoded to text");
    });

    check(7, "Message text is length bounded", () => {
      const long = "blocked ".repeat(500);
      const text = teams.toSafeTeamsText(long, "text");
      assert.ok(text.length <= teams.TEAMS_MAX_TEXT_LENGTH + 3, "text must be truncated to the declared ceiling");
      assert.match(text, /\.\.\.$/, "truncation must be visible");
      assert.equal(teams.toSafeTeamsText("", "text"), null);
      assert.equal(teams.toSafeTeamsText(null), null);
    });

    check(8, "Only https Microsoft Teams links survive URL sanitization", () => {
      assert.equal(
        teams.toSafeTeamsWebUrl("https://teams.microsoft.com/l/message/19:abc/1700000000000"),
        "https://teams.microsoft.com/l/message/19:abc/1700000000000",
      );
      for (const hostile of [
        "javascript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "http://teams.microsoft.com/l/message/1",
        "https://phishing.example/teams.microsoft.com",
        "not a url",
        null,
      ]) {
        assert.equal(teams.toSafeTeamsWebUrl(hostile), null, `must drop ${String(hostile)}`);
      }
    });

    // ── Destination classification ──────────────────────────────────────

    check(9, "Only standard and private channels are provably internal", () => {
      assert.equal(teams.isExternalCapableMembershipType("standard"), false);
      assert.equal(teams.isExternalCapableMembershipType("private"), false);
      // Shared channels can be extended to federated external tenants, and an
      // unknown/absent type cannot be proven internal - both must be treated
      // as external so policy fails toward approval.
      assert.equal(teams.isExternalCapableMembershipType("shared"), true);
      assert.equal(teams.isExternalCapableMembershipType("unknown"), true);
      assert.equal(teams.isExternalCapableMembershipType(null), true);
      assert.equal(teams.isExternalCapableMembershipType(undefined), true);
    });

    // ── Teams settings storage on the shared Microsoft credential ───────

    check(10, "Teams settings default to disabled and read safely", () => {
      for (const metadata of [null, undefined, {}, { provider: "microsoft" }, { teams: "not-an-object" }]) {
        const settings = teams.readMicrosoftTeamsSettings(metadata);
        assert.equal(settings.enabled, false);
        assert.equal(settings.defaultTeamId, null);
        assert.deepEqual(settings.cursors, {});
      }
    });

    check(11, "Writing Teams settings preserves unrelated Microsoft metadata", () => {
      const metadata = { provider: "microsoft", kind: "microsoft365", tenantId: "tenant-abc" };
      const next = teams.writeMicrosoftTeamsSettings(metadata, { enabled: true, defaultTeamId: "team-1" });
      assert.equal(next.tenantId, "tenant-abc", "the customer tenant id must never be lost");
      assert.equal(next.kind, "microsoft365");
      assert.equal(next.teams.enabled, true);
      assert.equal(next.teams.defaultTeamId, "team-1");
    });

    check(12, "Disabling Teams clears its destination without touching Microsoft identity", () => {
      const enabled = teams.writeMicrosoftTeamsSettings(
        { provider: "microsoft", tenantId: "tenant-abc" },
        { enabled: true, defaultTeamId: "team-1", defaultChannelId: "channel-1" },
      );
      const disabled = teams.writeMicrosoftTeamsSettings(enabled, {
        enabled: false, defaultTeamId: null, defaultChannelId: null, cursors: {},
      });
      assert.equal(disabled.teams.enabled, false);
      assert.equal(disabled.teams.defaultChannelId, null);
      assert.equal(disabled.tenantId, "tenant-abc", "disabling Teams must not disturb the shared Microsoft credential metadata");
    });

    // ── Signal detection ────────────────────────────────────────────────

    check(13, "A Teams message normalizes into the shared signal shape", () => {
      const event = signals.normalizeTeamsMessageToSignalEvent({
        workspaceId: "ws-1",
        message: message({ textPreview: "Deploy is blocked and we are waiting on infra" }),
        teamName: "Delivery",
        channelName: "operations",
        channelMembershipType: "standard",
      });
      assert.equal(event.source, "microsoft_teams");
      assert.equal(event.sourceType, "team_chat");
      assert.equal(event.eventType, "teams.message.received");
      assert.equal(event.sourceId, "msg-1");
      assert.equal(event.metadata.channelMembershipType, "standard");
    });

    check(14, "Blocker language routes to Operations at high confidence", () => {
      const summary = signals.detectTeamsSignals({
        workspaceId: "ws-1",
        messages: [message({ messageId: "m-block", textPreview: "The release is blocked, we are stuck waiting on the vendor" })],
        channelName: "operations",
      });
      assert.equal(summary.blockers, 1);
      assert.equal(summary.candidates[0].operatorKey, "operations");
      assert.equal(summary.candidates[0].signalType, "teams_blocker");
      assert.equal(summary.candidates[0].confidence, "high");
    });

    check(15, "Explicit request language routes to Client Flow", () => {
      const summary = signals.detectTeamsSignals({
        workspaceId: "ws-1",
        messages: [message({ messageId: "m-ask", textPreview: "Can you follow up with the client, they asked for any update" })],
        channelName: "delivery",
      });
      assert.equal(summary.followUps, 1);
      assert.equal(summary.candidates[0].operatorKey, "client_flow");
      assert.equal(summary.candidates[0].signalType, "teams_follow_up_request");
    });

    check(16, "Ordinary channel chatter never becomes operator work", () => {
      const summary = signals.detectTeamsSignals({
        workspaceId: "ws-1",
        messages: [
          message({ messageId: "m-1", textPreview: "Good morning everyone" }),
          message({ messageId: "m-2", textPreview: "Thanks, the recording is available" }),
          message({ messageId: "m-3", textPreview: "Sam joined the team" }),
          message({ messageId: "m-4", textPreview: "Lunch at 12" }),
          message({ messageId: "m-5", textPreview: "urgent" }),
        ],
        channelName: "general",
      });
      assert.equal(summary.candidates.length, 0, "no chatter may become a candidate");
      assert.equal(summary.ignored, 5);
      assert.equal(summary.scanned, 5);
    });

    check(17, "Noise phrases suppress a message even when trigger words appear", () => {
      const summary = signals.detectTeamsSignals({
        workspaceId: "ws-1",
        messages: [message({ messageId: "m-noise", textPreview: "Thanks - the deploy was blocked but is unblocked now, meeting ended" })],
        channelName: "general",
      });
      assert.equal(summary.candidates.length, 0, "an explicit noise phrase must win over keyword matches");
    });

    check(18, "Dedupe keys are stable and provider-message-scoped", () => {
      const run = () => signals.detectTeamsSignals({
        workspaceId: "ws-1",
        messages: [message({ messageId: "m-block", textPreview: "This is blocked and stuck" })],
        channelName: "operations",
      }).candidates[0];
      const first = run();
      const second = run();
      assert.equal(first.dedupeKey, second.dedupeKey, "repeated scans must produce the same dedupe key");
      assert.equal(first.dedupeKey, "operations:microsoft_teams:message:m-block");
      assert.equal(first.id, second.id);
    });

    check(19, "Detected signals never carry raw message bodies", () => {
      const summary = signals.detectTeamsSignals({
        workspaceId: "ws-1",
        messages: [message({ messageId: "m-block", textPreview: "Customer secret: the release is blocked and stuck" })],
        channelName: "operations",
      });
      const serialized = JSON.stringify(summary.candidates);
      assert.doesNotMatch(serialized, /Customer secret/, "candidate metadata must not carry the message text");
    });

    check(20, "An empty Teams channel produces an empty, safe summary", () => {
      const summary = signals.detectTeamsSignals({ workspaceId: "ws-1", messages: [] });
      assert.deepEqual(summary, { scanned: 0, blockers: 0, followUps: 0, ignored: 0, candidates: [] });
    });

    // ── Central policy engine decisions for Teams writes ────────────────

    const { evaluatePolicy } = await loadModule("src/lib/policies/evaluate.ts", [[
      `import type {
  PolicyDecision,
  PolicyDecisionKind,
  PolicyEvaluationEntitlements,
  PolicyInput,
  PolicyWorkspaceSettings,
} from "@/lib/policies/types";`,
      "",
    ]]);

    const policy = (autonomyMode, overrides = {}) => ({
      autonomyMode,
      emergencyStopEnabled: false,
      customerEmailMode: "approval_required",
      internalSlackNotificationsAllowed: true,
      dailyBriefAllowed: true,
      connectorHealthChecksAllowed: true,
      lowRiskProjectToolCommentsAllowed: true,
      crmWritesRequireApproval: true,
      projectToolWritesRequireApproval: true,
      customerFacingActionsRequireApproval: true,
      maxAutonomousActionsPerHour: 10,
      maxAutonomousActionsPerDay: 50,
      ...overrides,
    });
    const teamsAction = (overrides = {}) => ({
      workspaceId: "ws-1",
      operatorKey: "operations",
      actionType: "send_teams_message",
      connectorKey: "microsoft_teams",
      capability: "chat.messages.send_after_approval",
      destinationType: "internal",
      riskLevel: "medium",
      confidence: "high",
      teamId: "team-1",
      channelId: "channel-1",
      ...overrides,
    });
    const live = { canRunRealActions: true, billingStatus: "active" };

    check(21, "A Teams message never auto-sends in any autonomy mode", () => {
      for (const mode of ["approval_first", "guarded", "autonomous"]) {
        const decision = evaluatePolicy(teamsAction(), policy(mode), live);
        assert.equal(decision.decision, "approval_required", `mode ${mode} must still require approval`);
        assert.equal(decision.canExecuteNow, false, `mode ${mode} must never be executable without review`);
        assert.equal(decision.matchedRuleId, "teams_message.approval_required");
      }
    });

    check(22, "Manual mode blocks Teams messages entirely", () => {
      const decision = evaluatePolicy(teamsAction(), policy("manual"), live);
      assert.equal(decision.decision, "blocked");
      assert.equal(decision.canExecuteNow, false);
    });

    check(23, "Emergency stop blocks Teams messages with a Teams-specific rule", () => {
      const decision = evaluatePolicy(teamsAction(), policy("autonomous", { emergencyStopEnabled: true }), live);
      assert.equal(decision.decision, "blocked");
      assert.equal(decision.matchedRuleId, "emergency.teams_message");
    });

    check(24, "An external or unproven Teams channel is still approval gated, at raised risk", () => {
      const decision = evaluatePolicy(teamsAction({ destinationType: "external", riskLevel: "high" }), policy("autonomous"), live);
      assert.equal(decision.decision, "approval_required");
      assert.equal(decision.riskLevel, "high");
      assert.equal(decision.matchedRuleId, "teams_message.approval_required");
    });

    check(25, "A low-risk Teams send is escalated, never treated like a Trello comment", () => {
      const decision = evaluatePolicy(teamsAction({ riskLevel: "low" }), policy("guarded"), live);
      assert.equal(decision.decision, "approval_required");
      assert.equal(decision.riskLevel, "medium", "Teams risk must never be evaluated below medium");
    });

    check(26, "Any action routed at the Teams connector is caught, even with a spoofed action type", () => {
      const decision = evaluatePolicy(
        teamsAction({ actionType: "add_task_comment", destinationType: "project_tool", riskLevel: "low" }),
        policy("autonomous"),
        live,
      );
      assert.equal(decision.decision, "approval_required", "connectorKey alone must be enough to force the Teams rule");
      assert.equal(decision.matchedRuleId, "teams_message.approval_required");
    });

    check(27, "Slack and Trello autonomy behavior is unchanged by the Teams rule", () => {
      const trelloComment = {
        workspaceId: "ws-1", operatorKey: "operations", actionType: "add_task_comment", connectorKey: "trello",
        destinationType: "project_tool", riskLevel: "low", confidence: "high",
      };
      assert.equal(evaluatePolicy(trelloComment, policy("guarded"), live).decision, "allow_auto", "the one existing guarded auto path must still work");
      const slackMessage = {
        workspaceId: "ws-1", operatorKey: "operations", actionType: "send_slack_message", connectorKey: "slack",
        destinationType: "internal", riskLevel: "low",
      };
      assert.equal(evaluatePolicy(slackMessage, policy("autonomous"), live).matchedRuleId, "internal_slack.approval_required");
    });

    assert.deepEqual(results, Array.from({ length: 27 }, (_, index) => index + 1));
    console.log("microsoft-teams-runtime-smoke: all 27 runtime checks passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
