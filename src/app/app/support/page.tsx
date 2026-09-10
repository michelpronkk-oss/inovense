"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useOS } from "@/lib/os/app-provider";
import { findSupportHelp, SUPPORT_HELP } from "@/lib/support/knowledge";
import { getEntitlements } from "@/lib/os/entitlements";
import { getPlanLabel } from "@/lib/os/truth";
import { PageHeader, EmptyState, CapabilityDefinitionList } from "@/components/product-ui/page-primitives";

type Answer = { answer: string; action?: { label: string; href: string }; needsContact?: boolean };
type Topic = "account" | "connector" | "operator" | "billing" | "bug" | "other";

const TOPIC_OPTIONS: Array<{ value: Topic; label: string }> = [
  { value: "account", label: "Account" },
  { value: "connector", label: "Connector" },
  { value: "operator", label: "Operator" },
  { value: "billing", label: "Billing" },
  { value: "bug", label: "Bug" },
  { value: "other", label: "Other" },
];

export default function SupportPage() {
  const pathname = usePathname();
  const { state } = useOS();
  const entitlements = getEntitlements(state.workspace);

  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  const [topic, setTopic] = useState<Topic>("other");
  const [message, setMessage] = useState("");
  const [contactError, setContactError] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const messageFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const help = useMemo(() => findSupportHelp(query).slice(0, 5), [query]);

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

  return (
    <div className="os-page support-page">
      <PageHeader
        title="Support"
        description="Reach the Auterim team, or read how the workforce is meant to behave."
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setSent(false);
              messageFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              messageFieldRef.current?.focus();
            }}
          >
            New request
          </button>
        }
      />
      <div className="split sec">
        <div className="card">
          <div className="card-head"><span className="t-object">Your requests</span></div>
          <div className="card-pad">
            <section className="sec" style={{ marginTop: 0 }}>
              <div className="sec-head"><h3 className="t-section">Ask Auterim</h3></div>
              <div className="field">
                <label className="label" htmlFor="support-search">Search connectors, approvals, plans…</label>
                <input id="support-search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connectors, approvals, plans…" />
              </div>
              <div className="rows" style={{ marginTop: 10 }}>
                {help.length
                  ? help.map((item) => (
                      <Link key={item.id} href={item.href} className="row link">
                        <span className="grow"><span className="ttl">{item.title}</span><span className="sub">{item.summary}</span></span>
                      </Link>
                    ))
                  : <p className="hint">No matching help item. Ask a question below or send a request.</p>}
              </div>
              <form onSubmit={ask} style={{ marginTop: 16 }}>
                <div className="field">
                  <label className="label" htmlFor="support-question">Ask a specific question</label>
                  <textarea id="support-question" className="input" rows={3} maxLength={1000} value={question} placeholder="Why is Revenue Operator not ready?" onChange={(event) => setQuestion(event.target.value)} />
                  <p className="hint">Uses your verified workspace setup to point you to the next step.</p>
                </div>
                {askError && <p className="hint" role="alert" style={{ color: "var(--rose)" }}>{askError}</p>}
                <div className="inline" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={asking}>{asking ? "Checking…" : "Ask Auterim"}</button>
                </div>
                {answer && (
                  <div className="panel" style={{ marginTop: 12, padding: "12px 14px" }}>
                    <span className="t-eyebrow">Auterim</span>
                    <p className="t-compact" style={{ margin: "6px 0 0" }}>{answer.answer}</p>
                    {answer.action && <Link className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} href={answer.action.href}>{answer.action.label} →</Link>}
                    {answer.needsContact && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: 10 }}
                        onClick={() => { messageFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); messageFieldRef.current?.focus(); }}
                      >
                        Contact support →
                      </button>
                    )}
                  </div>
                )}
              </form>
            </section>

            <section className="sec">
              <div className="sec-head"><h3 className="t-section">Contact support</h3></div>
              {sent ? (
                <div className="panel" style={{ padding: "14px 16px" }}>
                  <p className="t-object">Support request received.</p>
                  <p className="t-compact" style={{ margin: "4px 0 0" }}>We&rsquo;ll follow up at {state.currentUser.email}.</p>
                </div>
              ) : (
                <form className="stack" onSubmit={contact}>
                  <div className="field">
                    <label className="label" htmlFor="support-topic">Topic</label>
                    <select id="support-topic" className="input" value={topic} onChange={(event) => setTopic(event.target.value as Topic)}>
                      {TOPIC_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="support-message">What do you need help with?</label>
                    <textarea
                      id="support-message"
                      ref={messageFieldRef}
                      className="input"
                      rows={5}
                      maxLength={5000}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Include the outcome you expected and what happened instead."
                    />
                    <p className="hint">We&rsquo;ll follow up at {state.currentUser.email}.</p>
                  </div>
                  {contactError && <p className="hint" role="alert" style={{ color: "var(--rose)" }}>{contactError}</p>}
                  <div><button className="btn btn-primary" type="submit" disabled={sending}>{sending ? "Sending…" : "Send request"}</button></div>
                </form>
              )}
            </section>

            <section className="sec">
              <div className="sec-head"><h3 className="t-section">Open requests</h3></div>
              <EmptyState title="No open requests">Requests you send appear here once support activity is available in this workspace.</EmptyState>
            </section>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><span className="t-object">Documentation</span></div>
            <div className="rows">
              {SUPPORT_HELP.map((item) => (
                <Link key={item.id} href={item.href} className="row link">
                  <span className="grow"><span className="ttl">{item.title}</span><span className="sub">{item.summary}</span></span>
                </Link>
              ))}
            </div>
          </div>
          <div className="panel" style={{ padding: "16px 18px" }}>
            <span className="t-eyebrow">Workspace reference</span>
            <div style={{ marginTop: 12 }}>
              <CapabilityDefinitionList
                items={[
                  { label: "Workspace", value: state.workspace.name },
                  { label: "Plan", value: getPlanLabel(entitlements.planTier) },
                  { label: "Region", value: state.workspace.region },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
