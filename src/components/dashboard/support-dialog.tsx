"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { OSModal } from "@/components/dashboard/modal";
import { useOS } from "@/lib/os/app-provider";
import { findSupportHelp } from "@/lib/support/knowledge";

type Answer = { answer: string; action?: { label: string; href: string }; needsContact?: boolean };
type Topic = "account" | "connector" | "operator" | "billing" | "bug" | "other";

export function openSupport() { window.dispatchEvent(new CustomEvent("auterim:support")); }

export function SupportDialog() {
  const pathname = usePathname();
  const { state } = useOS();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [topic, setTopic] = useState<Topic>("other");
  const [message, setMessage] = useState("");
  const [contactError, setContactError] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const help = useMemo(() => findSupportHelp(query).slice(0, 5), [query]);

  useEffect(() => {
    const handler = () => { setOpen(true); setQuery(""); setAskError(""); setContactError(""); };
    window.addEventListener("auterim:support", handler);
    return () => window.removeEventListener("auterim:support", handler);
  }, []);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) { setAskError("Ask a short question about your workspace."); return; }
    setAsking(true); setAskError("");
    try {
      const response = await fetch("/api/support/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, question }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Auterim could not answer right now.");
      setAnswer(result); setQuestion("");
    } catch (error) { setAskError(error instanceof Error ? error.message : "Auterim could not answer right now."); }
    finally { setAsking(false); }
  }

  async function contact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) { setContactError("Add a short description so we can help."); return; }
    setSending(true); setContactError("");
    try {
      const response = await fetch("/api/support/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, topic, message, pagePath: pathname }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your request could not be sent.");
      setSent(true); setMessage("");
    } catch (error) { setContactError(error instanceof Error ? error.message : "Your request could not be sent."); }
    finally { setSending(false); }
  }

  if (!open) return null;
  return (
    <OSModal label="Auterim support" className="os-modal-backdrop os-support-backdrop" onClose={() => setOpen(false)}>
      <section className="os-modal os-support-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="os-support-head">
          <div><span>Auterim support</span><h2>How can we help?</h2><p>Guidance for this workspace, without leaving your work.</p></div>
          <button type="button" className="appr-btn deny" onClick={() => setOpen(false)}>Close</button>
        </header>
        <div className="os-support-scroll">
          <section className="os-support-section">
            <div className="os-support-section-head"><div><strong>Quick help</strong><span>Find the right product surface.</span></div></div>
            <label className="os-support-search"><span className="sr-only">Search help</span><input className="os-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connectors, approvals, plans…" /></label>
            <div className="os-support-help-list">
              {help.map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)}><span><strong>{item.title}</strong><small>{item.summary}</small></span><i aria-hidden="true">›</i></Link>)}
              {!help.length && <p className="os-support-empty">No matching help item. Ask Auterim or contact support below.</p>}
            </div>
          </section>
          <section className="os-support-section os-support-ask">
            <div className="os-support-section-head"><div><strong>Ask Auterim</strong><span>Uses your verified workspace setup to point you to the next step.</span></div></div>
            <form onSubmit={ask}><textarea className="os-input" value={question} maxLength={1000} rows={3} placeholder="Why is Revenue Operator not ready?" onChange={(event) => setQuestion(event.target.value)} /><button className="btn btn-primary btn-sm" type="submit" disabled={asking}>{asking ? "Checking…" : "Ask Auterim"}</button></form>
            {askError && <p className="os-feedback-error" role="alert">{askError}</p>}
            {answer && <div className="os-support-answer"><span>Auterim</span><p>{answer.answer}</p>{answer.action && <Link className="btn btn-ghost btn-sm" href={answer.action.href} onClick={() => setOpen(false)}>{answer.action.label} <b aria-hidden="true">→</b></Link>}{answer.needsContact && <button className="btn btn-ghost btn-sm" type="button" onClick={() => setContactOpen(true)}>Contact support <b aria-hidden="true">→</b></button>}</div>}
          </section>
          <section className="os-support-contact">
            <div><strong>Need a person?</strong><span>We’ll follow up at {state.currentUser.email}.</span></div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setContactOpen((value) => !value); setSent(false); }}>Contact support</button>
          </section>
          {contactOpen && (sent ? <div className="os-support-success"><strong>Support request received.</strong><span>We’ll follow up at {state.currentUser.email}.</span><button className="btn btn-primary btn-sm" type="button" onClick={() => { setSent(false); setContactOpen(false); }}>Done</button></div> : <form className="os-support-contact-form" onSubmit={contact}><label><span>Topic</span><select className="os-input" value={topic} onChange={(event) => setTopic(event.target.value as Topic)}><option value="account">Account</option><option value="connector">Connector</option><option value="operator">Operator</option><option value="billing">Billing</option><option value="bug">Bug</option><option value="other">Other</option></select></label><label><span>What do you need help with?</span><textarea className="os-input" rows={5} maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include the outcome you expected and what happened instead." /></label>{contactError && <p className="os-feedback-error" role="alert">{contactError}</p>}<button className="btn btn-primary" type="submit" disabled={sending}>{sending ? "Sending…" : "Send request"}</button></form>)}
        </div>
      </section>
    </OSModal>
  );
}
