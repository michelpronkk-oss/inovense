"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOS } from "@/lib/os/app-provider";
import type { OnboardingState } from "@/lib/os/types";

type DemoPath = NonNullable<OnboardingState["preferredDemoPath"]>;
type StepState = "complete" | "needs_setup" | "optional" | "ready";
type StepKey = "path" | "connect" | "configure" | "run" | "review";

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

export default function ActivationPage() {
  const { state, updateActivation } = useOS();
  const [path, setPath] = useState<DemoPath>(state.settings.activation?.preferredDemoPath ?? state.onboarding.preferredDemoPath ?? "operations");
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [selectedStep, setSelectedStep] = useState<StepKey>("path");

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
  const trelloConnected = boolValue(setup, "trelloConnected");
  const trelloDestinationSet = boolValue(setup, "trelloDestinationSet");
  const coreReady = path === "revenue" ? gmailReady : boolValue(setup, "coreReady");
  const safeMode = (state.settings.approvalPolicy.customerEmailMode ?? "approval_required") === "approval_required";
  const pendingApprovals = Array.isArray(status?.monitoring?.recentPendingApprovals) ? status.monitoring.recentPendingApprovals.length : 0;
  const hasFirstRun = Boolean(state.settings.activation?.firstRunAt || status?.monitoring?.lastRunAt);
  const firstApprovalCreated = Boolean(state.settings.activation?.firstApprovalCreatedAt || pendingApprovals > 0);

  const steps = useMemo(() => {
    const connectReady = path === "operations" ? trelloConnected : path === "client_flow" ? gmailReady && trelloConnected : gmailReady;
    const connectCta = path === "operations"
      ? { label: "Connect Trello", href: "/app/connectors?setup=trello" }
      : path === "client_flow"
        ? (!gmailReady ? { label: "Connect Gmail", href: "/app/connectors?setup=gmail" } : { label: "Connect Trello", href: "/app/connectors?setup=trello" })
        : { label: "Connect Gmail", href: "/app/connectors?setup=gmail" };
    const configureReady = path === "operations" || path === "client_flow" ? trelloDestinationSet : safeMode;
    return [
      { key: "path" as StepKey, title: "Choose path", short: meta.label, description: "Choose the operating lane Auterim should prepare first.", state: "complete" as StepState },
      { key: "connect" as StepKey, title: "Connect tools", short: connectReady ? "Ready" : "Required", description: path === "revenue" ? "Connect Gmail for inbox context and approval-gated follow-up." : path === "client_flow" ? "Connect Gmail and Trello for client context and approved task updates." : "Connect Trello before inspecting real project cards.", state: connectReady ? "complete" as StepState : "needs_setup" as StepState, cta: connectReady ? undefined : connectCta },
      { key: "configure" as StepKey, title: "Configure tools", short: configureReady ? "Ready" : "Required", description: path === "revenue" ? "Confirm approval-first controls before running the first check." : "Choose where approved task updates should land.", state: configureReady ? "complete" as StepState : "needs_setup" as StepState, cta: configureReady ? undefined : path === "revenue" ? { label: "Open policies", href: "/app/policies" } : { label: "Select Trello board/list", href: "/app/connectors?setup=trello-project" } },
      { key: "run" as StepKey, title: "Run first check", short: hasFirstRun ? "Complete" : coreReady ? "Ready" : "Blocked", description: coreReady ? `Run ${meta.operator} against connected tools.` : "Finish required setup before running a real operator check.", state: hasFirstRun ? "complete" as StepState : coreReady ? "ready" as StepState : "needs_setup" as StepState, cta: { label: scanBusy ? "Checking..." : `Run ${meta.label} check`, onClick: () => void runScan(), disabled: !coreReady || scanBusy } },
      { key: "review" as StepKey, title: "Review first approval", short: firstApprovalCreated ? "Ready" : "Pending", description: firstApprovalCreated ? "Review the prepared action before anything executes." : "Your first approval will appear here after a signal is found.", state: firstApprovalCreated ? "ready" as StepState : "needs_setup" as StepState, cta: { label: "Open approvals", href: "/app/approvals" } },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreReady, firstApprovalCreated, gmailReady, hasFirstRun, meta.label, meta.operator, path, safeMode, scanBusy, trelloConnected, trelloDestinationSet]);

  const completedCount = steps.filter((step) => step.state === "complete").length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const firstIncompleteIndex = Math.max(0, steps.findIndex((step) => step.state !== "complete"));
  const selectedIndex = Math.max(0, steps.findIndex((step) => step.key === selectedStep));
  const activeIndex = selectedIndex <= firstIncompleteIndex ? selectedIndex : firstIncompleteIndex;
  const activeStep = steps[activeIndex];

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
          <span className="os-greet">Activation</span>
          <h1>Set up your first operator workflow</h1>
          <div className="os-page-sub">Set up your first operator workflow in a few clear steps.</div>
        </div>
        <div className="os-page-actions">
          <Link className="btn btn-ghost btn-sm" href="/app">Dashboard</Link>
          <Link className="btn btn-ghost btn-sm" href="/app/connectors">Connectors</Link>
        </div>
      </div>

      {(error || scanResult) && (
        <div role={error ? "alert" : "status"} style={{ padding: "10px 12px", borderRadius: 10, background: error ? "rgba(242,118,124,0.08)" : "rgba(81,216,138,0.08)", boxShadow: `inset 0 0 0 1px ${error ? "rgba(242,118,124,0.18)" : "rgba(81,216,138,0.2)"}`, color: error ? "#ffaaaa" : "#9df5cc", fontSize: 12.5 }}>
          {error || scanResult}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "2px 2px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="pill pill-cyan">{loading ? "Checking progress" : `${completedCount} of ${steps.length} complete`}</span>
          <span style={{ color: "var(--text-dim)", fontSize: 12.5 }}>Path: {meta.label}</span>
        </div>
        <span className="pill">Approval-first</span>
      </div>

      <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }} aria-label={`${progress}% complete`}>
        <span style={{ display: "block", height: "100%", width: `${progress}%`, borderRadius: 999, background: "linear-gradient(90deg, #4DE8E1, #6ce7bb)", transition: "width 240ms ease" }} />
      </div>

      <nav aria-label="Activation steps" style={{ overflowX: "auto", padding: "8px 2px 10px" }}>
        <div className="activation-stepper" style={{ display: "flex", minWidth: 680, maxWidth: 900, margin: "0 auto", alignItems: "flex-start" }}>
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const canSelect = index <= firstIncompleteIndex;
            return (
              <div key={step.key} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
                <button
                  type="button"
                  onClick={() => canSelect && setSelectedStep(step.key)}
                  disabled={!canSelect}
                  aria-current={isActive ? "step" : undefined}
                  style={{ border: 0, background: "transparent", color: isActive ? "#F4FFFF" : step.state === "complete" ? "#A8EDE4" : "var(--text-faint)", cursor: canSelect ? "pointer" : "default", display: "grid", justifyItems: "center", gap: 7, padding: "5px 6px", minWidth: 106, font: "inherit" }}
                >
                  <span style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", border: `1px solid ${isActive ? "#4DE8E1" : step.state === "complete" ? "rgba(95,211,168,0.55)" : "rgba(255,255,255,0.12)"}`, background: isActive ? "rgba(77,232,225,0.13)" : step.state === "complete" ? "rgba(95,211,168,0.08)" : "rgba(255,255,255,0.025)", color: isActive ? "#4DE8E1" : "inherit", fontSize: 12, fontFamily: "var(--font-mono)" }}>{step.state === "complete" ? "✓" : index + 1}</span>
                  <span style={{ fontSize: 11.5, whiteSpace: "nowrap", fontWeight: isActive ? 650 : 500 }}>{step.title}</span>
                </button>
                {index < steps.length - 1 && <span aria-hidden style={{ height: 1, flex: 1, margin: "20px 3px 0", background: index < firstIncompleteIndex ? "rgba(95,211,168,0.4)" : "rgba(255,255,255,0.1)" }} />}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="activation-content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.55fr) minmax(240px, 0.75fr)", gap: 16, alignItems: "start" }}>
        <section className="p" aria-labelledby="active-step-title" style={{ minHeight: 300 }}>
          <div style={{ padding: "24px 24px 8px" }}>
            <span className="p-meta">Step {activeIndex + 1} · {statusText(activeStep.state)}</span>
            <h2 id="active-step-title" style={{ margin: "8px 0 7px", fontSize: 22, letterSpacing: "-0.02em" }}>{activeStep.title}</h2>
            <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.55, maxWidth: 540 }}>{activeStep.description}</p>
          </div>
          <div style={{ padding: "18px 24px 25px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gap: 16 }}>
            {activeStep.key === "path" && (
              <div style={{ display: "grid", gap: 9 }}>
                {(Object.keys(PATHS) as DemoPath[]).map((key) => (
                  <button key={key} type="button" onClick={() => choosePath(key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", gap: 12, padding: "13px 14px", borderRadius: 10, border: `1px solid ${path === key ? PATHS[key].accent : "rgba(255,255,255,0.09)"}`, background: path === key ? `${PATHS[key].accent}12` : "rgba(255,255,255,0.018)", color: "var(--text)", cursor: "pointer", font: "inherit" }}>
                    <span><span style={{ display: "block", fontSize: 13.5, fontWeight: 650 }}>{PATHS[key].label}</span><span style={{ display: "block", marginTop: 3, color: "var(--text-dim)", fontSize: 12 }}>Start with the {PATHS[key].label.toLowerCase()} operating lane.</span></span>
                    <span style={{ color: path === key ? PATHS[key].accent : "var(--text-faint)", fontSize: 16 }}>{path === key ? "✓" : "→"}</span>
                  </button>
                ))}
              </div>
            )}
            {activeStep.key !== "path" && activeStep.cta && ("href" in activeStep.cta ? <Link className="btn btn-primary" href={activeStep.cta.href}>{activeStep.cta.label}</Link> : <button className="btn btn-primary" onClick={activeStep.cta.onClick} disabled={activeStep.cta.disabled}>{activeStep.cta.label}</button>)}
            {activeStep.key === "connect" && path === "revenue" && hubspotConnected && <span style={{ color: "var(--text-dim)", fontSize: 12 }}>HubSpot is connected for the full CRM workflow.</span>}
            {activeStep.key === "configure" && path === "revenue" && !safeMode && <span style={{ color: "#ffb2ae", fontSize: 12 }}>Approval-first mode must be enabled before running a check.</span>}
            {activeStep.key === "review" && firstApprovalCreated && <span style={{ color: "var(--text-dim)", fontSize: 12 }}>Nothing executes until you approve it.</span>}
          </div>
        </section>

        <aside className="p" style={{ padding: 20, display: "grid", gap: 16 }} aria-label="Activation context">
          <div>
            <span className="p-meta">What happens next</span>
            <h3 style={{ margin: "7px 0 6px", fontSize: 15 }}>A controlled first run</h3>
            <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>{activeStep.key === "run" ? `Auterim will scan the connected tools for ${meta.label.toLowerCase()} signals and prepare work for review.` : activeStep.key === "review" ? "Review the prepared action in Approvals. External actions stay paused until you approve them." : "Complete this step and Auterim will guide you to the next part of the setup."}</p>
          </div>
          <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="p-meta">Safety</span>
            <p style={{ margin: "7px 0 0", color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>Approval-first mode keeps customer emails, CRM writes, Slack messages, and Trello changes behind review.</p>
          </div>
          {activeStep.key === "run" && <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)" }}><span className="p-meta">Example input</span><p style={{ margin: "7px 0 0", color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>Use the {TEST_COPY[path].title.toLowerCase()} example when you are ready to create a real test signal.</p></div>}
        </aside>
      </div>
    </div>
  );
}
