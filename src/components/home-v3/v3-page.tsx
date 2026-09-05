/* eslint-disable @typescript-eslint/ban-ts-comment, react/no-unescaped-entities */
// The source-faithful tuple markup intentionally mirrors the static handoff data.
// @ts-nocheck
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getPublicWorkspaceCta, usePublicUserState } from "@/lib/public-user-state";
import { pricingPlans, resolvePublicPlanCta } from "@/lib/pricing";
import { OperatorAvatar } from "@/components/operators/avatar";
import { GLYPHS } from "@/data/operators";
import OperatorsEditorial from "./operators-editorial";
import HeroEditorial from "./hero-editorial";
import RunTrace from "./run-trace";
import V3Footer from "./v3-footer";
import { Icon } from "./icons";
import { ResponsiveCopy } from "./responsive-copy";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";
import "./premium-home-sections.css";
import "./premium-profile.css";
import "./responsive-copy.css";


const DATA = {
  profile: [["Company", "Atlas Studio, professional services, 12 people", "Confirmed", "ok"], ["Systems of record", "Gmail and HubSpot carry client communication and pipeline", "Confirmed", "ok"], ["Customer journey", "Enquiry, proposal, onboarding, recurring delivery", "Inferred from website", "inf"], ["Repeated work", "Onboarding information is collected by hand for every client", "Inferred from tools", "inf"], ["Where work waits", "Lead replies queue behind one person's inbox", "Needs review", "rev"], ["Billing", "No billing system named. Left out of scope until you add one.", "Not provided", ""]],
  faq: [["What is an operator?", "A role with a defined scope, its own instructions and memory, the connectors its work requires, and a fixed approval boundary. It detects work, prepares it, waits at the gate, executes what you approve and logs the result."], ["How does Auterim know which operators I need?", "From your operating profile: website, industry, size, goals, tools and team structure. It looks for work that is delayed, missed or repeated by hand, and states the reason behind every recommendation."], ["Do I have to build workflows?", "No. Operators arrive with their role and workflows already defined, adapted to your profile. You adjust boundaries rather than designing anything from scratch."], ["Can an operator act without approval?", "Only where you have allowed it, such as reading messages or preparing drafts. Everything on the approval list waits for the named owner, and blocked actions never run."], ["Which tools connect today?", "Gmail, HubSpot, Google Calendar and Slack are available. Notion and Google Drive are in preview, Stripe is coming."], ["What if an operator lacks information?", "It stops and says so. Missing context is marked as not provided and the operator asks you instead of guessing."], ["Can I explore without connecting real data?", "Yes. Preview builds a profile from public information and shows recommendations and demo runs without touching a single system."]],
};

const MOBILE_HEAD_COPY: Record<string, { title?: string; body?: string }> = {
  "01 / Connect": { body: "Turn your systems, rules and business knowledge into a shared starting point." },
  "The loop": { title: "Understand first. Recommend next. Execute with control.", body: "Auterim starts with your business, not an empty canvas." },
  "Company context": { title: "Know the business first.", body: "Auterim turns your context into a profile every operator can use." },
  "One real run": { body: "See one inbound lead become prepared work, then pause at human approval." },
  "Boundaries": { body: "Some actions run. Sensitive actions pause. Others never do." },
  "Architecture": { body: "Auterim prepares work across your systems, then pauses for judgment." },
  "Where work gets unstuck": { title: "Work should not wait.", body: "Auterim prepares and coordinates work across the systems you already use." },
  "Getting started": { title: "Choose your operation.", body: "Start with Foundation or Workforce. Add live systems when you are ready." },
};

export function Head({ label, title, body }: { label: string; title: string; body?: string }) {
  const mobile = MOBILE_HEAD_COPY[label];
  return <div className="head rv"><span className="lbl">{label}</span><div><h2><ResponsiveCopy desktop={title} mobile={mobile?.title} /></h2>{body && <p className="say"><ResponsiveCopy desktop={body} mobile={mobile?.body} /></p>}</div></div>;
}

export default function V3Page() {
  const userState = usePublicUserState();
  const workspaceCta = getPublicWorkspaceCta(userState);
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
    <section className="sec" id="policy"><div className="wrap"><Head label="Boundaries" title="Autonomy, with boundaries you control." body="Every operator has a defined scope. Some actions can run automatically, some stop for approval, and some are blocked entirely." /><div className="body pol rv">{[["a", "Can act", ["Read inbound messages", "Search the CRM", "Prepare replies", "Add internal notes"]], ["b", "Needs approval", ["Send external messages", "Change deal stages", "Offer discounts", "Contact new domains"]], ["c", "Never allowed", ["Delete CRM records", "Export customer databases", "Send bulk campaigns", "Change company policies"]]].map(([tone, title, items]) => <div className={`pcol ${tone}`} key={title as string}><div className="h">{title as string}</div><ul>{(items as string[]).map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div><p className="pol-line rv"><span className="pol-tag">Revenue Operator<em>·</em>Sales scope</span><span className="pol-owner"><i />Approval owner: M. Keller</span></p></div></section>
    <section className="sec" id="arch"><div className="wrap"><Head label="Architecture" title="AI does not touch your business alone." body="Auterim assembles context, prepares the work and enforces an approval boundary before any connected system changes." /><div className="body architecture-ledger rv" aria-label="Auterim controlled operating architecture">
      <section className="architecture-column architecture-systems"><span className="lbl">Your business systems</span><h3>Keep the systems you trust.</h3><p>They remain the source of truth. Auterim reads the context they hold.</p><div className="architecture-chips">{["CRM and customer history", "Inbox and client communication", "Calendar, documents and project work"].map((item) => <span className="architecture-chip" key={item}><i />{item}</span>)}</div></section>

      <div className="architecture-flow architecture-flow-a" aria-hidden="true"><Icon name="arrow" size={14} strokeWidth={1.8} className="architecture-flow-dot" /></div>

      <section className="architecture-column architecture-control"><div className="architecture-control-head"><span className="lbl">Auterim control layer</span><span className="architecture-control-pill"><i />Active boundary</span></div><h3>Context becomes prepared work.</h3><p>Operators use company context and policies, then pause for your judgment.</p><div className="architecture-control-steps">{[["01", "Understand", "Profile and memory"], ["02", "Prepare", "Operators and tools"], ["03", "Control", "Policies and owners"]].map(([number, title, note]) => <div key={number}><b>{number}</b><strong>{title}</strong><span>{note}</span></div>)}</div></section>

      <div className="architecture-flow architecture-flow-b" aria-hidden="true"><Icon name="arrow" size={14} strokeWidth={1.8} className="architecture-flow-dot" /></div>

      <section className="architecture-column architecture-outcomes"><span className="lbl">Approved outcomes</span><h3>Only approved work returns.</h3><p>Nothing reaches Gmail, HubSpot or another system until the owner decides.</p><div className="architecture-chips">{["External messages", "CRM updates", "Tasks, handoffs and memory updates"].map((item) => <span className="architecture-chip" key={item}><i />{item}</span>)}</div></section>

      <div className="architecture-gate"><span className="gate-tag">Approval boundary</span><strong>Every external action waits for your decision.</strong></div>
    </div></div></section>
    <section className="sec"><div className="wrap"><Head label="Where work gets unstuck" title="Not another app. The layer your operations run through." body="Auterim sits across the systems you already use, qualifying and preparing the work that used to wait on a person, and pausing wherever approval is required." /><div className="body uc rv">{[["Lead response", "New enquiries sit in an inbox until someone gets to them.", "Qualified, replied to and logged in the CRM within minutes.", "Nothing sends until someone approves it."], ["Client onboarding", "Key details get chased across email, docs and calls before delivery even starts.", "One onboarding plan, with next steps and handoff, prepared before the first call.", "Client data stays in the systems your team already uses."], ["Weekly operations", "Status updates get collected by hand from multiple systems, and still arrive late.", "A weekly brief surfaces blockers, next actions and pending approvals automatically.", "Your team reviews the output before anything important goes out."]].map(([h, before, after, proof]) => <div className="ucr" key={h}><h3>{h}</h3><div className="b"><span className="k">Without Auterim</span>{before}</div><div className="a"><span className="k">With Auterim</span><strong>{after}</strong><span className="ucr-proof"><i />{proof}</span></div></div>)}</div><p className="uc-result rv"><i />Three of the patterns already running today. The same approach applies anywhere work in your business waits on a person.</p></div></section>
    <section className="sec" id="pricing">
      <div className="wrap">
        <Head label="Getting started" title="Choose the plan that fits your operation." body="Start with a three-day trial on Foundation or Workforce. Connect systems and deploy approval-gated operators when you are ready." />
        <div className="body plans rv">
          {pricingPlans.map((plan) => {
            const cta = resolvePublicPlanCta(plan, userState);
            return <article className={`pl${plan.featured ? " now" : ""}`} key={plan.plan_tier}>
              {plan.featured && <span className="pl-badge pl-badge-alt">Most popular</span>}
              <h3>{plan.plan_name}</h3>
              <span className="amt"><b>{plan.price}</b><i>/ month</i></span>
              <p className="pl-fit">{plan.tagline}</p>
              <span className="pl-trial">3-day trial included</span>
              <span className="pl-includes">Includes</span>
              <ul>{plan.features.slice(0, 5).map((feature) => <li key={feature}><Icon name="check" size={13} strokeWidth={2} />{feature}</li>)}</ul>
              <Link className="go" href={cta.href}>{cta.label} <span aria-hidden="true">→</span></Link>
            </article>;
          })}
        </div>
      </div>
    </section>
    <section className="sec" id="faq"><div className="wrap"><Head label="Questions" title="How it works, and where it stops." /><div className="body faq rv">{DATA.faq.map(([q, a], i) => <details key={q}><summary><span className="faq-index">{String(i + 1).padStart(2, "0")}</span><span className="faq-q">{q}</span><span className="faq-toggle" aria-hidden="true" /></summary><p>{a}</p></details>)}</div></div></section>
    <section className="close"><div className="wrap close-in rv"><div className="close-main"><span className="lbl"><i aria-hidden="true" />Your operating profile</span><h2>Find your first operator.</h2><p>Tell us how your business works. We&apos;ll recommend the first controlled operator to put in place.</p><div className="close-actions"><Link href={workspaceCta.href} className="btn btn-a">{workspaceCta.label} <span className="arrow">→</span></Link><a href="#run" className="close-run">See a real run <span>→</span></a></div></div><aside className="close-preview close-identity" aria-label="Recommended Revenue Operator"><div className="close-identity-top"><span className="close-identity-index">01 / Recommended</span><span className="close-identity-ready"><i />Ready</span></div><div className="close-identity-op"><OperatorAvatar color="#4DE8E1" glyph={GLYPHS.trend} size={44} /><div><h3>Revenue Operator</h3><span className="close-identity-tag">Sales / Pipeline</span></div></div><p className="close-identity-task">Lead follow-up: qualify replies and keep every deal moving.</p><ul className="close-identity-seq"><li>New lead detected<em>Done</em></li><li>Follow-up drafted<em>Done</em></li><li className="now">Send reply<em>Held at gate</em></li></ul><div className="close-identity-gate"><i />External replies wait for approval</div></aside></div></section>
    <V3Footer />
  </div>;
}
