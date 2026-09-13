import PublicSiteFrame from "./public-site-frame";
import { PublicHero, PublicRows, type PublicRowData } from "./public-page-components";

type StrategicSection = PublicRowData & { label: string };

export function StrategicPage({ eyebrow, title, intro, sections, cta }: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: StrategicSection[];
  cta: { label: string; href: string; secondaryLabel: string; secondaryHref: string };
}) {
  return <PublicSiteFrame>
    <PublicHero label={eyebrow} title={title} description={intro} secondary={{ label: cta.secondaryLabel, href: cta.secondaryHref }} />
    <PublicRows label="Operating examples" title="Work moves one clear responsibility at a time." rows={sections.map(({ label, ...section }) => ({ ...section, kicker: label }))} />
  </PublicSiteFrame>;
}
