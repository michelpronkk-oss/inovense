import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import Link from "next/link";
import { BookOpen, CircleDot, Layers3, ShieldCheck, Workflow, Wallet } from "lucide-react";
import { PublicHero, PublicCta } from "@/components/home-v3/public-page-components";
import { TopicGrid } from "@/components/home-v3/public-story-components";
import { DocsHeroVisual } from "@/components/home-v3/page-specific-hero-visuals";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim Documentation";
const description = "Start with Auterim Early Access, learn about Operators, connectors, policies, workflows, billing, and troubleshooting through current product guides.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/docs" },
  openGraph: { url: "https://auterim.com/docs", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/docs")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/docs")] },
  robots: { index: true, follow: true },
};

export default function DocumentationPage() {
  return <PublicSiteFrame>
    <PublicHero label="Documentation" title="Find your way into Auterim." description="Start with the essentials, then explore the work you want to move. Documentation is expanding during Early Access." visual={<DocsHeroVisual />} />
    <section className="public-story docs-topics" aria-label="Documentation topics"><div className="wrap">
      <TopicGrid topics={[
        { title: "Getting started", description: "From your first request to a workspace ready for review.", href: "/getting-started", Icon: BookOpen },
        { title: "Operators", description: "Meet the roles that watch, prepare, and follow through.", href: "/operators", Icon: CircleDot },
        { title: "Connectors", description: "Bring the systems you use into the operating loop.", href: "/connectors", Icon: Layers3 },
        { title: "Policies & approvals", description: "Set the boundary between preparation and action.", href: "/control", Icon: ShieldCheck },
        { title: "Workflows", description: "See how a signal becomes a controlled next move.", href: "/workflows", Icon: Workflow },
        { title: "Billing", description: "Understand plans, invitations, and explicit trial start.", href: "/pricing", Icon: Wallet },
      ]} />
      <p className="public-quiet-help">Need help with a connection or a run? <Link href="/contact">Contact support <span aria-hidden="true">→</span></Link></p>
    </div></section>
    <PublicCta title="Start with the work you know best." description="Tell us where your team needs a more reliable next step." />
  </PublicSiteFrame>;
}
