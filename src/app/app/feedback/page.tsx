"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { PageHeader } from "@/components/product-ui/page-primitives";

type FeedbackType = "general" | "connector_request" | "operator_request" | "feature_request" | "bug";

const OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: "general", label: "General feedback" },
  { value: "connector_request", label: "Connector request" },
  { value: "operator_request", label: "Operator request" },
  { value: "feature_request", label: "Feature request" },
  { value: "bug", label: "Bug / something not working" },
];

function resolveType(value: string | null): FeedbackType {
  return value && OPTIONS.some((option) => option.value === value) ? (value as FeedbackType) : "general";
}

export default function FeedbackPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state } = useOS();
  const [type, setType] = useState<FeedbackType>(() => resolveType(searchParams.get("type")));
  const [message, setMessage] = useState("");
  const [requestedSystem, setRequestedSystem] = useState("");
  const [requestedWork, setRequestedWork] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setType(resolveType(searchParams.get("type"))); }, [searchParams]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) { setError("Tell us what would make this better."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, feedbackType: type, message, requestedSystem, requestedWork, pagePath: pathname }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Feedback could not be submitted.");
      setSent(true); setMessage(""); setRequestedSystem(""); setRequestedWork("");
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "Feedback could not be submitted."); }
    finally { setBusy(false); }
  }

  return (
    <div className="os-page feedback-page">
      <PageHeader title="Feedback" description="Tell us what your workforce should do next." />
      <div className="card sec">
        <div className="card-head"><span className="t-object">{sent ? "Feedback received" : "Help shape Auterim"}</span></div>
        <div className="card-pad">
          {sent ? (
            <div className="stack">
              <p className="t-compact">Thanks, feedback received. We use this to prioritize connectors, operators, and product improvements.</p>
              <div><button className="btn btn-primary btn-sm" type="button" onClick={() => setSent(false)}>Send more feedback</button></div>
            </div>
          ) : (
            <form className="stack" onSubmit={submit}>
              <div className="field">
                <label className="label" htmlFor="feedback-type">Type</label>
                <select id="feedback-type" className="input" value={type} onChange={(event) => setType(event.target.value as FeedbackType)}>
                  {OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              {type === "connector_request" && (
                <div className="field">
                  <label className="label" htmlFor="feedback-system">Which system?</label>
                  <input id="feedback-system" className="input" value={requestedSystem} maxLength={200} placeholder="For example, a system your team already uses" onChange={(event) => setRequestedSystem(event.target.value)} />
                </div>
              )}
              {type === "operator_request" && (
                <div className="field">
                  <label className="label" htmlFor="feedback-work">What work should this operator own?</label>
                  <input id="feedback-work" className="input" value={requestedWork} maxLength={500} placeholder="Describe the responsibility, not an operator name" onChange={(event) => setRequestedWork(event.target.value)} />
                </div>
              )}
              <div className="field">
                <label className="label" htmlFor="feedback-message">{type === "bug" ? "What happened?" : "Message"}</label>
                <textarea
                  id="feedback-message"
                  className="input"
                  value={message}
                  maxLength={5000}
                  rows={6}
                  placeholder="The context, outcome, or missing capability that would be most useful."
                  onChange={(event) => setMessage(event.target.value)}
                  aria-describedby={error ? "feedback-error" : undefined}
                />
                <p className="hint">Follow-up email {state.currentUser.email}</p>
              </div>
              {error && <p id="feedback-error" className="hint" role="alert" style={{ color: "var(--rose)" }}>{error}</p>}
              <div><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send feedback"}</button></div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
