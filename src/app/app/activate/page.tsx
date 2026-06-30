"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import type { OnboardingState } from "@/lib/os/types";

type DemoPath = NonNullable<OnboardingState["preferredDemoPath"]>;
type StepState = "complete" | "needs_setup" | "optional" | "ready";

type StatusPayload = Record<string, unknown> & {
  setup?: Record<string, unknown>;
  gmail?: Record<string, unknown> | null;
  hubspot?: Record<string, unknown> | null;
  slack?: Record<string, unknown> | null;
  trello?: Record<string, unknown> | null;
  customerEmailMode?: string;
  revenueMode?: string;
  revenueModeMessage?: string;
  monitoring?: Record<string, unknown>;
};

const PATHS: Record<DemoPath, {
  label: string;
  operator: string;
  statusRoute: string;
  scanRoute: string;
  accent: string;
}> = {
  operations: {
    label: "Operations",
    operator: "Operations Operator",
    statusRoute: "/api/operators/operations/status",
    scanRoute: "/api/operators/operations/scan",
    accent: "#51D88A",
  },
  client_flow: {
    label: "Client Flow",
    operator: "Client Flow Operator",
    statusRoute: "/api/operators/client-flow/status",
    scanRoute: "/api/operators/client-flow/scan",
    accent: "#5B8DEF",
  },
  revenue: {
    label: "Revenue",
    operator: "Revenue Operator",
    statusRoute: "/api/operators/revenue/status",
    scanRoute: "/api/operators/revenue/scan",
    accent: "#4DE8E1",
  },
};

const TEST_COPY: Record<DemoPath, { title: string; body: string }> = {
  revenue: {
    title: "Revenue test email",
    body: `Subject:
Interested in Auterim for our agency

Body:
Hi Michel,

We are interested in using Auterim for our agency.

We manage client emails, sales follow-ups, Slack updates, Trello tasks and HubSpot deals manually. Could you show me how Auterim would help us keep this approval-first?

Best,
David`,
  },
  client_flow: {
    title: "Client Flow test email",
    body: `Subject:
Project update and homepage changes

Body:
Hi Michel,

Can you give me a quick update on the project?

Also, could you add the homepage changes to the task list? We want to make the hero section clearer and update the CTA before the next review.

Best,
David`,
  },
  operations: {
    title: "Operations Trello test",
    body: `Create a Trello card on the selected board/list:

Title:
Blocked: Homepage hero review

Description:
Waiting on final decision for the homepage CTA and hero copy.`,
  },
};

function boolValue(record: Record<string, unknown> | null | undefined, key: string): boolean {
  return Boolean(record && record[key] === true);
}

function numberFromScan(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  const direct = record.approvalsCreated;
  if (typeof direct === "number") return direct;
  const output = record.output;
  if (output && typeof output === "object" && typeof (output as Record<string, unknown>).approvalsCreated === "number") {
    return (output as Record<string, unknown>).approvalsCreated as number;
  }
  return 0;
}

function statusText(state: StepState): string {
  if (state === "complete") return "Complete";
  if (state === "optional") return "Optional";
  if (state === "ready") return "Ready";
  return "Needs setup";
}

function StepCard({
  index,
  title,
  description,
  state,
  cta,
  primary,
}: {
  index: number;
  title: string;
  description: string;
  state: StepState;
  cta?: { label: string; href?: string; onClick?: () => void; disabled?: boolean };
  primary?: boolean;
}) {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.026)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(77,232,225,0.08)", color: "#9DEFEA", fontFamily: "var(--font-mono)", fontSize: 11, flexShrink: 0 }}>{index}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 650 }}>{title}</div>
            <div style={{ color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{description}</div>
          </div>
        </div>
        <span className={`pill ${state === "complete" ? "pill-cyan" : state === "needs_setup" ? "pill-rose" : ""}`} style={{ whiteSpace: "nowrap" }}>
          {statusText(state)}
        </span>
      </div>
      {cta && (
        cta.href ? (
          <Link className={`btn ${primary ? "btn-primary" : "btn-ghost"} btn-sm`} href={cta.href} style={{ justifySelf: "start" }}>{cta.label}</Link>
        ) : (
          <button className={`btn ${primary ? "btn-primary" : "btn-ghost"} btn-sm`} disabled={cta.disabled} onClick={cta.onClick} style={{ justifySelf: "start", opacity: cta.disabled ? 0.55 : 1 }}>
            {cta.label}
          </button>
        )
      )}
    </div>
  );
}

export default function ActivationPage() {
  const { state, updateActivation } = useOS();
  const [path, setPath] = useState<DemoPath>(state.settings.activation?.preferredDemoPath ?? state.onboarding.preferredDemoPath ?? "operations");
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState("");

  const meta = PATHS[path];
  const identityParams = useMemo(() => new URLSearchParams({
    workspaceId: state.workspace.id,
    userId: state.currentUser.id,
    userEmail: state.currentUser.email,
  }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${PATHS[path].statusRoute}?${identityParams.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})) as StatusPayload & { error?: string; message?: string };
      if (!res.ok) throw new Error(json.message || json.error || "Activation status is not available yet.");
      setStatus(json);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Activation status is not available yet.");
    } finally {
      setLoading(false);
    }
  }, [identityParams, path]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const setup = status?.setup;
  const gmailReady = path === "revenue"
    ? boolValue(status?.capabilityReadiness as Record<string, unknown> | undefined, "emailExecutionReady")
    : boolValue(setup, "gmailReady");
  const hubspotConnected = boolValue(status?.hubspot, "connected");
  const slackConnected = boolValue(setup, "slackConnected");
  const slackChannelSelected = boolValue(setup, "slackChannelSelected");
  const trelloConnected = boolValue(setup, "trelloConnected");
  const trelloDestinationSet = boolValue(setup, "trelloDestinationSet");
  const coreReady = path === "revenue" ? gmailReady : boolValue(setup, "coreReady");
  const safeMode = (state.settings.approvalPolicy.customerEmailMode ?? "approval_required") === "approval_required";
  const pendingApprovals = Array.isArray(status?.monitoring?.recentPendingApprovals) ? status.monitoring.recentPendingApprovals.length : 0;
  const hasFirstRun = Boolean(state.settings.activation?.firstRunAt || status?.monitoring?.lastRunAt);
  const firstApprovalCreated = Boolean(state.settings.activation?.firstApprovalCreatedAt || pendingApprovals > 0);

  const steps = useMemo(() => {
    const result: Array<{
      title: string;
      description: string;
      state: StepState;
      cta?: { label: string; href?: string; onClick?: () => void; disabled?: boolean };
    }> = [];
    result.push({
      title: "Choose demo path",
      description: `${meta.label} is selected. You can switch paths without changing connector truth.`,
      state: "complete",
    });
    if (path === "operations") {
      result.push({
        title: "Connect required tools",
        description: "Operations needs Trello connected before it can inspect real project cards.",
        state: trelloConnected ? "complete" : "needs_setup",
        cta: trelloConnected ? undefined : { label: "Connect Trello", href: "/app/connectors?setup=trello" },
      });
      result.push({
        title: "Finish tool setup",
        description: "Select the Trello board and list where approved task updates should land.",
        state: trelloDestinationSet ? "complete" : "needs_setup",
        cta: trelloDestinationSet ? undefined : { label: "Select Trello board/list", href: "/app/connectors?setup=trello-project" },
      });
    }
    if (path === "client_flow") {
      result.push({
        title: "Connect required tools",
        description: "Client Flow needs Gmail for client context and Trello for approved task updates.",
        state: gmailReady && trelloConnected ? "complete" : "needs_setup",
        cta: !gmailReady ? { label: "Connect Gmail", href: "/app/connectors?setup=gmail" } : !trelloConnected ? { label: "Connect Trello", href: "/app/connectors?setup=trello" } : undefined,
      });
      result.push({
        title: "Finish tool setup",
        description: "Choose the Trello board and list for approved client task updates.",
        state: trelloDestinationSet ? "complete" : "needs_setup",
        cta: trelloDestinationSet ? undefined : { label: "Select Trello board/list", href: "/app/connectors?setup=trello-project" },
      });
    }
    if (path === "revenue") {
      result.push({
        title: "Connect required tools",
        description: "Revenue needs Gmail for inbox context and approved follow-up emails.",
        state: gmailReady ? "complete" : "needs_setup",
        cta: gmailReady ? undefined : { label: "Connect Gmail", href: "/app/connectors?setup=gmail" },
      });
      result.push({
        title: "Full CRM demo",
        description: hubspotConnected ? "HubSpot is connected for approved CRM updates." : "HubSpot is recommended for contact and deal updates. Gmail still shows email approval value.",
        state: hubspotConnected ? "complete" : "optional",
        cta: hubspotConnected ? undefined : { label: "Connect HubSpot", href: "/app/connectors?setup=hubspot" },
      });
    }
    result.push({
      title: "Optional team alerts",
      description: slackConnected && slackChannelSelected ? "Slack alerts are ready for internal approval updates." : "Connect Slack and choose a channel for internal approval alerts.",
      state: slackConnected && slackChannelSelected ? "complete" : "optional",
      cta: slackConnected && !slackChannelSelected
        ? { label: "Select Slack channel", href: "/app/connectors?setup=slack-channel" }
        : !slackConnected
          ? { label: "Connect Slack", href: "/app/connectors?setup=slack" }
          : undefined,
    });
    result.push({
      title: "Confirm safety mode",
      description: "Safe mode keeps customer emails and tool changes approval-first.",
      state: safeMode ? "complete" : "ready",
      cta: safeMode ? undefined : { label: "Open policies", href: "/app/policies" },
    });
    result.push({
      title: "Run first check",
      description: coreReady ? `Run ${meta.operator} against connected tools.` : "Finish required setup before running a real operator check.",
      state: hasFirstRun ? "complete" : coreReady ? "ready" : "needs_setup",
      cta: { label: scanBusy ? "Checking..." : `Run ${meta.label} check`, onClick: () => void runScan(), disabled: !coreReady || scanBusy },
    });
    result.push({
      title: "Review first approval",
      description: firstApprovalCreated ? "An approval is ready for review. Nothing executes until you approve it." : "After a signal is found, review the prepared action before anything sends.",
      state: firstApprovalCreated ? "ready" : "needs_setup",
      cta: { label: "Open approvals", href: "/app/approvals" },
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreReady, firstApprovalCreated, gmailReady, hasFirstRun, hubspotConnected, meta.label, meta.operator, path, safeMode, scanBusy, slackChannelSelected, slackConnected, trelloConnected, trelloDestinationSet]);

  const completedCount = steps.filter((step) => step.state === "complete").length;
  const primaryIndex = steps.findIndex((step) => step.state !== "complete" && step.cta);
  const progress = Math.round((completedCount / steps.length) * 100);

  async function runScan() {
    if (!coreReady || scanBusy) return;
    setScanBusy(true);
    setScanResult("");
    setError("");
    try {
      const res = await fetch(meta.scanRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: state.workspace.id,
          userId: state.currentUser.id,
          userEmail: state.currentUser.email,
          maxResults: 10,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string; error?: string }).message || (json as { error?: string }).error || "Operator check could not run.");
      const approvalsCreated = numberFromScan(json);
      const now = new Date().toISOString();
      updateActivation({
        preferredDemoPath: path,
        firstRunAt: state.settings.activation?.firstRunAt ?? now,
        ...(approvalsCreated > 0 ? { firstApprovalCreatedAt: now } : {}),
        ...(approvalsCreated > 0 ? { completedAt: state.settings.activation?.completedAt ?? now } : {}),
      });
      setScanResult(approvalsCreated > 0 ? `${approvalsCreated} approval${approvalsCreated === 1 ? "" : "s"} created.` : "Check completed. No approval signal was found.");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operator check could not run.");
    } finally {
      setScanBusy(false);
    }
  }

  const choosePath = (nextPath: DemoPath) => {
    setPath(nextPath);
    updateActivation({ preferredDemoPath: nextPath });
    setScanResult("");
  };

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Activation - {meta.label}</span>
          <h1>Get your first workflow ready</h1>
          <div className="os-page-sub">Connect the tools for your selected demo path, then run your first operator check.</div>
        </div>
        <div className="os-page-actions">
          <Link className="btn btn-ghost btn-sm" href="/app">Dashboard</Link>
          <Link className="btn btn-primary btn-sm" href="/app/connectors">Connectors</Link>
        </div>
      </div>

      {(error || scanResult) && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: error ? "rgba(242,118,124,0.08)" : "rgba(81,216,138,0.08)", boxShadow: `inset 0 0 0 1px ${error ? "rgba(242,118,124,0.18)" : "rgba(81,216,138,0.2)"}`, color: error ? "#ffaaaa" : "#9df5cc", fontSize: 12.5 }}>
          {error || scanResult}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div className="p">
          <div className="p-head">
            <h3>Activation checklist</h3>
            <span className="p-meta">{loading ? "Loading..." : `${completedCount}/${steps.length} complete`}</span>
          </div>
          <div style={{ padding: 16, display: "grid", gap: 10 }}>
            <div className="bar" style={{ height: 7 }}><span style={{ width: `${progress}%` }} /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              {(Object.keys(PATHS) as DemoPath[]).map((key) => (
                <button key={key} className={`appr-btn ${path === key ? "approve" : "edit"}`} onClick={() => choosePath(key)}>
                  {PATHS[key].label}
                </button>
              ))}
            </div>
            {steps.map((step, index) => (
              <StepCard key={step.title} index={index + 1} {...step} primary={index === primaryIndex} />
            ))}
          </div>
        </div>

        <aside style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div className="p">
            <div className="p-head">
              <h3>{TEST_COPY[path].title}</h3>
              <span className="p-meta">Copy only</span>
            </div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              <div style={{ color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.5 }}>
                Use this to create a real signal in your own inbox or Trello board. Auterim will not create it automatically.
              </div>
              <textarea
                className="os-input"
                readOnly
                value={TEST_COPY[path].body}
                style={{ minHeight: path === "operations" ? 180 : 280, resize: "vertical", lineHeight: 1.45 }}
              />
            </div>
          </div>
          <div className="p">
            <div className="p-head">
              <h3>Safety</h3>
              <span className="p-meta">Approval-first</span>
            </div>
            <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>
              Running a check only scans connected tools for signals. Emails, Slack messages, CRM writes and Trello task changes require approval before execution.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
