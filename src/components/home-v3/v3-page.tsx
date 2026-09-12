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
import { WhyAuterimVisual, ConnectorsVisual, OutcomesVisual, ControlVisual, FinalCtaVisual } from "./homepage-visuals";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";
import "./premium-home-sections.css";
import "./premium-profile.css";
import "./responsive-copy.css";
import "./homepage-visuals.css";

const PRODUCT_STORY = [
  ["01", "Connect", "Connect the tools your business already uses."],
  ["02", "Understand", "Auterim builds the context your operators need."],
  ["03", "Find", "Operators detect work, risks, follow-ups, and blockers."],
  ["04", "Handle", "Auterim prepares or executes the next action under your rules."],
  ["05", "Measure", "Outcomes show what actually happened."],
] as const;

const OUTCOME_GROUPS = [
  ["Work stays visible", ["Fewer missed follow-ups", "Clearer ownership"]],
  ["The next move advances", ["Faster next actions", "Less manual monitoring", "Visible outcomes"]],
] as const;

export function Head({ label, title, body }: { label: string; title: string; body?: string }) {
  return <div className="head rv"><span className="lbl">{label}</span><div><h2>{title}</h2>{body && <p className="say">{body}</p>}</div></div>;
}

export default function V3Page() {
  const userState = usePublicUserState();
  const workspaceCta = getPublicWorkspaceCta(userState);
  const primaryCta = userState === "guest" ? { ...workspaceCta, label: "Set up your workspace" } : workspaceCta;

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
      <Head label="How it works" title="From signal to next move." />
      <ol className="body homepage-loop rv" aria-label="How Auterim works">
        {PRODUCT_STORY.map(([number, title, body]) => <li key={number} className={title === "Find" ? "is-focus" : undefined}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}
      </ol>
    </div></section>

    <section className="sec homepage-difference" id="platform"><div className="wrap">
      <Head label="Why Auterim" title="It does not wait for instructions." body="Auterim is not a chatbot, an automation builder, or another place to manage work you already know about." />
      <div className="body homepage-contrast rv">
        <div className="homepage-contrast-muted">
          <div><small>01 · Chatbots</small><p>Wait for you to ask.</p></div>
          <div><small>02 · Automation builders</small><p>Wait for you to define the workflow.</p></div>
          <div><small>03 · Project tools</small><p>Manage work you already know exists.</p></div>
        </div>
        <div className="homepage-contrast-auterim homepage-contrast-visual">
          <WhyAuterimVisual />
        </div>
      </div>
    </div></section>

    <OperatorsEditorial />

    <section className="sec homepage-control" id="control"><div className="wrap">
      <Head label="Control that stays yours" title="Your rules come first." body="Auterim can move work forward without becoming uncontrolled AI. Connected systems remain authoritative and every consequential action remains traceable." />
      <div className="body homepage-control-visual rv" aria-label="Governed execution flow">
        <ControlVisual />
      </div>
    </div></section>

    <section className="sec homepage-connectors" id="connectors"><div className="wrap">
      <Head label="Your existing stack" title="Keep the tools you trust. Add Auterim on top." body="Auterim works across the systems your business already runs on, so your team does not have to replace its stack to add an AI workforce." />
      <div className="body homepage-connector-stage homepage-connector-stage-visual rv" aria-label="Connected systems flow into Auterim">
        <ConnectorsVisual />
      </div>
    </div></section>

    <section className="sec homepage-outcomes" id="outcomes"><div className="wrap">
      <Head label="What changes" title="Less work to chase. More work moving." body="When the next move is visible across the systems you already use, important work no longer depends on someone remembering to look." />
      <div className="body homepage-outcome-stage rv">
        <div className="homepage-outcome-proof homepage-outcome-proof-visual">
          <OutcomesVisual />
        </div>
        <div className="homepage-outcome-groups" aria-label="Operational outcomes">
          {OUTCOME_GROUPS.map(([title, outcomes], index) => <section key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><ul>{outcomes.map((outcome) => <li key={outcome}><Icon name="check" size={13} />{outcome}</li>)}</ul></section>)}
        </div>
      </div>
    </div></section>

    <section className="sec homepage-pricing" id="pricing"><div className="wrap">
      <Head label="Start when you are ready" title="Start controlled. Scale when the work proves its value." body="Set up your 3-day Foundation trial in the workspace, then choose the capacity that fits your operation." />
      <div className="body homepage-plan-teaser rv">
        {pricingPlans.map((plan) => {
          const cta = resolvePublicPlanCta(plan, userState);
          return <article key={plan.plan_tier} className={plan.featured ? "is-featured" : undefined} data-plan={plan.plan_tier}>
            {plan.featured && <span className="homepage-plan-badge"><i />Recommended</span>}
            <h3>{plan.plan_name}</h3><p className="homepage-plan-price">{plan.price}<small>{plan.period}</small></p><p>{plan.tagline}</p>
            <span className="homepage-plan-divider" aria-hidden="true" />
            <ul>{plan.features.slice(0, 3).map((feature) => <li key={feature}><span className="homepage-plan-check"><Icon name="check" size={10} /></span>{feature}</li>)}</ul>
            <span className="homepage-plan-spacer" aria-hidden="true" />
            <span className="homepage-plan-divider" aria-hidden="true" />
            <Link href={cta.href}>{userState === "guest" ? "Set up trial" : cta.label} <span aria-hidden="true">→</span></Link>
          </article>;
        })}
      </div>
    </div></section>

    <section className="sec homepage-faq" id="faq"><div className="wrap">
      <Head label="Questions" title="What you need to know before you connect." />
      <div className="body faq rv">{AUTERIM_HOME_FAQS.map(({ question, answer }, index) => <details key={question}><summary><span className="faq-index">{String(index + 1).padStart(2, "0")}</span><span className="faq-q">{question}</span><span className="faq-toggle" aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
    </div></section>

    <section className="close homepage-final-cta"><div className="wrap close-in rv"><div className="close-main"><span className="lbl">Start with the work that matters most</span><h2>Find your first operator.</h2><p>Connect your business context. Auterim will show where your workforce can start.</p><div className="close-actions"><Link href={primaryCta.href} className="btn btn-a">{primaryCta.label} <span className="arrow">→</span></Link><a href="#how" className="close-run">See how it works <span>→</span></a></div></div><FinalCtaVisual /></div></section>
    <V3Footer />
  </div>;
}
