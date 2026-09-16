"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { OSModal } from "@/components/dashboard/modal";

type FeedbackType = "general" | "connector_request" | "operator_request" | "feature_request" | "bug";
const OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: "general", label: "General feedback" }, { value: "connector_request", label: "Connector request" }, { value: "operator_request", label: "Operator request" }, { value: "feature_request", label: "Feature request" }, { value: "bug", label: "Bug / something not working" },
];

export function openFeedback(type: FeedbackType = "general") {
  window.dispatchEvent(new CustomEvent("auterim:feedback", { detail: { type } }));
}

export function FeedbackDialog() {
  const pathname = usePathname();
  const { state } = useOS();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [requestedSystem, setRequestedSystem] = useState("");
  const [requestedWork, setRequestedWork] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => { const value = (event as CustomEvent<{ type?: FeedbackType }>).detail?.type; setType(value && OPTIONS.some((item) => item.value === value) ? value : "general"); setError(""); setSent(false); setOpen(true); };
    window.addEventListener("auterim:feedback", handler);
    return () => window.removeEventListener("auterim:feedback", handler);
  }, []);

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

  if (!open) return null;
  return <OSModal label="Send feedback" onClose={() => setOpen(false)}><div className="os-modal os-feedback-modal"><div className="os-modal-head"><div><div className="os-profile-eyebrow">Product feedback</div><h3>{sent ? "Feedback received" : "Help shape Auterim"}</h3></div><button className="appr-btn deny" type="button" onClick={() => setOpen(false)}>Close</button></div>{sent ? <div className="os-feedback-success"><p>Thanks — feedback received.</p><span>We use this to prioritize connectors, operators, and product improvements.</span><button className="btn btn-primary btn-sm" type="button" onClick={() => setOpen(false)}>Done</button></div> : <form className="os-feedback-form" onSubmit={submit}><label><span>Type</span><select className="os-input" value={type} onChange={(event) => setType(event.target.value as FeedbackType)}>{OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{type === "connector_request" && <label><span>Which system?</span><input className="os-input" value={requestedSystem} maxLength={200} placeholder="For example, a system your team already uses" onChange={(event) => setRequestedSystem(event.target.value)} /></label>}{type === "operator_request" && <label><span>What work should this operator own?</span><input className="os-input" value={requestedWork} maxLength={500} placeholder="Describe the responsibility, not an operator name" onChange={(event) => setRequestedWork(event.target.value)} /></label>}<label><span>{type === "bug" ? "What happened?" : "Message"}</span><textarea className="os-input" value={message} maxLength={5000} rows={6} placeholder="The context, outcome, or missing capability that would be most useful." onChange={(event) => setMessage(event.target.value)} aria-describedby={error ? "feedback-error" : undefined} /></label><div className="os-feedback-followup">Follow-up email <strong>{state.currentUser.email}</strong></div>{error && <p id="feedback-error" className="os-feedback-error" role="alert">{error}</p>}<button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Sending..." : "Send feedback"}</button></form>}</div></OSModal>;
}
