import Link from "next/link";
import type { ReactNode } from "react";
import type { EarlyAccessPlan } from "@/lib/early-access/validation";
import type { PricingPlan } from "@/lib/pricing";
import HeroOperatingArtifact from "./hero-operating-artifact";
import RequestEarlyAccessButton from "./request-early-access-button";

export type PublicRowData = {
  kicker?: string;
  title: string;
  body: string;
  bullets?: string[];
  links?: Array<{ label: string; href: string }>;
};

export function PublicHero({
  label,
  title,
  description,
  action = false,
  secondary,
  visual,
  className = "",
}: {
  label: string;
  title: string;
  description: string;
  action?: boolean;
  secondary?: { label: string; href: string };
  visual?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`page-hero public-hero ${className}`}>
      <div className="hero-editorial-tex" aria-hidden="true" />
      <div className="hero-editorial-beam" aria-hidden="true" />
      <div className="hero-editorial-aura" aria-hidden="true" />
      <div className="wrap public-hero-layout">
        <div className="public-hero-copy">
          <span className="lbl"><i aria-hidden="true" />{label}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {(action || secondary) && <div className="public-hero-actions">
            {action && <RequestEarlyAccessButton className="btn btn-a" />}
            {secondary && <Link href={secondary.href} className="btn btn-b">{secondary.label}</Link>}
          </div>}
        </div>
        {visual ?? <HeroOperatingArtifact />}
      </div>
    </section>
  );
}

export function PublicRows({
  label,
  title,
  description,
  rows,
  note,
  className = "",
}: {
  label: string;
  title: string;
  description?: string;
  rows: PublicRowData[];
  note?: string;
  className?: string;
}) {
  return (
    <section className={`sec public-content ${className}`}>
      <div className="wrap">
        <div className="public-section-heading">
          <span>{label}</span>
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        </div>
        <div className="public-editorial-list">
          {rows.map((row, index) => (
            <article className="public-editorial-row" key={`${row.title}-${index}`}>
              <div className="public-row-body">
                {row.kicker && <span className="public-row-meta">{row.kicker}</span>}
                <h3>{row.title}</h3>
                <p>{row.body}</p>
                {row.bullets && <details className="public-disclosure"><summary>View details</summary><ul>{row.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></details>}
                {row.links && <div className="public-row-links">{row.links.map((link) => <Link href={link.href} key={`${link.href}-${link.label}`}>{link.label}<span aria-hidden="true">→</span></Link>)}</div>}
              </div>
            </article>
          ))}
        </div>
        {note && <p className="public-note">{note}</p>}
      </div>
    </section>
  );
}

export function PublicCta({
  title,
  description,
  plan,
}: {
  title: string;
  description: string;
  plan?: EarlyAccessPlan | null;
}) {
  return (
    <section className="close public-cta">
      <div className="wrap">
        <div className="public-cta-inner">
          <div><span className="lbl">Early Access</span><h2>{title}</h2><p>{description}</p></div>
          <RequestEarlyAccessButton className="btn btn-a" plan={plan ?? null} />
        </div>
      </div>
    </section>
  );
}

const publicPlanDescriptions: Record<PricingPlan["plan_tier"], string> = {
  foundation: "Begin with a focused set of operators and controlled runs.",
  workforce: "Coordinate essential work across more operators and connected systems.",
  scale: "Expand capacity across more teams, systems, and workflows.",
};

export function PublicPricing({ plans }: { plans: PricingPlan[] }) {
  return (
    <section className="sec public-content public-pricing-section">
      <div className="wrap">
        <div className="public-pricing-intro">
          <h2 className="public-pricing-heading">Monthly plans</h2>
          <p>Compare operator, connected system, and controlled run capacity for your team.</p>
        </div>
        <div className="public-pricing">
          {plans.map((plan) => <article className={`public-plan${plan.featured ? " public-plan-featured" : ""}`} key={plan.plan_tier}>
            <div className="public-plan-heading-row">
              <h3 className="public-plan-name">{plan.plan_name}</h3>
              {plan.badge && <span className="public-plan-badge">{plan.badge}</span>}
            </div>
            <p className="public-plan-price">{plan.price}<small>{plan.period}</small></p>
            <p className="public-plan-tagline">{publicPlanDescriptions[plan.plan_tier]}</p>
            <ul>{plan.features.filter((feature) => !feature.includes("3 days free")).map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <RequestEarlyAccessButton className="btn btn-a" plan={plan.plan_tier} />
          </article>)}
        </div>
        <p className="public-note">Every plan is requested through Early Access. A request does not create an account, start a trial, or charge a payment method. If invited, your workspace can choose to begin the three-day trial explicitly. Paid plan terms are shown before checkout.</p>
      </div>
    </section>
  );
}

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return <>
    <section className="page-hero public-hero legal-hero"><div className="wrap"><span className="lbl"><i aria-hidden="true" />Legal</span><h1>{title}</h1><span className="legal-updated">Last updated: September 2026</span></div></section>
    <section className="sec public-content legal-content"><div className="wrap"><article className="legal-copy">{children}</article></div></section>
  </>;
}
