/* eslint-disable @typescript-eslint/ban-ts-comment */
// The source-faithful tuple markup intentionally mirrors the static handoff data.
// @ts-nocheck
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { appHref } from "@/lib/urls";
import OperatorsEditorial from "./operators-editorial";
import HeroEditorial from "./hero-editorial";
import RunTrace from "./run-trace";
import V3Footer from "./v3-footer";
import { Icon } from "./icons";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";


const DATA = {
  profile: [["Company", "Atlas Studio, professional services, 12 people", "Confirmed", "ok"], ["Systems of record", "Gmail and HubSpot carry client communication and pipeline", "Confirmed", "ok"], ["Customer journey", "Enquiry, proposal, onboarding, recurring delivery", "Inferred from website", "inf"], ["Repeated work", "Onboarding information is collected by hand for every client", "Inferred from tools", "inf"], ["Where work waits", "Lead replies queue behind one person's inbox", "Needs review", "rev"], ["Billing", "No billing system named. Left out of scope until you add one.", "Not provided", ""]],
  faq: [["What is an operator?", "A role with a defined scope, its own instructions and memory, the connectors its work requires, and a fixed approval boundary. It detects work, prepares it, waits at the gate, executes what you approve and logs the result."], ["How does Auterim know which operators I need?", "From your operating profile: website, industry, size, goals, tools and team structure. It looks for work that is delayed, missed or repeated by hand, and states the reason behind every recommendation."], ["Do I have to build workflows?", "No. Operators arrive with their role and workflows already defined, adapted to your profile. You adjust boundaries rather than designing anything from scratch."], ["Can an operator act without approval?", "Only where you have allowed it, such as reading messages or preparing drafts. Everything on the approval list waits for the named owner, and blocked actions never run."], ["Which tools connect today?", "Gmail, HubSpot, Google Calendar and Slack are available. Notion and Google Drive are in preview, Stripe is coming."], ["What if an operator lacks information?", "It stops and says so. Missing context is marked as not provided and the operator asks you instead of guessing."], ["Can I explore without connecting real data?", "Yes. Preview builds a profile from public information and shows recommendations and demo runs without touching a single system."]],
};

export function Head({ label, title, body }: { label: string; title: string; body?: string }) { return <div className="head rv"><span className="lbl">{label}</span><div><h2>{title}</h2>{body && <p className="say">{body}</p>}</div></div>; }

export default function V3Page() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".auterim-v3-page");
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
    const sequences = Array.from(root.querySelectorAll<HTMLElement>(".v3-proof-sequence, .hero-product, .hero-product-flow, .hero-scene, .hero-artifact, .connect-bridge, .conns-set, .prof, .trace, .pol, .steps"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("in"));
      sequences.forEach((node) => node.classList.add("sequence-in"));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        if (sequences.includes(entry.target)) entry.target.classList.add("sequence-in");
        if (entry.target.classList.contains("steps")) {
          window.setTimeout(() => entry.target.classList.add("loop-step-2"), 700);
          window.setTimeout(() => entry.target.classList.add("loop-step-3"), 1400);
        }
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.16 });
    nodes.forEach((node) => observer.observe(node));
    sequences.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return <div className="auterim-v3-page">
    <HeroEditorial />
    <section className="sec connect-editorial" id="connect"><div className="wrap"><Head label="01 / Connect" title="Start with the context you already have." body="Auterim turns the systems, working rules and business knowledge that already describe your company into a shared starting point for every operator." /><div className="body connect-editorial-grid rv">{[["01", "Company", "What the business does, who it serves and how it positions itself.", "Website, goals and offer"], ["02", "Systems", "The sources where customer history, team activity and work already live.", "Gmail, HubSpot, Calendar and Slack"], ["03", "Controls", "The people, policies and approval boundaries that shape safe work.", "Owners, permissions and approvals"]].map(([number, title, body, cue]) => <article key={number}><span className="connect-editorial-number">{number}</span><h3>{title}</h3><p>{body}</p><span className="connect-editorial-cue"><i />{cue}</span></article>)}</div><p className="connect-editorial-result rv"><i />The result is one company profile every operator can work from.</p></div></section>
    <section className="sec" id="how"><div className="wrap"><Head label="The loop" title="Understand the company first. Recommend second. Execute last." body="Most AI tools hand you an empty canvas and wait for instructions. Auterim starts with your business." /><div className="body steps rv">{[["01", "Understand", "Your website, goals, tools, team and approval owner become one structured operating profile.", "Company profile"], ["02", "Recommend", "Auterim names the operators with the clearest path to value, and says exactly why each one fits.", "Recommended workforce"], ["03", "Execute", "Operators prepare work in your real systems, stop at every gate you set, and log what happened.", "Runs and approvals"]].map(([n, h, b, cue], i) => <div className={`step ${i === 0 ? "live" : ""}`} key={n}><span className="n">{n}</span><h3>{h}</h3><p>{b}</p><div className="cue"><span className="d" />{cue}</div></div>)}</div></div></section>
    <section className="sec" id="profile"><div className="wrap"><Head label="Company context" title="Know the company before recommending the work." body="Your website, systems, processes, goals and approval structure become a reusable company profile every operator can work from." /><div className="body prof rv">{[DATA.profile.slice(0, 3), DATA.profile.slice(3)].map((column, i) => <div key={i}>{column.map(([k, v, status, tone]) => <div className="pr" key={k}><span className="k">{k}</span><span className="v">{v}<s className={tone}>{status}</s></span></div>)}</div>)}</div></div></section>
    <OperatorsEditorial />
    <RunTrace />
    <section className="sec" id="policy"><div className="wrap"><Head label="Boundaries" title="Autonomy, with boundaries you control." body="Every operator has a defined scope. Some actions can run automatically, some stop for approval, and some are blocked entirely." /><div className="body pol rv">{[["a", "Can act", ["Read inbound messages", "Search the CRM", "Prepare replies", "Add internal notes"]], ["b", "Needs approval", ["Send external messages", "Change deal stages", "Offer discounts", "Contact new domains"]], ["c", "Never allowed", ["Delete CRM records", "Export customer databases", "Send bulk campaigns", "Change company policies"]]].map(([tone, title, items]) => <div className={`pcol ${tone}`} key={title as string}><div className="h">{title as string}</div><ul>{(items as string[]).map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div><p className="pol-line rv">Revenue Operator <span>·</span> Sales scope <span>·</span> Approval owner: M. Keller</p></div></section>
    <section className="sec" id="arch"><div className="wrap"><Head label="Architecture" title="AI does not touch your business alone." body="Auterim assembles context, prepares the work and enforces an approval boundary before any connected system changes." /><div className="body architecture-ledger rv" aria-label="Auterim controlled operating architecture">
      <section className="architecture-column architecture-systems"><span className="lbl">Your business systems</span><h3>Keep the systems you trust.</h3><p>They remain the source of truth. Auterim reads the context they hold.</p><div className="architecture-chips">{["CRM and customer history", "Inbox and client communication", "Calendar, documents and project work"].map((item) => <span className="architecture-chip" key={item}><i />{item}</span>)}</div></section>

      <div className="architecture-flow architecture-flow-a" aria-hidden="true"><Icon name="arrow" size={14} strokeWidth={1.8} className="architecture-flow-dot" /></div>

      <section className="architecture-column architecture-control"><div className="architecture-control-head"><span className="lbl">Auterim control layer</span><span className="architecture-control-pill"><i />Active boundary</span></div><h3>Context becomes prepared work.</h3><p>Operators use company context and policies, then pause for your judgment.</p><div className="architecture-control-steps">{[["01", "Understand", "Profile and memory"], ["02", "Prepare", "Operators and tools"], ["03", "Control", "Policies and owners"]].map(([number, title, note]) => <div key={number}><b>{number}</b><strong>{title}</strong><span>{note}</span></div>)}</div></section>

      <div className="architecture-flow architecture-flow-b" aria-hidden="true"><Icon name="arrow" size={14} strokeWidth={1.8} className="architecture-flow-dot" /></div>

      <section className="architecture-column architecture-outcomes"><span className="lbl">Approved outcomes</span><h3>Only approved work returns.</h3><p>Nothing reaches Gmail, HubSpot or another system until the owner decides.</p><div className="architecture-chips">{["External messages", "CRM updates", "Tasks, handoffs and memory updates"].map((item) => <span className="architecture-chip" key={item}><i />{item}</span>)}</div></section>

      <div className="architecture-gate"><span className="gate-tag">Approval boundary</span><strong>External actions stop here. Your team decides what happens next.</strong><span>Every approved change is logged and measured.</span></div>
    </div></div></section>
    <section className="sec"><div className="wrap"><Head label="Where work gets unstuck" title="Not another app. The layer your operations run through." body="Auterim sits across the systems you already use: qualifying, preparing and handing off the work that used to wait on a person, and pausing wherever approval is required." /><div className="body uc rv">{[["Lead response", "New enquiries sit in an inbox until someone has time to triage them.", "The enquiry is qualified, a first reply is prepared and the CRM is updated within minutes.", "Nothing is sent until someone approves it."], ["Client onboarding", "Key details are chased across email, docs and calls, delaying delivery before it starts.", "A coordinated onboarding plan, next steps and internal handoff are prepared in one place.", "Client data stays in the systems your team already uses."], ["Weekly operations", "Status updates are collected manually from multiple systems and often arrive late.", "A weekly brief surfaces blockers, next actions and pending approvals automatically.", "Your team reviews the output before anything important is shared."]].map(([h, before, after, proof]) => <div className="ucr" key={h}><h3>{h}</h3><div className="b"><span className="k">Without Auterim</span>{before}</div><div className="a"><span className="k">With Auterim</span><strong>{after}</strong><span className="ucr-proof"><i />{proof}</span></div></div>)}</div><p className="uc-result rv"><i />Three of the patterns already running today. The same approach applies anywhere work in your business waits on a person.</p></div></section>
    <section className="sec" id="pricing"><div className="wrap"><Head label="Getting started" title="Start free. Pay when Auterim starts doing real work." body="Preview your operating profile and recommended workforce at no cost. Connect systems and deploy approval-gated operators when you are ready." /><div className="body plans rv">{[["Preview", "$0 / month", "See the opportunity", ["Company profile from public information", "Recommended operators with rationale", "Demo runs and approval gates", "No connected systems or external actions"]], ["Foundation", "$399 / month", "Deploy your first operators", ["Up to 3 active operators", "Connect up to 3 systems", "Company memory, approvals and audit history", "1,000 controlled runs / month"]], ["Workforce", "$999 / month", "Run essential work across teams", ["Up to 8 active operators", "Connect up to 8 systems", "Shared approvals and advanced policies", "5,000 controlled runs / month"]], ["Enterprise", "From $2,500 / month", "Roll out with control", ["Custom operators, connectors and policies", "SSO, security and dedicated environments", "Implementation and enablement", "SLA, governance and priority support"]]].map(([h, amount, fit, items], i) => { const [pricePart, period] = (amount as string).split(" / "); const from = pricePart.startsWith("From "); const price = from ? pricePart.slice(5) : pricePart; return <div className={`pl ${i === 0 ? "now" : ""}`} key={h}>{i === 0 && <span className="pl-badge">Free preview</span>}{i === 2 && <span className="pl-badge pl-badge-alt">Most popular</span>}<h3>{h}</h3><span className="amt">{from && <i>From </i>}<b>{price}</b><i> / {period}</i></span><p className="pl-fit">{fit}</p><span className="pl-includes">Includes</span><ul>{(items as string[]).map((x) => <li key={x}><Icon name="check" size={13} strokeWidth={2} />{x}</li>)}</ul>{i === 0 ? <Link className="go" href={appHref("/app/onboarding")}>Start preview →</Link> : <a className="go" href="mailto:hello@auterim.com?subject=Auterim%20pricing">Talk to us →</a>}</div>; })}</div></div></section>
    <section className="sec" id="faq"><div className="wrap"><Head label="Questions" title="How it works, and where it stops." /><div className="body faq rv">{DATA.faq.map(([q, a], i) => <details key={q}><summary><span className="faq-index">{String(i + 1).padStart(2, "0")}</span><span className="faq-q">{q}</span><span className="faq-toggle" aria-hidden="true" /></summary><p>{a}</p></details>)}</div></div></section>
    <section className="close"><div className="wrap close-in rv"><div className="close-main"><span className="lbl"><i aria-hidden="true" />Start with your company</span><h2>Find the work your business shouldn't do by hand.</h2><p>Auterim finds the work that's delayed or repeated by hand, and shows the operators that can take it on.</p><div className="close-actions"><Link href={appHref("/app/onboarding")} className="btn btn-a">Build my operating profile <span className="arrow">→</span></Link><a href="#run" className="close-run">See a real run <span>→</span></a></div></div><aside className="close-preview" aria-label="What the Auterim preview includes"><div className="close-preview-head"><span className="lbl">Your preview</span></div><div className="close-preview-steps"><div className="close-preview-line" aria-hidden="true"><span className="close-preview-spark" /></div>{[["01", "user", "Company profile"], ["02", "users", "Recommended workforce"], ["03", "bolt", "Demo run"]].map(([number, icon, title]) => <div className="close-preview-step" key={number}><span className="close-preview-step-ic"><Icon name={icon} size={18} strokeWidth={1.6} /></span><strong>{title}</strong></div>)}</div></aside></div></section>
    <V3Footer />
  </div>;
}
