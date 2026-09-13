import Link from "next/link";
import type { ReactNode } from "react";
import type { EarlyAccessPlan } from "@/lib/early-access/validation";
import type { PricingPlan } from "@/lib/pricing";
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
  action = true,
  secondary,
}: {
  label: string;
  title: string;
  description: string;
  action?: boolean;
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="page-hero public-hero">
      <div className="wrap">
        <span className="lbl"><i aria-hidden="true" />{label}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {(action || secondary) && <div className="public-hero-actions">
          {action && <RequestEarlyAccessButton className="btn btn-a" />}
          {secondary && <Link href={secondary.href} className="btn btn-b">{secondary.label}</Link>}
        </div>}
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
              <div className="public-row-meta">
                <span className="public-row-number">{String(index + 1).padStart(2, "0")}</span>
                {row.kicker && <span>{row.kicker}</span>}
              </div>
              <div className="public-row-body">
                <h3>{row.title}</h3>
                <p>{row.body}</p>
                {row.bullets && <ul>{row.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
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

export function PublicPricing({ plans }: { plans: PricingPlan[] }) {
  return (
    <section className="sec public-content">
      <div className="wrap">
        <div className="public-section-heading">
          <span>Monthly plans</span>
          <div><h2>Choose operating capacity for your team.</h2><p>Every plan is requested through Early Access. A request does not create an account, start a trial, or charge a payment method.</p></div>
        </div>
        <div className="public-pricing">
          {plans.map((plan) => <article className={`public-plan${plan.featured ? " public-plan-featured" : ""}`} key={plan.plan_tier}>
            <span className="public-plan-label">{plan.plan_name}{plan.badge ? ` · ${plan.badge}` : ""}</span>
            <h3 className="public-plan-price">{plan.price}<small>{plan.period}</small></h3>
            <p>{plan.tagline}</p>
            <ul>{plan.features.filter((feature) => !feature.includes("3 days free")).map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <RequestEarlyAccessButton className="btn btn-a" plan={plan.plan_tier} />
          </article>)}
        </div>
        <p className="public-note">If invited, your workspace can choose to begin the three-day trial explicitly. Paid plan terms are shown before checkout.</p>
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
