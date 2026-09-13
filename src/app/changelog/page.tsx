import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicRows } from "@/components/home-v3/public-page-components";
import { changelogReleases } from "@/data/changelog";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim Changelog";
const description = "A dated record of verified Auterim product updates across operators, approvals, connectors, and the public product experience.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/changelog" },
  openGraph: { url: "https://auterim.com/changelog", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/changelog")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/changelog")] },
  robots: { index: true, follow: true },
};

const changeLabels = { new: "New", improved: "Improved", fixed: "Fixed" } as const;

export default function ChangelogPage() {
  const rows = changelogReleases.map((release) => ({
    kicker: release.date,
    title: release.title,
    body: release.summary,
    bullets: release.changes.map((change) => `${changeLabels[change.type]}: ${change.title}. ${change.description}`),
  }));

  return <PublicSiteFrame>
    <PublicHero label="Product updates" title="What changed in Auterim." description="A lightweight product changelog. Each entry is tied to merged repository history; it describes product work, not a guarantee of a business outcome." action={false} secondary={{ label: "Documentation", href: "/docs" }} />
    <PublicRows label="Verified releases" title="Progress across the operating layer." rows={rows} />
  </PublicSiteFrame>;
}
