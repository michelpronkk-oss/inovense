"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import type { OnboardingState } from "@/lib/os/types";
import "./styles-onboarding.css";

type DemoPath = NonNullable<OnboardingState["preferredDemoPath"]>;
type SafetyMode = "safe" | "assisted";

const USE_CASES = ["Agency", "SaaS", "Service business", "Internal operations", "Other"] as const;

const DEMO_PATHS: Record<DemoPath, {
  label: string;
  operator: string;
  description: string;
  next: string;
}> = {
  operations: {
    label: "Operations",
    operator: "Operations Operator",
    description: "Start with Trello tasks and internal operating checks.",
    next: "Connect Trello, choose a board/list, then run an Operations check.",
  },
  client_flow: {
    label: "Client Flow",
    operator: "Client Flow Operator",
    description: "Start with client email context and approved task updates.",
    next: "Connect Gmail and Trello, then run a Client Flow check.",
  },
  revenue: {
    label: "Revenue",
    operator: "Revenue Operator",
    description: "Start with inbound lead follow-up and CRM context.",
    next: "Connect Gmail first. HubSpot unlocks the full CRM demo.",
  },
};

const SAFETY_MODES: Record<SafetyMode, { label: string; copy: string }> = {
  safe: {
    label: "Safe mode",
    copy: "Customer emails and tool changes wait for approval before anything sends or updates.",
  },
  assisted: {
    label: "Assisted autopilot",
    copy: "Operators can prepare more work automatically, while risky actions still require approval.",
  },
};

function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { state, completeOnboarding } = useOS();
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [useCase, setUseCase] = useState<(typeof USE_CASES)[number]>("Agency");
  const [demoPath, setDemoPath] = useState<DemoPath>("operations");
  const [approvalOwner, setApprovalOwner] = useState(state.currentUser.email || "");
  const [safetyMode, setSafetyMode] = useState<SafetyMode>("safe");
  const [error, setError] = useState("");

  const selectedPath = DEMO_PATHS[demoPath];
  const readiness = useMemo(() => {
    let score = 30;
    if (companyName.trim()) score += 25;
    if (approvalOwner.trim()) score += 20;
    if (demoPath) score += 15;
    if (safetyMode) score += 10;
    return Math.min(100, score);
  }, [approvalOwner, companyName, demoPath, safetyMode]);

  const submit = () => {
    const company = companyName.trim();
    const owner = approvalOwner.trim() || state.currentUser.email;
    if (!company) {
      setError("Add a company name to create the workspace.");
      return;
    }
    if (!owner) {
      setError("Add an approval owner so prepared actions have a reviewer.");
      return;
    }
    setError("");
    completeOnboarding({
      companyName: company,
      websiteUrl: normalizeWebsite(websiteUrl),
      companySize: "",
      industry: useCase,
      mainGoals: [selectedPath.label],
      preferredOperator: selectedPath.operator,
      preferredDemoPath: demoPath,
      safetyMode,
      approvalOwner: owner,
      initialConnectors: [],
    });
    router.replace("/app/activate?first=1");
  };

  return (
    <div className="ob" style={{ minHeight: "100vh" }}>
      <div className="ob-head">
        <div className="ob-brand">
          <svg width="16" height="16" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <g fill="#ECEFF3">
              <rect x="10" y="10" width="44" height="9" />
              <rect x="26" y="19" width="12" height="12" />
              <rect x="26" y="33" width="12" height="12" />
              <rect x="10" y="45" width="44" height="9" />
            </g>
          </svg>
          AUTERIM <span className="sub">/ first run</span>
        </div>
        <div className="ob-head-mid">
          <span>Setup</span>
          <div className="bar"><span style={{ width: `${readiness}%` }} /></div>
          <span>{readiness}%</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push("/")}>Exit</button>
      </div>

      <div className="ob-layout" style={{ gridTemplateColumns: "minmax(0, 1fr) 360px", maxWidth: 1180, margin: "0 auto", paddingTop: 34 }}>
        <main className="ob-main">
          <div className="ob-canvas">
            <section className="ob-step">
              <div className="ob-step-head">
                <span className="ob-step-tag">Auterim OS setup</span>
                <h2>Get your first workflow ready.</h2>
                <p className="lead">
                  Add the basics, choose a demo path, then connect the tools needed for your first real approval.
                </p>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label className="label">Company name</label>
                  <input className="input" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Auterim" />
                </div>
                <div className="field">
                  <label className="label">Website optional</label>
                  <input className="input" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="inovense.com" />
                </div>
                <div className="field">
                  <label className="label">Team / use case</label>
                  <select className="select" value={useCase} onChange={(event) => setUseCase(event.target.value as typeof useCase)}>
                    {USE_CASES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Approval owner</label>
                  <input className="input" value={approvalOwner} onChange={(event) => setApprovalOwner(event.target.value)} placeholder="michel@company.com" />
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="label" style={{ marginBottom: 10 }}>Preferred demo path</div>
                <div className="card-grid cols-3">
                  {(Object.keys(DEMO_PATHS) as DemoPath[]).map((key) => {
                    const option = DEMO_PATHS[key];
                    const selected = demoPath === key;
                    return (
                      <button key={key} className={`op-card ${selected ? "selected" : ""}`} onClick={() => setDemoPath(key)}>
                        <div className="op-head">
                          <span className="op-name">{option.label}</span>
                          {key === "operations" && <span className="rec-badge">Fastest</span>}
                        </div>
                        <div className="op-desc">{option.description}</div>
                        <div className="op-tools">{option.next}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="label" style={{ marginBottom: 10 }}>Safety mode</div>
                <div className="card-grid cols-2">
                  {(Object.keys(SAFETY_MODES) as SafetyMode[]).map((key) => {
                    const option = SAFETY_MODES[key];
                    const selected = safetyMode === key;
                    return (
                      <button key={key} className={`op-card ${selected ? "selected" : ""}`} onClick={() => setSafetyMode(key)}>
                        <div className="op-head">
                          <span className="op-name">{option.label}</span>
                          {key === "safe" && <span className="rec-badge">Default</span>}
                        </div>
                        <div className="op-desc">{option.copy}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="activation-note" style={{ marginTop: 22 }}>
                No tools are connected until you authorize them. Next, connect the tools needed for your first demo.
              </div>

              {error && <div style={{ marginTop: 14, color: "#ffaaaa", fontSize: 12.5 }}>{error}</div>}
            </section>
          </div>
        </main>

        <aside className="preview">
          <div className="pv-card pv-ready">
            <div className="pv-head"><span className="dot" /> First workflow</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{selectedPath.label}</div>
            <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.55 }}>{selectedPath.next}</div>
            <div className="checklist" style={{ marginTop: 16 }}>
              <div className={`ci ${companyName.trim() ? "on" : ""}`}><span className="ck">OK</span>Workspace named</div>
              <div className="ci on"><span className="ck">OK</span>Demo path selected</div>
              <div className={`ci ${approvalOwner.trim() ? "on" : ""}`}><span className="ck">OK</span>Approval owner set</div>
              <div className="ci on"><span className="ck">OK</span>{SAFETY_MODES[safetyMode].label}</div>
            </div>
          </div>
          <div className="pv-card">
            <div className="pv-head"><span className="dot" /> Safety</div>
            <div style={{ color: "var(--text-dim)", fontSize: 12.5, lineHeight: 1.55 }}>
              Review the prepared action before anything sends. Customer emails, CRM changes, Slack messages and Trello task changes stay approval-first.
            </div>
          </div>
        </aside>
      </div>

      <div className="actionbar">
        <div className="hint">Connectors come next</div>
        <div className="actionbar-mid">
          <button className="btn btn-primary btn-sm" onClick={submit}>Continue to activation</button>
        </div>
      </div>
    </div>
  );
}
