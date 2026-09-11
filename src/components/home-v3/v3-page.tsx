"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getPublicWorkspaceCta, usePublicUserState } from "@/lib/public-user-state";
import { pricingPlans, resolvePublicPlanCta } from "@/lib/pricing";
import { AUTERIM_HOME_FAQS } from "@/lib/geo";
import OperatorsEditorial from "./operators-editorial";
import HeroEditorial from "./hero-editorial";
import V3Footer from "./v3-footer";
import { Icon } from "./icons";
import { LOGOS } from "./integrations-grid";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";
import "./premium-home-sections.css";
import "./premium-profile.css";
import "./responsive-copy.css";

const PRODUCT_STORY = [
  ["01", "Connect", "Connect the tools your business already uses."],
  ["02", "Understand", "Auterim uses the context you choose to provide."],
  ["03", "Find", "Operators detect work, risks, blockers, and follow-ups."],
  ["04", "Handle", "Auterim prepares or executes the next action under your rules."],
  ["05", "Measure", "Outcomes are tracked so you can see what actually happened."],
] as const;

const CONNECTOR_NODES = [
  ["Gmail", "Gmail"],
  ["HubSpot", "HubSpot"],
  ["Google Drive", "Drive"],
  ["Slack", "Slack"],
  ["Trello", "Trello"],
  ["Microsoft 365", "Outlook"],
  ["Asana", ""],
  ["Jira", ""],
  ["Zendesk", ""],
] as const;

const OUTCOME_GROUPS = [
  ["Work stays visible", ["Less work to chase", "Fewer things slipping through", "Clear accountability"]],
  ["The next move advances", ["Faster next actions", "Less manual monitoring", "Visible outcomes"]],
] as const;

export function Head({ label, title, body }: { label: string; title: string; body?: string }) {
  return <div className="head rv"><span className="lbl">{label}</span><div><h2>{title}</h2>{body && <p className="say">{body}</p>}</div></div>;
}

export default function V3Page() {
  const userState = usePublicUserState();
  const workspaceCta = getPublicWorkspaceCta(userState);
  const primaryCta = userState === "guest" ? { ...workspaceCta, label: "Set up 3-day trial" } : workspaceCta;

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".auterim-v3-page");
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) { nodes.forEach((node) => node.classList.add("in")); return; }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
    }), { threshold: 0.14 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return <div className="auterim-v3-page homepage-recomposed">
    <HeroEditorial />

    <section className="sec homepage-story" id="how"><div className="wrap">
      <Head label="How it works" title="Find the work before your team has to." body="Most AI tools wait for a prompt. Most automation tools wait for someone to build a workflow. Auterim starts by finding what needs attention." />
      <ol className="body homepage-loop rv" aria-label="How Auterim works">
        {PRODUCT_STORY.map(([number, title, body]) => <li key={number} className={title === "Find" ? "is-focus" : undefined}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}
      </ol>
    </div></section>

    <section className="sec homepage-difference" id="platform"><div className="wrap">
      <Head label="Why Auterim" title="It does not wait for instructions." body="Auterim is not a chatbot, an automation builder, or another place to manage work you already know about." />
      <div className="body homepage-contrast rv">
        <div className="homepage-contrast-muted">
          <div><small>01 · Chatbots</small><p>Wait for you to ask.</p></div>
          <div><small>02 · Automation builders</small><p>Wait for you to define workflows.</p></div>
          <div><small>03 · Project tools</small><p>Manage work you already know exists.</p></div>
        </div>
        <div className="homepage-contrast-auterim">
          <img className="homepage-contrast-mark" src="/brand/auterim-mark-live.svg" width="26" height="26" alt="Auterim" />
          <span className="homepage-contrast-kicker">The operating layer</span>
          <p>Finds the work before your team has to.</p>
          <small>Context in. Next move prepared.</small>
        </div>
      </div>
    </div></section>

    <OperatorsEditorial />

    <section className="sec homepage-control" id="control"><div className="wrap">
      <Head label="Control that stays yours" title="Your rules come first." body="Auterim can move work forward without becoming uncontrolled AI. Connected systems remain authoritative and every consequential action remains traceable." />
      <div className="homepage-control-model rv" aria-label="Governed work flow">
        <div className="homepage-control-rail"><span>Context</span><i /><span>Policy</span><i /><span>Approval</span><i /><span>Execute</span><i /><span>Outcome</span></div>
        <div className="homepage-control-execution"><Icon name="check" size={15} /><span>Execution stays inside the rules you set.</span></div>
      </div>
      <div className="body homepage-control-grid rv">
        <article><Icon name="check" size={16} /><h3>Prepare with context</h3><p>Approved memory and connected systems give operators the business context they need.</p></article>
        <article><Icon name="shield" size={16} /><h3>Pause for approval</h3><p>Sensitive actions wait for the owner you assign.</p></article>
        <article><Icon name="artifactPipeline" size={16} /><h3>Keep boundaries clear</h3><p>Policies define what can run, what needs review, and what stays blocked.</p></article>
        <article><Icon name="arrow" size={16} /><h3>Track the outcome</h3><p>Actions and outcomes remain visible after work moves forward.</p></article>
      </div>
    </div></section>

    <section className="sec homepage-connectors" id="connectors"><div className="wrap">
      <Head label="Your existing stack" title="Keep the tools you trust. Add Auterim on top." body="Connect the systems that give your first operator useful evidence. Auterim stays on top of the software your business already runs on." />
      <div className="body homepage-connector-stage rv" aria-label="Connected systems flow into Auterim">
        <div className="homepage-connector-systems">
          {CONNECTOR_NODES.map(([label, logo]) => <span key={label}><i>{LOGOS[logo]}</i>{label}</span>)}
        </div>
        <div className="homepage-connector-layer"><span className="lbl">Auterim operating layer</span><img className="homepage-connector-mark" src="/brand/auterim-mark-live.svg" width="36" height="36" alt="Auterim" /><strong>Prepared work</strong><p>Connected context becomes a clear next move.</p></div>
        <div className="homepage-connector-output"><span>Signals</span><i>→</i><span>Context</span><i>→</i><span>Operator</span></div>
      </div>
      <Link className="homepage-text-link" href="/integrations">See supported connectors <span aria-hidden="true">→</span></Link>
    </div></section>

    <section className="sec homepage-outcomes" id="outcomes"><div className="wrap">
      <Head label="What changes" title="Less work to chase. More work moving." body="When the next move is visible across the systems you already use, important work no longer depends on someone remembering to look." />
      <div className="body homepage-outcome-stage rv">
        <div className="homepage-outcome-proof"><span className="lbl">Operational view</span><strong>One clear<br />next move.</strong><p><i />Work surfaced <b>Context ready</b><em>Approval held where needed</em></p></div>
        <div className="homepage-outcome-groups" aria-label="Operational outcomes">
          {OUTCOME_GROUPS.map(([title, outcomes], index) => <section key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><ul>{outcomes.map((outcome) => <li key={outcome}><Icon name="check" size={13} />{outcome}</li>)}</ul></section>)}
        </div>
      </div>
    </div></section>

    <section className="sec homepage-pricing" id="pricing"><div className="wrap">
      <Head label="Start when you are ready" title="A controlled workforce, with a clear path to value." body="Set up your 3-day Foundation trial in the workspace, then choose the capacity that fits your operation." />
      <div className="body homepage-plan-teaser rv">
        {pricingPlans.map((plan) => {
          const cta = resolvePublicPlanCta(plan, userState);
          return <article key={plan.plan_tier} className={plan.featured ? "is-featured" : undefined} data-plan={plan.plan_tier}>
            {plan.featured && <span className="homepage-plan-badge">Recommended</span>}
            <h3>{plan.plan_name}</h3><p className="homepage-plan-price">{plan.price}<small>{plan.period}</small></p><p>{plan.tagline}</p>
            <ul>{plan.features.slice(0, 3).map((feature) => <li key={feature}><Icon name="check" size={13} />{feature}</li>)}</ul>
            <Link href={cta.href}>{userState === "guest" ? "Set up trial" : cta.label} <span aria-hidden="true">→</span></Link>
          </article>;
        })}
      </div>
    </div></section>

    <section className="sec homepage-faq" id="faq"><div className="wrap">
      <Head label="Questions" title="What you need to know before you connect." />
      <div className="body faq rv">{AUTERIM_HOME_FAQS.map(({ question, answer }, index) => <details key={question}><summary><span className="faq-index">{String(index + 1).padStart(2, "0")}</span><span className="faq-q">{question}</span><span className="faq-toggle" aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
    </div></section>

    <section className="close homepage-final-cta"><div className="wrap close-in rv"><div className="close-main"><span className="lbl">Start with the work that matters most</span><h2>Find your first operator.</h2><p>Connect your business context. Auterim will show where your workforce can start.</p><div className="close-actions"><Link href={primaryCta.href} className="btn btn-a">{primaryCta.label} <span className="arrow">→</span></Link><a href="#how" className="close-run">See how it works <span>→</span></a></div></div><div className="homepage-final-proof" aria-label="Auterim starts with governed work"><span>First operator</span><strong>Revenue Operator ready</strong><p><i />Context connected</p><p><i />Approval boundary set</p><p><i />First signal ready</p></div></div></section>
    <V3Footer />
  </div>;
}
