"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";

const CONNECTOR_OPTIONS = [
  "gmail",
  "outlook",
  "hubspot",
  "salesforce",
  "slack",
  "google-calendar",
  "notion",
  "google-drive",
] as const;

const OPERATOR_OPTIONS = [
  "Revenue Operator",
  "Marketing Operator",
  "Client Flow Operator",
  "Operations Operator",
  "Support Operator",
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useOS();
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [companySize, setCompanySize] = useState("11-50");
  const [industry, setIndustry] = useState("Software");
  const [mainGoals, setMainGoals] = useState("Lead qualification, operational visibility");
  const [preferredOperator, setPreferredOperator] = useState<(typeof OPERATOR_OPTIONS)[number]>("Revenue Operator");
  const [approvalOwner, setApprovalOwner] = useState("");
  const [initialConnectors, setInitialConnectors] = useState<string[]>(["gmail", "hubspot", "slack"]);
  const [error, setError] = useState("");

  const toggleConnector = (id: string) => {
    setInitialConnectors((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const submit = () => {
    if (!companyName.trim() || !websiteUrl.trim() || !approvalOwner.trim()) {
      setError("Company name, website URL and approval owner are required.");
      return;
    }
    completeOnboarding({
      companyName: companyName.trim(),
      websiteUrl: websiteUrl.trim(),
      companySize,
      industry: industry.trim(),
      mainGoals: mainGoals.split(",").map((goal) => goal.trim()).filter(Boolean),
      preferredOperator,
      approvalOwner: approvalOwner.trim(),
      initialConnectors,
    });
    router.push("/app");
  };

  return (
    <div className="os-page" style={{ maxWidth: 980, margin: "0 auto", width: "100%" }}>
      <div className="os-page-head">
        <div>
          <span className="os-greet">Inovense OS setup</span>
          <h1>Onboarding</h1>
          <div className="os-page-sub">Complete setup to activate your first execution layer. Policies are enforced before execution.</div>
        </div>
      </div>

      <div className="p" style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input className="os-input" placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <input className="os-input" placeholder="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input className="os-input" placeholder="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <select className="os-input" value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-1000">201-1000</option>
            <option value="1000+">1000+</option>
          </select>
        </div>
        <input className="os-input" placeholder="Main goals (comma-separated)" value={mainGoals} onChange={(e) => setMainGoals(e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <select className="os-input" value={preferredOperator} onChange={(e) => setPreferredOperator(e.target.value as (typeof OPERATOR_OPTIONS)[number])}>
            {OPERATOR_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <input className="os-input" placeholder="Approval owner (name or email)" value={approvalOwner} onChange={(e) => setApprovalOwner(e.target.value)} />
        </div>

        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>
            Initial connectors
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>
            {CONNECTOR_OPTIONS.map((id) => (
              <label key={id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-dim)", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
                <input type="checkbox" checked={initialConnectors.includes(id)} onChange={() => toggleConnector(id)} />
                <span>{id}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <div style={{ color: "#ff8f8f", fontSize: 12 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
            Operators can propose actions, but guardrails decide what can run.
          </div>
          <button className="btn btn-primary btn-sm" onClick={submit}>Complete onboarding</button>
        </div>
      </div>
    </div>
  );
}
