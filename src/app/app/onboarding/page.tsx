"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { getEntitlements } from "@/lib/os/entitlements";
import { listConnectors } from "@/lib/connectors/registry";
import "./styles-onboarding.css";

const STEPS = [
  { id: "welcome", name: "Welcome", short: "00" },
  { id: "workspace", name: "Create workspace", short: "01" },
  { id: "focus", name: "Operating focus", short: "02" },
  { id: "stack", name: "Select your stack", short: "03" },
  { id: "operator", name: "First operator", short: "04" },
  { id: "guardrails", name: "Guardrails", short: "05" },
  { id: "memory", name: "Company memory", short: "06" },
  { id: "review", name: "Review and launch", short: "07" },
  { id: "success", name: "Live", short: "08" },
] as const;

const CONNECTOR_OPTIONS = listConnectors().map((connector) => ({
  id: connector.connectorKey,
  name: connector.displayName,
  req: connector.status === "available" ? connector.setupNotes : "Request connector",
  status: connector.status,
}));

const GOAL_OPTIONS = [
  {
    id: "Lead qualification",
    label: "Lead qualification",
    desc: "Inbound triage, enrichment, follow-ups and pipeline signals.",
    operator: "Revenue Operator",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    id: "Client onboarding",
    label: "Client onboarding",
    desc: "Intake forms, kickoff kits, reminders and client updates.",
    operator: "Client Flow Operator",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: "Support drafting",
    label: "Support drafting",
    desc: "Tier-1 triage, draft replies, summaries and routing.",
    operator: "Support Operator",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: "Revenue reporting",
    label: "Revenue reporting",
    desc: "Weekly pipeline digest, deal alerts and revenue snapshots.",
    operator: "Revenue Operator",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "Content pipeline",
    label: "Content pipeline",
    desc: "Content briefs, SEO research, ad angles and campaign management.",
    operator: "Marketing Operator",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: "Ops digest",
    label: "Ops digest",
    desc: "Reports, runbooks, recurring tasks and process clarity.",
    operator: "Operations Operator",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
] as const;

const GOAL_WORKFLOWS: Record<string, string> = {
  "Lead qualification": "Revenue: Lead qualification to CRM update",
  "Client onboarding": "Client: Onboarding sequence and status updates",
  "Support drafting": "Support: Ticket triage and response drafting",
  "Revenue reporting": "Revenue: Weekly pipeline digest and deal alerts",
  "Content pipeline": "Marketing: Content brief, schedule, and publish",
  "Ops digest": "Operations: Internal digest and action item tracker",
};

const OPERATOR_OPTIONS = [
  {
    id: "Revenue Operator" as const,
    name: "Revenue Operator",
    desc: "Qualifies leads, drafts outbound, updates CRM, and surfaces deal signals across your pipeline.",
    tools: "Gmail / HubSpot / Slack",
  },
  {
    id: "Marketing Operator" as const,
    name: "Marketing Operator",
    desc: "Runs content workflows, schedules posts, tracks campaign output, and briefs your team.",
    tools: "Notion / Google Drive / Slack",
  },
  {
    id: "Client Flow Operator" as const,
    name: "Client Flow Operator",
    desc: "Handles onboarding sequences, sends status updates, and keeps client records current.",
    tools: "HubSpot / Gmail / Slack",
  },
  {
    id: "Operations Operator" as const,
    name: "Operations Operator",
    desc: "Builds internal digests, tracks action items, and flags blockers across tools.",
    tools: "Slack / Notion / ClickUp",
  },
  {
    id: "Support Operator" as const,
    name: "Support Operator",
    desc: "Drafts responses, triages tickets, and routes escalations based on policy.",
    tools: "Gmail / Slack / Webhooks",
  },
];

const POLICIES = [
  "Outbound communication gate for email.send",
  "CRM delete actions blocked",
  "Pricing and payment refund actions blocked",
  "Memory write allowed — memory delete approval-gated",
  "External file upload requires approval",
];

type OperatorId = typeof OPERATOR_OPTIONS[number]["id"];

type FormState = {
  companyName: string;
  websiteUrl: string;
  companySize: string;
  industry: string;
  primaryTeam: string;
  approvalOwner: string;
  mainGoals: string[];
  preferredOperator: OperatorId;
  initialConnectors: string[];
  memoryDescription: string;
  memoryOffer: string;
  memoryTone: string;
  memoryRules: string;
  memoryNotes: string;
};

const INITIAL_STATE: FormState = {
  companyName: "",
  websiteUrl: "",
  companySize: "11-50",
  industry: "Software",
  primaryTeam: "Sales",
  approvalOwner: "",
  mainGoals: [],
  preferredOperator: "Revenue Operator",
  initialConnectors: ["gmail", "hubspot"],
  memoryDescription: "",
  memoryOffer: "",
  memoryTone: "",
  memoryRules: "",
  memoryNotes: "",
};

function getRecommendedOperator(goals: string[]): OperatorId {
  if (!goals.length) return "Revenue Operator";
  const match = GOAL_OPTIONS.find((g) => goals.includes(g.id));
  return (match?.operator as OperatorId) ?? "Revenue Operator";
}

export default function OnboardingPage() {
  const router = useRouter();
  const { state, completeOnboarding } = useOS();
  const entitlements = getEntitlements(state.workspace);
  const isPreview = entitlements.billingStatus === "preview" || !entitlements.canRunRealActions;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState("");

  const recommendedOperator = useMemo(
    () => getRecommendedOperator(form.mainGoals),
    [form.mainGoals]
  );

  const readiness = useMemo(() => {
    let p = 0;
    if (form.companyName) p += 16;
    if (form.approvalOwner) p += 12;
    if (form.mainGoals.length) p += 12;
    if (form.initialConnectors.length) p += Math.min(18, form.initialConnectors.length * 3);
    if (form.preferredOperator) p += 12;
    if (form.memoryDescription) p += 10;
    if (form.memoryOffer) p += 6;
    if (form.memoryTone) p += 6;
    if (form.memoryRules) p += 6;
    if (step >= 7) p = 98;
    if (step === 8) p = 100;
    return Math.min(98, p);
  }, [form, step]);

  const firstWorkflow = form.mainGoals.length
    ? (GOAL_WORKFLOWS[form.mainGoals[0]] ?? "")
    : "";

  const canContinue = () => {
    if (step === 1) return form.companyName.trim() && form.websiteUrl.trim() && form.approvalOwner.trim();
    if (step === 3) return form.initialConnectors.length > 0;
    return true;
  };

  const next = () => {
    if (!canContinue()) {
      setError("Please complete required fields to continue.");
      return;
    }
    setError("");
    if (step === 2) {
      const rec = getRecommendedOperator(form.mainGoals);
      setForm((p) => ({ ...p, preferredOperator: rec }));
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const toggleConnector = (id: string) => {
    const option = CONNECTOR_OPTIONS.find((connector) => connector.id === id);
    if (option?.status !== "available") return;
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
          <p>Seven steps to connect your stack, deploy your first operator, and launch a policy-enforced operating layer for your business.</p>
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
          <div className="ob-step-tag">Preview workspace live</div>
          <h1>{form.companyName || "Your workspace"} is <span className="accent">ready</span></h1>
          <p>Operators are deployed, policies are enforced, and your first workflow is ready to run in preview mode. Activate a Starter plan to go live.</p>
          <div className="success-ctas">
            <button className="btn btn-primary btn-sm" onClick={() => router.push("/app")}>Enter dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const stepLabel = `STEP ${STEPS[step].short} · ${STEPS[step].name.toUpperCase()}`;

  return (
    <div className="ob">
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
          INOVENSE <span className="sub">/ setup</span>
        </div>
        <div className="ob-head-mid">
          <span>Step {STEPS[step].short} of {STEPS[7].short}</span>
          <div className="bar"><span style={{ width: `${readiness}%` }} /></div>
          <span>{readiness}%</span>
        </div>
        <div className="ob-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/")}>Exit setup</button>
        </div>
      </div>

      <div className="ob-layout">
        <aside className="rail">
          <div className="rail-eyebrow">Setup</div>
          {STEPS.slice(1, 8).map((item, index) => {
            const actual = index + 1;
            const active = actual === step;
            const done = actual < step;
            return (
              <div key={item.id} className={`rail-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
                <div className="rail-num">{item.short}</div>
                <div>
                  <div className="rail-name">{item.name}</div>
                  <div className="rail-status">
                    {active ? "in progress" : done ? "complete" : "—"}
                  </div>
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
            {readiness < 50 && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.5 }}>
                Inovense OS is configuring your operating layer.
              </div>
            )}
          </div>
        </aside>

        <main className="ob-main">
          <div className="ob-canvas">

            {step === 1 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">{stepLabel}</span>
                  <h2>Create your workspace.</h2>
                  <p className="lead">Your workspace is the operating environment for your company. Agents, workflows, connectors and memory live inside it.</p>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label className="label">Company name</label>
                    <input className="input" value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} placeholder="Your company name" />
                  </div>
                  <div className="field">
                    <label className="label">Website</label>
                    <div className="input-prefix-wrap">
                      <span className="input-prefix">https://</span>
                      <input
                        className="input input-prefixed"
                        value={form.websiteUrl.replace(/^https?:\/\//, "")}
                        onChange={(e) => setForm((p) => ({ ...p, websiteUrl: "https://" + e.target.value }))}
                        placeholder="yourcompany.com"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Team size</label>
                    <div className="size-pills">
                      {["1-10", "11-20", "21-50", "51-200", "200+"].map((s) => (
                        <button key={s} className={`size-pill ${form.companySize === s ? "active" : ""}`} onClick={() => setForm((p) => ({ ...p, companySize: s }))}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Industry</label>
                    <select className="select" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}>
                      {["Software", "Agency", "E-commerce", "Finance", "Healthcare", "Real estate", "Professional services", "Other"].map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Primary team</label>
                    <select className="select" value={form.primaryTeam} onChange={(e) => setForm((p) => ({ ...p, primaryTeam: e.target.value }))}>
                      {["Sales", "Marketing", "Operations", "Customer Success", "Product", "Founders / Leadership"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Approval owner</label>
                    <input className="input" value={form.approvalOwner} onChange={(e) => setForm((p) => ({ ...p, approvalOwner: e.target.value }))} placeholder="operator@company.com" />
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">{stepLabel}</span>
                  <h2>What should Inovense run first?</h2>
                  <p className="lead">Pick one or more domains. We will sequence operators and connectors around what you choose. You can always expand later.</p>
                </div>
                <div className="card-grid cols-3">
                  {GOAL_OPTIONS.map((goal) => {
                    const selected = form.mainGoals.includes(goal.id);
                    return (
                      <button key={goal.id} className={`goal-card ${selected ? "selected" : ""}`} onClick={() => toggleGoal(goal.id)}>
                        <div className="goal-check-wrap">
                          <div className={`goal-check ${selected ? "on" : ""}`} />
                        </div>
                        <div className="goal-icon">{goal.icon}</div>
                        <div className="goal-title">{goal.label}</div>
                        <div className="goal-desc">{goal.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">{stepLabel}</span>
                  <h2>Select your stack.</h2>
                  <p className="lead">Connected tools define what operators can read and act on in this workspace.</p>
                </div>
                {isPreview && (
                  <div className="preview-note">
                    Preview workspace: connectors are not authenticated. Real OAuth activation happens after you activate a Starter plan.
                  </div>
                )}
                <div className="card-grid cols-3">
                  {CONNECTOR_OPTIONS.map((c) => {
                    const selected = form.initialConnectors.includes(c.id);
                    const available = c.status === "available";
                    return (
                      <button
                        key={c.id}
                        className={`sel-card conn-card ${selected ? "selected" : ""}`}
                        onClick={() => toggleConnector(c.id)}
                        disabled={!available}
                        style={!available ? { opacity: 0.58, cursor: "not-allowed" } : undefined}
                      >
                        <div className="head">
                          <div className="ident">
                            <div className="lg">{c.name.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <div className="title">{c.name}</div>
                              <div className="desc">{c.req}</div>
                            </div>
                          </div>
                          <span className={`conn-status ${selected ? "on" : ""}`}>{available ? (selected ? "on" : "off") : "request"}</span>
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
                  <span className="ob-step-tag">{stepLabel}</span>
                  <h2>Deploy your first operator.</h2>
                  <p className="lead">This operator is provisioned during onboarding and runs your first golden workflow immediately.</p>
                </div>
                <div className="card-grid cols-1">
                  {OPERATOR_OPTIONS.map((op) => {
                    const selected = form.preferredOperator === op.id;
                    const isRec = recommendedOperator === op.id;
                    return (
                      <button key={op.id} className={`op-card ${selected ? "selected" : ""}`} onClick={() => setForm((p) => ({ ...p, preferredOperator: op.id }))}>
                        <div className="op-head">
                          <span className="op-name">{op.name}</span>
                          {isRec && <span className="rec-badge">Recommended</span>}
                        </div>
                        <div className="op-desc">{op.desc}</div>
                        <div className="op-tools">{op.tools}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">{stepLabel}</span>
                  <h2>Execution guardrails are enforced.</h2>
                  <p className="lead">Operators can propose actions. Policies decide what can run. Approval-required actions wait in the inbox.</p>
                </div>
                <div className="bnd-list">
                  {POLICIES.map((item) => (
                    <div key={item} className="bnd-row">
                      <div className="ico">P</div>
                      <div>
                        <div className="name">{item}</div>
                      </div>
                      <div className="tog on" />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-mute)" }}>
                  All policies can be adjusted after launch from the Policies tab.
                </div>
              </section>
            )}

            {step === 6 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">{stepLabel}</span>
                  <h2>Seed operator memory.</h2>
                  <p className="lead">Baseline context so operators reflect company voice, service boundaries, and operating rules from the first run.</p>
                </div>
                <div className="mem-grid">
                  <div className="field">
                    <label className="label">Company description</label>
                    <textarea className="input" value={form.memoryDescription} onChange={(e) => setForm((p) => ({ ...p, memoryDescription: e.target.value }))} placeholder="What your company does in 2-3 sentences." />
                  </div>
                  <div className="field">
                    <label className="label">Offer / services</label>
                    <textarea className="input" value={form.memoryOffer} onChange={(e) => setForm((p) => ({ ...p, memoryOffer: e.target.value }))} placeholder="Core product or service lines operators should reference." />
                  </div>
                  <div className="field">
                    <label className="label">Brand tone</label>
                    <input className="input" value={form.memoryTone} onChange={(e) => setForm((p) => ({ ...p, memoryTone: e.target.value }))} placeholder="Professional and direct. No fluff. First-name basis with clients." />
                  </div>
                  <div className="field">
                    <label className="label">Key rules</label>
                    <textarea className="input" value={form.memoryRules} onChange={(e) => setForm((p) => ({ ...p, memoryRules: e.target.value }))} placeholder="Rules operators must follow. e.g. External sends require approval. No pricing in outbound." />
                  </div>
                  <div className="field">
                    <label className="label">Notes</label>
                    <input className="input" value={form.memoryNotes} onChange={(e) => setForm((p) => ({ ...p, memoryNotes: e.target.value }))} placeholder="Anything else operators should know about your business." />
                  </div>
                </div>
              </section>
            )}

            {step === 7 && (
              <section className="ob-step">
                <div className="ob-step-head">
                  <span className="ob-step-tag">{stepLabel}</span>
                  <h2>Review and launch.</h2>
                  <p className="lead">On launch, your operator is deployed, connectors are staged, policies are enforced, and company memory is seeded.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{form.companyName || "Your workspace"}</div>
                  <span className="preview-badge">
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#F5C26B", flexShrink: 0, display: "block" }} />
                    Preview mode
                  </span>
                </div>
                <div className="rv-grid">
                  <div className="rv-card">
                    <div className="lab">First operator</div>
                    <div className="val">{form.preferredOperator}</div>
                  </div>
                  <div className="rv-card">
                    <div className="lab">Approval owner</div>
                    <div className="val">{form.approvalOwner || "-"}</div>
                  </div>
                  <div className="rv-card rv-row">
                    <div className="lab">Stack — {form.initialConnectors.length} connectors selected</div>
                    <div className="rv-tags">
                      {form.initialConnectors.map((id) => (
                        <span key={id} className="rv-tag">{id}</span>
                      ))}
                      {form.initialConnectors.length === 0 && <span style={{ fontSize: 13, color: "var(--text-faint)" }}>None selected</span>}
                    </div>
                  </div>
                  {firstWorkflow && (
                    <div className="rv-card rv-row">
                      <div className="lab">First workflow</div>
                      <div className="val">{firstWorkflow}</div>
                    </div>
                  )}
                  <div className="rv-card">
                    <div className="lab">Guardrails</div>
                    <div className="val">{POLICIES.length} policies active</div>
                  </div>
                  <div className="rv-card">
                    <div className="lab">Memory fields</div>
                    <div className="val">{[form.memoryDescription, form.memoryOffer, form.memoryTone, form.memoryRules, form.memoryNotes].filter(Boolean).length} of 5 seeded</div>
                  </div>
                </div>
                <div className="activation-note">
                  Your workspace launches in preview mode. Operators run demo tasks and no real actions are sent. To activate live execution, start a Starter plan trial from the dashboard. No credit card required for the first 3 days.
                </div>
              </section>
            )}
          </div>
        </main>

        <aside className="preview">
          <div className="pv-card pv-ready">
            <div className="pv-head"><span className="dot" /> Setup readiness</div>
            <div className="pv-ready-row">
              <div className="num">{readiness}%</div>
              {readiness < 98 && <span className="pv-status-label">configuring</span>}
            </div>
            <div className="bar"><span style={{ width: `${readiness}%` }} /></div>
            <div className="checklist">
              <div className={`ci ${form.companyName ? "on" : ""}`}><span className="ck">✓</span>Workspace named</div>
              <div className={`ci ${form.mainGoals.length > 0 ? "on" : ""}`}><span className="ck">✓</span>Operating focus chosen</div>
              <div className={`ci ${form.initialConnectors.length > 0 ? "on" : ""}`}><span className="ck">✓</span>{form.initialConnectors.length} tools selected</div>
              <div className={`ci ${form.preferredOperator ? "on" : ""}`}><span className="ck">✓</span>First operator selected</div>
              <div className={`ci on`}><span className="ck">✓</span>Boundaries set</div>
              <div className={`ci ${!!form.memoryDescription ? "on" : ""}`}><span className="ck">✓</span>Company memory drafted</div>
            </div>
          </div>

          {step === 1 && (
            <div className="pv-card">
              <div className="pv-head"><span className="dot" /> Workspace preview</div>
              <div className="pv-ws-avatar">
                {form.companyName ? form.companyName.slice(0, 2).toUpperCase() : "—"}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 14 }}>{form.companyName || "Your workspace"}</div>
              <div className="pv-field-row"><span className="pv-field-lab">Website</span><span className="pv-field-val">{form.websiteUrl ? form.websiteUrl.replace("https://", "") : "—"}</span></div>
              <div className="pv-field-row"><span className="pv-field-lab">Team size</span><span className="pv-field-val">{form.companySize || "—"}</span></div>
              <div className="pv-field-row"><span className="pv-field-lab">Industry</span><span className="pv-field-val">{form.industry || "—"}</span></div>
              <div className="pv-field-row"><span className="pv-field-lab">Region</span><span className="pv-field-val">US · production</span></div>
            </div>
          )}

          {step === 2 && (
            <div className="pv-card">
              <div className="pv-head"><span className="dot" /> Recommended agents</div>
              {form.mainGoals.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>Pick a focus to see suggested agents.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--cyan)" }}>{recommendedOperator}</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.5 }}>
                    {OPERATOR_OPTIONS.find((o) => o.id === recommendedOperator)?.desc}
                  </div>
                  {form.mainGoals.length > 1 && (
                    <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
                      +{form.mainGoals.length - 1} more focus{form.mainGoals.length > 2 ? "es" : ""} selected
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="pv-card">
              <div className="pv-head"><span className="dot" /> Selected operator</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 6 }}>{form.preferredOperator}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.5 }}>
                {OPERATOR_OPTIONS.find((o) => o.id === form.preferredOperator)?.desc}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="pv-card">
              <div className="pv-head"><span className="dot" /> What happens on launch</div>
              {[
                "Operator is deployed and ready to run",
                "Connectors are staged for activation",
                "5 default policies are enforced",
                "Company memory is seeded",
                "Preview workspace is active",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--text-dim)", marginBottom: 7, lineHeight: 1.4 }}>
                  <span style={{ color: "var(--cyan)", flexShrink: 0 }}>–</span>
                  {item}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <div className="actionbar">
        <div className="hint">Step {STEPS[step].short} of {STEPS[7].short}</div>
        <div className="actionbar-mid">
          <button className="btn btn-ghost btn-sm" onClick={back} disabled={step <= 1} style={{ opacity: step <= 1 ? 0.5 : 1 }}>Back</button>
          {step < 7 ? (
            <button className="btn btn-primary btn-sm" onClick={next}>Continue</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={complete}>Launch preview workspace</button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ position: "fixed", left: 20, bottom: 70, color: "#ff8f8f", fontSize: 12, zIndex: 40 }}>{error}</div>
      )}
    </div>
  );
}
