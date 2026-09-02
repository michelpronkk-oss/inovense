"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { PlusIcon, FlowIcon, ZapIcon } from "@/components/dashboard/icons";
import { getSuggestedWorkflows, type SuggestedWorkflow } from "@/lib/os/workflow-recommendations";
import { getEntitlements } from "@/lib/os/entitlements";

function workflowToken(value: string): string {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function WorkflowsPage() {
  const router = useRouter();
  const { state, runWorkflow, appendExecutionLog, installSuggestedWorkflow } = useOS();
  const [tab, setTab] = useState("All");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [requirementsId, setRequirementsId] = useState<string | null>(null);

  const filtered = state.workflows.filter((w) => tab === "All" || w.status === tab.toLowerCase());
  const totalRuns = state.workflows.reduce((sum, w) => sum + w.totalRuns, 0);
  const avgSuccess = state.workflows.length > 0
    ? (state.workflows.reduce((sum, w) => sum + w.successRate, 0) / state.workflows.length).toFixed(1)
    : "0.0";

  const recentRuns = useMemo(() => {
    return state.agentRuns.slice(0, 5).map((r) => ({
      id: r.id,
      wf: state.workflows.find((w) => w.agentId === r.agentId)?.name ?? r.agentName,
      status: r.status,
      started: new Date(r.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      step: r.steps.find((s) => s.state === "active")?.name ?? (r.status === "completed" ? "Completed" : "Pending"),
    }));
  }, [state.agentRuns, state.workflows]);
  const suggestions = useMemo(() => getSuggestedWorkflows(state), [state]);
  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview" || !entitlements.canRunRealActions;
  const previewSuggestion = suggestions.find((s) => s.id === previewId) ?? null;
  const requirementsSuggestion = suggestions.find((s) => s.id === requirementsId) ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewId(null);
        setRequirementsId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onRefreshSuggestions = () => {
    appendExecutionLog("workflow.suggestions_refreshed", "Refreshed suggested workflows from workspace state");
  };

  const onInstallSuggestion = (suggestion: SuggestedWorkflow) => {
    if (suggestion.installStatus === "installed") return;
    if (suggestion.installStatus === "available") {
      installSuggestedWorkflow(suggestion);
      return;
    }
    setRequirementsId(suggestion.id);
  };

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Workflow engine - {state.workflows.filter((w) => w.status === "active").length} active</span>
          <h1>Workflows</h1>
          <div className="os-page-sub">{state.workflows.length} workflows - {totalRuns.toLocaleString()} total runs - {avgSuccess}% success rate</div>
          {isPreview && (
            <div style={{ marginTop: 8, color: "#9DEFEA", fontSize: 12.5 }}>
              Preview mode: run workflow demo executes mock actions only.
            </div>
          )}
        </div>
        <div className="os-page-actions">
          <button className="btn btn-ghost btn-sm" disabled aria-disabled="true" title="Templates are coming soon"><FlowIcon size={12} /> Templates</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.dispatchEvent(new Event("os:open-deploy"))}><PlusIcon size={12} /> Deploy agent</button>
        </div>
      </div>

      {state.workflows.length === 0 ? (
        <div className="p" style={{ padding: "18px" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No workflows yet</div>
          <div style={{ marginTop: 5, color: "var(--text-dim)", fontSize: 12.5 }}>Workflows connect operators, triggers and approved actions into repeatable processes.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
            <button className="btn btn-primary btn-sm" onClick={() => window.dispatchEvent(new Event("os:open-deploy"))}><PlusIcon size={12} /> Create workflow</button>
            <button className="btn btn-ghost btn-sm" disabled>Browse templates</button>
          </div>
        </div>
      ) : <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total workflows", val: String(state.workflows.length), sub: "live in workspace" },
          { label: "Total runs", val: totalRuns.toLocaleString(), sub: "all time" },
          { label: "Success rate", val: `${avgSuccess}%`, sub: "across all flows" },
          { label: "Pending approvals", val: String(state.approvals.filter((a) => a.status === "pending").length), sub: "requires review" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top"><span className="lab">{s.label}</span></div>
            <div className="kpi-val">{s.val}</div>
            <div className="kpi-meta"><span className="kpi-delta">{s.sub}</span></div>
          </div>
        ))}
      </div>}

      <div className="p" style={{ overflowX: "auto" }}>
        <div className="p-head">
          <h3><ZapIcon size={13} /> Recent runs</h3>
          <div className="p-meta"><span className="dot dot-cyan pulsing" /> {recentRuns.length} tracked</div>
        </div>
        <div>
          {recentRuns.length === 0 ? (
            <div style={{ padding: "22px 18px", color: "var(--text-mute)", fontSize: 13 }}>No workflow runs yet.</div>
          ) : (
            recentRuns.map((r) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 16, alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{r.wf}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{r.step}</div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>{r.id.slice(-6)}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>{r.started}</span>
                <div className="ops-card-status">
                  {r.status === "running" && <><span className="dot dot-cyan pulsing" /><span style={{ color: "var(--cyan)" }}>Running</span></>}
                  {r.status === "completed" && <><span className="dot" style={{ background: "var(--green)" }} /><span style={{ color: "var(--green)" }}>Complete</span></>}
                  {r.status === "awaiting_approval" && <><span className="dot dot-amber pulsing" /><span style={{ color: "var(--amber)" }}>Awaiting</span></>}
                  {r.status === "skipped" && <><span className="dot" style={{ background: "var(--text-faint)" }} /><span style={{ color: "var(--text-mute)" }}>Skipped</span></>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {(!isPreview || state.workflows.length > 0) && (
      <div className="p">
        <div className="p-head">
          <h3><FlowIcon size={13} /> Suggested workflows</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="p-meta">Generated from your workspace state</span>
            <button className="appr-btn edit" onClick={onRefreshSuggestions}>Refresh suggestions</button>
          </div>
        </div>
        <div className="workflow-suggestion-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, padding: "0 10px 10px" }}>
          {suggestions.length === 0 ? (
            <div style={{ padding: "18px", color: "var(--text-mute)", fontSize: 13 }}>
              No suggestions yet. Connect systems and deploy operators to generate recommendations.
            </div>
          ) : suggestions.slice(0, 3).map((s) => (
            <div key={s.id} style={{ padding: "13px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--cyan)", background: "var(--cyan-soft)", boxShadow: "inset 0 0 0 1px var(--cyan-line)", fontSize: 13, flexShrink: 0 }}>✦</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.title}</div>
                  <div style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-mute)" }}>{s.category} · {s.confidence}% confidence</div>
                </div>
              </div>
              <div style={{ fontSize: 12.2, color: "var(--text-dim)", lineHeight: 1.45 }}>{s.description}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-mute)" }}>
                {[s.requiredConnectors[0] ?? "Signal", s.requiredAgents[0] ?? "Operator", "Approval", s.requiredConnectors[1] ?? "Workspace"].map((step, index) => <span key={`${step}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ padding: "3px 6px", borderRadius: 5, background: "rgba(255,255,255,0.04)", color: "var(--text-dim)" }}>{workflowToken(step)}</span>{index < 3 && <span style={{ color: "var(--text-faint)" }}>→</span>}</span>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                <div><div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase" }}>Why now</div><div style={{ marginTop: 3, fontSize: 11.2, color: "var(--text-mute)" }}>{s.whySuggested}</div></div>
                <div><div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase" }}>Impact</div><div style={{ marginTop: 3, fontSize: 11.2, color: "var(--text-mute)" }}>{s.estimatedImpact}</div></div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                  <button className="appr-btn edit" onClick={() => setPreviewId(s.id)}>Preview</button>
                  <button
                    className={s.installStatus === "installed" ? "appr-btn edit" : "appr-btn approve"}
                    onClick={() => onInstallSuggestion(s)}
                    disabled={s.installStatus === "installed"}
                    style={{ opacity: s.installStatus === "installed" ? 0.5 : 1 }}
                  >{s.installStatus === "installed" ? "Deployed" : s.installStatus === "missing_agent" ? "Set up operator" : s.installStatus === "missing_connectors" ? "Connect tools" : "Deploy workflow"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="p" style={{ overflowX: "auto" }}>
        <div className="p-head">
          <h3><FlowIcon size={13} /> Workflow library</h3>
          <div style={{ display: "flex", gap: 4 }}>
            {["All", "Active", "Paused"].map((t) => (
              <span key={t} className="p-tabs">
                <span className={tab === t ? "active" : ""} onClick={() => setTab(t)} style={{ cursor: "pointer" }}>{t}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          {filtered.map((w) => (
            <div key={w.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 120px 90px 90px 90px auto", gap: 14, alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--line)", minWidth: 860 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${w.agentColor}15`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <FlowIcon size={13} style={{ color: w.agentColor }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{w.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{w.trigger} - {w.agentLabel}</div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>{w.lastRun}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>{w.avgDuration}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)" }}>{w.successRate}%</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-mute)" }}>{w.totalRuns.toLocaleString()} runs</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="appr-btn edit" onClick={() => router.push("/app/logs")}>View logs</button>
                <button className="appr-btn approve" onClick={() => runWorkflow(w.id)}>{isPreview ? "Run demo" : "Run live"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {previewSuggestion && (
        <div className="os-modal-backdrop" onClick={() => setPreviewId(null)}>
          <div className="os-modal" style={{ width: "min(860px, 94vw)", maxHeight: "86vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>{previewSuggestion.title}</h3>
              <button className="appr-btn deny" onClick={() => setPreviewId(null)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{previewSuggestion.description}</div>
              <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}><strong style={{ color: "var(--text-dim)" }}>Why suggested:</strong> {previewSuggestion.whySuggested}</div>
              <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}><strong style={{ color: "var(--text-dim)" }}>Required tools:</strong> {previewSuggestion.requiredConnectors.join(", ") || "None"}</div>
              <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}><strong style={{ color: "var(--text-dim)" }}>Required operators:</strong> {previewSuggestion.requiredAgents.join(", ") || "None"}</div>
              <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}><strong style={{ color: "var(--text-dim)" }}>Policy checks:</strong> {previewSuggestion.requiredPolicies.join(", ") || "None"}</div>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Plan preview</div>
                {previewSuggestion.previewSteps.map((step, index) => (
                  <div key={step} style={{ fontSize: 12, color: "var(--text-dim)" }}>{index + 1}. {step}</div>
                ))}
              </div>
              <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}><strong style={{ color: "var(--text-dim)" }}>Expected output:</strong> {previewSuggestion.expectedOutput}</div>
              <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}>
                <strong style={{ color: "var(--text-dim)" }}>Approval required for:</strong> {previewSuggestion.requiresApprovalFor.join(", ") || "None"}
              </div>
              <div style={{ fontSize: 11.8, color: "var(--text-mute)" }}>
                <strong style={{ color: "var(--text-dim)" }}>Logged events:</strong> workflow.run_started, workflow.step_completed, workflow.step_failed, workflow.run_completed
              </div>
            </div>
          </div>
        </div>
      )}

      {requirementsSuggestion && (
        <div className="os-modal-backdrop" onClick={() => setRequirementsId(null)}>
          <div className="os-modal" style={{ width: "min(680px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>Missing requirements</h3>
              <button className="appr-btn deny" onClick={() => setRequirementsId(null)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                {requirementsSuggestion.title} needs additional setup before install.
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)", display: "grid", gap: 6 }}>
                {requirementsSuggestion.missingRequirements.map((item) => (
                  <div key={item} style={{ fontSize: 12, color: "var(--text-mute)" }}>{item}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="appr-btn edit" onClick={() => router.push("/app/connectors")}>Open connectors</button>
                <button className="appr-btn edit" onClick={() => router.push("/app/agents")}>Open operators</button>
                <button className="appr-btn edit" onClick={() => router.push("/app/policies")}>Open policies</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
