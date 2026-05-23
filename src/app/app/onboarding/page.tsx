"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import "./styles-onboarding.css";

const STEPS = [
  { id: "welcome", name: "Welcome", short: "00" },
  { id: "workspace", name: "Create workspace", short: "01" },
  { id: "focus", name: "Operating focus", short: "02" },
  { id: "connectors", name: "Connect tools", short: "03" },
  { id: "operator", name: "First operator", short: "04" },
  { id: "boundaries", name: "Boundaries and policy", short: "05" },
  { id: "memory", name: "Company memory", short: "06" },
  { id: "review", name: "Review and launch", short: "07" },
  { id: "success", name: "Live", short: "08" },
] as const;

const CONNECTOR_OPTIONS = [
  { id: "gmail", name: "Gmail", req: "Required for Revenue path" },
  { id: "outlook", name: "Outlook", req: "Email alternative" },
  { id: "hubspot", name: "HubSpot", req: "Required for Revenue path" },
  { id: "salesforce", name: "Salesforce", req: "CRM alternative" },
  { id: "slack", name: "Slack", req: "Required for internal summary" },
  { id: "google-calendar", name: "Google Calendar", req: "Scheduling flows" },
  { id: "notion", name: "Notion", req: "Memory and docs" },
  { id: "google-drive", name: "Google Drive", req: "Files and content context" },
] as const;

const OPERATOR_OPTIONS = [
  "Revenue Operator",
  "Marketing Operator",
  "Client Flow Operator",
  "Operations Operator",
  "Support Operator",
] as const;

type FormState = {
  companyName: string;
  websiteUrl: string;
  companySize: string;
  industry: string;
  mainGoals: string[];
  preferredOperator: (typeof OPERATOR_OPTIONS)[number];
  approvalOwner: string;
  initialConnectors: string[];
  memoryDescription: string;
};

const INITIAL_STATE: FormState = {
  companyName: "",
  websiteUrl: "",
  companySize: "11-50",
  industry: "Software",
  mainGoals: ["Lead qualification"],
  preferredOperator: "Revenue Operator",
  approvalOwner: "",
  initialConnectors: ["gmail", "hubspot", "slack"],
  memoryDescription: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useOS();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState("");

  const readiness = useMemo(() => {
    let p = 0;
    if (form.companyName) p += 18;
    if (form.mainGoals.length) p += 14;
    if (form.initialConnectors.length) p += Math.min(22, form.initialConnectors.length * 4);
    if (form.preferredOperator) p += 12;
    if (form.approvalOwner) p += 14;
    if (form.memoryDescription) p += 12;
    if (step >= 7) p = 98;
    if (step === 8) p = 100;
    return Math.min(100, p);
  }, [form, step]);

  const connectedCount = form.initialConnectors.length;
  const canContinue = () => {
    if (step === 1) return form.companyName.trim() && form.websiteUrl.trim() && form.approvalOwner.trim();
    if (step === 3) return form.initialConnectors.length > 0;
    return true;
  };

  const next = () => {
    if (!canContinue()) {
      setError("Please complete required fields for this step.");
      return;
    }
    setError("");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const toggleConnector = (id: string) => {
    setForm((prev) => ({
      ...prev,
      initialConnectors: prev.initialConnectors.includes(id)
        ? prev.initialConnectors.filter((item) => item !== id)
        : [...prev.initialConnectors, id],
    }));
  };

  const toggleGoal = (goal: string) => {
    setForm((prev) => ({
      ...prev,
      mainGoals: prev.mainGoals.includes(goal)
        ? prev.mainGoals.filter((g) => g !== goal)
        : [...prev.mainGoals, goal],
    }));
  };

  const complete = () => {
    if (!form.companyName.trim() || !form.websiteUrl.trim() || !form.approvalOwner.trim()) {
      setError("Company name, website URL and approval owner are required.");
      return;
    }
    completeOnboarding({
      companyName: form.companyName.trim(),
      websiteUrl: form.websiteUrl.trim(),
      companySize: form.companySize,
      industry: form.industry.trim(),
      mainGoals: form.mainGoals,
      preferredOperator: form.preferredOperator,
      approvalOwner: form.approvalOwner.trim(),
      initialConnectors: form.initialConnectors,
    });
    setStep(8);
  };

  if (step === 0) {
    return (
      <div className="welcome">
        <div className="welcome-glow" />
        <div className="welcome-inner">
          <div className="ob-step-tag">Inovense OS setup</div>
          <h1>Build your first <span className="accent">execution layer</span></h1>
          <p>New workspace onboarding that connects systems, deploys your first operator, and launches a policy-enforced golden path.</p>
          <div className="welcome-ctas">
            <button className="btn btn-primary btn-sm" onClick={next}>Start setup</button>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/")}>Back to site</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 8) {
    return (
      <div className="success">
        <div className="success-glow" />
        <div className="success-inner">
          <div className="ob-step-tag">Workspace live</div>
          <h1>{form.companyName || "Workspace"} is ready for execution</h1>
          <p>Operators can propose actions, policies are enforced before execution, and approval-required actions wait in the inbox.</p>
          <div className="success-ctas">
            <button className="btn btn-primary btn-sm" onClick={() => router.push("/app")}>Enter dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob">
      <div className="ob-head">
        <div className="ob-brand">
          <svg width="16" height="16" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <g fill="#ECEFF3">
              <rect x="10" y="10" width="44" height="9"/>
              <rect x="26" y="19" width="12" height="12"/>
              <rect x="26" y="33" width="12" height="12"/>
              <rect x="10" y="45" width="44" height="9"/>
            </g>
          </svg>
          INOVENSE <span className="sub">Onboarding</span>
        </div>
        <div className="ob-head-mid">
          <span>{STEPS[step].short}</span>
          <div className="bar"><span style={{ width: `${readiness}%` }} /></div>
          <span>{readiness}%</span>
        </div>
        <div className="ob-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/")}>Exit</button>
        </div>
      </div>

      <div className="ob-layout">
        <aside className="rail">
          <div className="rail-eyebrow">Steps</div>
          {STEPS.slice(1, 8).map((item, index) => {
            const actual = index + 1;
            const active = actual === step;
            const done = actual < step;
            return (
              <div key={item.id} className={`rail-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
                <div className="rail-num">{item.short}</div>
                <div>
                  <div className="rail-name">{item.name}</div>
                </div>
              </div>
            );
          })}
          <div className="rail-readiness">
            <div className="rail-readiness-row">
              <span className="label">Readiness</span>
              <span className="pct">{readiness}%</span>
            </div>
            <div className="bar"><span style={{ width: `${readiness}%` }} /></div>
          </div>
        </aside>

        <main className="ob-main">
          <div className="ob-canvas">
            {step === 1 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">Create workspace</span>
                  <h2>Set your company context</h2>
                  <p className="lead">This sets identity, routing, and base execution context for your operators.</p>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label className="label">Company name</label>
                    <input className="input" value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} placeholder="Inovense" />
                  </div>
                  <div className="field">
                    <label className="label">Website URL</label>
                    <input className="input" value={form.websiteUrl} onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))} placeholder="https://example.com" />
                  </div>
                  <div className="field">
                    <label className="label">Company size</label>
                    <select className="select" value={form.companySize} onChange={(e) => setForm((p) => ({ ...p, companySize: e.target.value }))}>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-1000">201-1000</option>
                      <option value="1000+">1000+</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Industry</label>
                    <input className="input" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} placeholder="Software" />
                  </div>
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label className="label">Approval owner</label>
                  <input className="input" value={form.approvalOwner} onChange={(e) => setForm((p) => ({ ...p, approvalOwner: e.target.value }))} placeholder="operator@company.com" />
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">Operating focus</span>
                  <h2>Select primary goals</h2>
                  <p className="lead">Goals shape workflow recommendations and first operator behavior.</p>
                </div>
                <div className="chip-row">
                  {["Lead qualification", "Client onboarding", "Support drafting", "Revenue reporting", "Content pipeline", "Ops digest"].map((goal) => (
                    <button key={goal} className={`chip ${form.mainGoals.includes(goal) ? "on" : ""}`} onClick={() => toggleGoal(goal)}>
                      {goal}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">Connect tools</span>
                  <h2>Connect initial systems</h2>
                  <p className="lead">Connected tools define what operators can execute in this workspace.</p>
                </div>
                <div className="card-grid cols-2">
                  {CONNECTOR_OPTIONS.map((c) => {
                    const selected = form.initialConnectors.includes(c.id);
                    return (
                      <button key={c.id} className={`sel-card conn-card ${selected ? "selected" : ""}`} onClick={() => toggleConnector(c.id)}>
                        <div className="head">
                          <div className="ident">
                            <div className="lg">{c.name.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <div className="title">{c.name}</div>
                              <div className="desc">{c.req}</div>
                            </div>
                          </div>
                          <span className={`conn-status ${selected ? "on" : ""}`}>{selected ? "connected" : "idle"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">First operator</span>
                  <h2>Deploy your first operator</h2>
                  <p className="lead">This operator is provisioned during onboarding and can run your first golden workflow immediately.</p>
                </div>
                <div className="seg">
                  {OPERATOR_OPTIONS.map((name) => (
                    <button key={name} className={form.preferredOperator === name ? "active" : ""} onClick={() => setForm((p) => ({ ...p, preferredOperator: name }))}>{name}</button>
                  ))}
                </div>
                {form.preferredOperator === "Revenue Operator" && (
                  <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-mute)" }}>
                    Requirements: Gmail or Outlook, HubSpot or Salesforce, and Slack.
                  </div>
                )}
              </section>
            )}

            {step === 5 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">Boundaries and policy</span>
                  <h2>Execution guardrails are enforced</h2>
                  <p className="lead">Operators propose actions. Policies are enforced before execution. Approval-required actions wait in the inbox.</p>
                </div>
                <div className="bnd-list">
                  {[
                    "Outbound communication gate for email.send",
                    "CRM delete actions blocked",
                    "Pricing and payment refund actions blocked",
                    "Memory write allowed, memory delete approval-gated",
                  ].map((item) => (
                    <div key={item} className="bnd-row">
                      <div className="ico">P</div>
                      <div>
                        <div className="name">{item}</div>
                      </div>
                      <div className="tog on" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {step === 6 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">Company memory</span>
                  <h2>Seed operator memory</h2>
                  <p className="lead">Provide baseline context so your first run reflects company voice and service boundaries.</p>
                </div>
                <div className="field">
                  <label className="label">Memory seed</label>
                  <textarea className="input" value={form.memoryDescription} onChange={(e) => setForm((p) => ({ ...p, memoryDescription: e.target.value }))} placeholder="Premium tone. Lead qualification first. External sends require approval." />
                </div>
              </section>
            )}

            {step === 7 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">Review and launch</span>
                  <h2>Confirm golden path setup</h2>
                  <p className="lead">On launch, workspace is created, connectors are connected, first operator is deployed, and logs/memory are initialized.</p>
                </div>
                <div className="rv-grid">
                  <div className="rv-card"><div className="lab">Workspace</div><div className="val">{form.companyName || "-"}</div></div>
                  <div className="rv-card"><div className="lab">Website</div><div className="val">{form.websiteUrl || "-"}</div></div>
                  <div className="rv-card"><div className="lab">Operator</div><div className="val">{form.preferredOperator}</div></div>
                  <div className="rv-card"><div className="lab">Connected tools</div><div className="val">{form.initialConnectors.join(", ") || "-"}</div></div>
                </div>
              </section>
            )}
          </div>
        </main>

        <aside className="preview">
          <div className="pv-card pv-ready">
            <div className="pv-head"><span className="dot" /> Golden path readiness</div>
            <div className="num">{readiness}%</div>
            <div className="bar"><span style={{ width: `${readiness}%` }} /></div>
            <div className="checklist">
              <div className={`ci ${form.companyName ? "on" : ""}`}><span className="ck">✓</span>Workspace context</div>
              <div className={`ci ${connectedCount > 0 ? "on" : ""}`}><span className="ck">✓</span>Connected systems</div>
              <div className={`ci ${form.preferredOperator ? "on" : ""}`}><span className="ck">✓</span>Operator selected</div>
              <div className={`ci ${form.approvalOwner ? "on" : ""}`}><span className="ck">✓</span>Approval owner set</div>
            </div>
          </div>
        </aside>
      </div>

      <div className="actionbar">
        <div className="hint">Step {STEPS[step].short} of {STEPS[7].short}</div>
        <div className="actionbar-mid">
          <button className="btn btn-ghost btn-sm" onClick={back} disabled={step <= 1} style={{ opacity: step <= 1 ? 0.5 : 1 }}>Back</button>
          {step < 7 ? (
            <button className="btn btn-primary btn-sm" onClick={next}>Continue</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={complete}>Launch operating layer</button>
          )}
        </div>
      </div>
      {error && (
        <div style={{ position: "fixed", left: 20, bottom: 70, color: "#ff8f8f", fontSize: 12, zIndex: 40 }}>{error}</div>
      )}
    </div>
  );
}
