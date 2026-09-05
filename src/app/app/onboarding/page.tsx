"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import type { OnboardingState } from "@/lib/os/types";
import { completeOnboardingAction } from "./actions";
import "./styles-onboarding.css";

type DemoPath = NonNullable<OnboardingState["preferredDemoPath"]>;

const PATHS: Record<DemoPath, { number: string; label: string; operator: string; avatar: string; description: string; boundary: string }> = {
  revenue: { number: "01", label: "New leads", operator: "Revenue Operator", avatar: "/operators/revenue-operator.png", description: "Qualify new demand and prepare the next reply before a lead waits.", boundary: "External replies wait for your approval." },
  client_flow: { number: "02", label: "Client handoffs", operator: "Client Flow Operator", avatar: "/operators/client-flow-operator.png", description: "Prepare onboarding updates, handoffs and follow-ups with the right context.", boundary: "Client-facing changes wait for your approval." },
  operations: { number: "03", label: "Operations", operator: "Operations Operator", avatar: "/operators/operations-operator.png", description: "Surface stalled work and prepare the internal next step before it becomes a delay.", boundary: "Changes to your systems wait for your approval." },
};

function isGenericWorkspaceName(value: string) {
  return ["", "workspace", "test", "atlas & co."].includes(value.trim().toLowerCase());
}

function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  return !trimmed ? "" : /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { state, completeOnboarding } = useOS();
  const [selectedPath, setSelectedPath] = useState<DemoPath>("revenue");
  const [workspaceName, setWorkspaceName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isGenericWorkspaceName(state.workspace.name)) setWorkspaceName((value) => value || state.workspace.name);
  }, [state.workspace.name]);

  const choice = PATHS[selectedPath];
  const displayName = workspaceName.trim() || state.workspace.name || "Your workspace";

  async function submit() {
    const companyName = displayName.trim();
    if (!companyName || isGenericWorkspaceName(companyName)) {
      setError("Name your workspace to continue.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await completeOnboardingAction({
      companyName,
      websiteUrl: normalizeWebsite(websiteUrl),
      useCase: choice.label,
      preferredDemoPath: selectedPath,
      safetyMode: "safe",
      approvalOwner: state.currentUser.email,
    });
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    completeOnboarding({
      companyName, websiteUrl: normalizeWebsite(websiteUrl), companySize: "", industry: choice.label,
      mainGoals: [choice.label], preferredOperator: choice.operator, preferredDemoPath: selectedPath,
      safetyMode: "safe", approvalOwner: result.ownerEmail, initialConnectors: [],
    });
    router.replace("/activate?first=1");
  }

  return (
    <div className="onboarding-shell">
      <header className="onboarding-header">
        <div className="onboarding-brand" aria-label="Auterim">
          <Image src="/brand/auterim-mark-live.svg" alt="" width={24} height={24} priority />
          <span>AUTERIM</span><span className="onboarding-brand-detail">/ operating profile</span>
        </div>
        <div className="onboarding-progress" aria-label="Step 1 of 1"><span>First operator</span><span className="onboarding-progress-line"><i /></span><b>01 / 01</b></div>
        <button className="onboarding-exit" type="button" onClick={() => router.push("/")}>Exit</button>
      </header>

      <main className="onboarding-main">
        <section className="onboarding-intro">
          <p className="onboarding-kicker"><i /> YOUR OPERATING PROFILE</p>
          <h1>What should Auterim<br />take off your team&apos;s plate first?</h1>
          <p className="onboarding-lead">Pick one place to begin. Auterim will recommend a controlled operator—then you decide when to connect live systems.</p>
          <div className="onboarding-choice-list" role="radiogroup" aria-label="Choose your first operating lane">
            {(Object.keys(PATHS) as DemoPath[]).map((path) => {
              const option = PATHS[path];
              const active = path === selectedPath;
              return <button className={`onboarding-choice ${active ? "is-active" : ""}`} key={path} type="button" role="radio" aria-checked={active} onClick={() => setSelectedPath(path)}>
                <span className="onboarding-choice-number">{option.number}</span>
                <span className="onboarding-choice-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                <span className="onboarding-choice-select" aria-hidden="true" />
              </button>;
            })}
          </div>
          <div className="onboarding-context">
            <div className="onboarding-context-top"><label htmlFor="workspace-name">Workspace</label><input id="workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Name your workspace" autoComplete="organization" /></div>
            <button type="button" className="onboarding-context-toggle" onClick={() => setShowContext((visible) => !visible)}>{showContext ? "Hide optional context" : "Add a website to make this more specific (optional)"}</button>
            {showContext && <input className="onboarding-website" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="yourcompany.com" inputMode="url" autoComplete="url" />}
          </div>
          {error && <p className="onboarding-error" role="alert">{error}</p>}
        </section>

        <aside className="operator-recommendation" aria-live="polite">
          <div className="operator-recommendation-top"><span>RECOMMENDED OPERATOR</span><b><i /> READY</b></div>
          <div className="operator-recommendation-body">
            <div className="operator-orbit"><Image src={choice.avatar} alt="" width={112} height={112} /></div>
            <div className="operator-recommendation-copy"><span>{choice.label.toUpperCase()} / FIRST LANE</span><h2>{choice.operator}</h2><p>{choice.description}</p></div>
          </div>
          <div className="operator-recommendation-boundary"><i /> {choice.boundary}</div>
        </aside>
      </main>

      <footer className="onboarding-footer">
        <span><i /> APPROVALS ARE ON BY DEFAULT</span><p>No systems are connected yet. You&apos;ll choose what to connect when it creates value.</p>
        <button type="button" className="onboarding-continue" onClick={submit} disabled={submitting}>{submitting ? "Creating your profile…" : "Show my first operator →"}</button>
      </footer>
    </div>
  );
}
