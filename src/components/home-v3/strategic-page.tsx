import PublicSiteFrame from "./public-site-frame";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { ReactNode } from "react";
import { PublicHero, PublicCta, type PublicRowData } from "./public-page-components";

type StrategicSection = PublicRowData & { label: string; scenario: { problem: string; signal: string; next: string; outcome: string } };

export function StrategicPage({ eyebrow, title, intro, sections, cta, visual }: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: StrategicSection[];
  cta: { label: string; href: string; secondaryLabel: string; secondaryHref: string };
  visual?: ReactNode;
}) {
  const scenarioAccents = ["#4DE8E1", "#5B8DEF", "#51D88A", "#66D0E0"];

  return <PublicSiteFrame>
    <PublicHero action label={eyebrow} title={title} description={intro} secondary={{ label: cta.secondaryLabel, href: cta.secondaryHref }} visual={visual} />
    <div className="wrap public-scenarios">{sections.map((section, index) => <section className="public-scenario" key={section.title} aria-labelledby={`use-case-${index + 1}`} style={{ "--scenario-accent": scenarioAccents[index] ?? "#4DE8E1" } as CSSProperties}>
      <div className="scenario-context"><div className="scenario-kicker"><span className="lbl">{section.label}</span><span className="scenario-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></div><h2 id={`use-case-${index + 1}`}>{section.title}</h2><p>{section.scenario.problem}</p>
        <details className="public-disclosure"><summary>Explore this use case</summary><p>{section.body}</p><div className="public-row-links">{section.links?.map((link) => <Link href={link.href} key={link.href}>{link.label} →</Link>)}</div></details>
      </div>
      <div className="scenario-work"><span className="lbl">Illustrative workflow</span><dl><div><dt>Auterim notices</dt><dd>{section.scenario.signal}</dd></div><div><dt>What moves next</dt><dd>{section.scenario.next}</dd></div><div className="scenario-outcome"><dt>Intended outcome</dt><dd>{section.scenario.outcome}</dd></div></dl></div>
    </section>)}</div>
    <PublicCta title="Which work keeps waiting on your team?" description="Bring us one real scenario. We will help identify where an Operator could support it." />
  </PublicSiteFrame>;
}
