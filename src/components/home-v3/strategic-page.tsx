import Link from "next/link";
import V3Footer from "./v3-footer";
import V3Header from "./v3-header";
import "./strategic-pages.css";

type StrategicSection = { label: string; title: string; body: string; links?: Array<{ label: string; href: string }> };

export function StrategicPage({ eyebrow, title, intro, sections, cta }: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: StrategicSection[];
  cta: { label: string; href: string; secondaryLabel: string; secondaryHref: string };
}) {
  return <div className="auterim-v3-page strategic-page"><V3Header /><main>
    <section className="strategic-hero"><div className="wrap strategic-wrap">
      <span className="lbl"><i aria-hidden="true" />{eyebrow}</span>
      <h1>{title}</h1><p>{intro}</p>
      <div className="strategic-actions"><Link href={cta.href} className="btn btn-a">{cta.label}<span className="arrow"> →</span></Link><Link href={cta.secondaryHref} className="btn btn-b">{cta.secondaryLabel}</Link></div>
    </div></section>
    <section className="strategic-body"><div className="wrap strategic-grid">
      {sections.map((section, index) => <article className="strategic-card" key={section.label}>
        <span className="strategic-index">{String(index + 1).padStart(2, "0")}</span><span className="lbl">{section.label}</span><h2>{section.title}</h2><p>{section.body}</p>
        {section.links && <div className="strategic-links">{section.links.map((link) => <Link key={link.href} href={link.href}>{link.label}<span>→</span></Link>)}</div>}
      </article>)}
    </div></section>
  </main><V3Footer /></div>;
}
