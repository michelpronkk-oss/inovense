import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicPricing } from "@/components/home-v3/public-page-components";
import { PricingHeroVisual } from "@/components/home-v3/page-specific-hero-visuals";
import RevealMount from "@/components/home-v3/reveal-mount";
import { pricingPlans } from "@/lib/pricing";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim Pricing: Foundation, Workforce, and Scale";
const description = "Compare Auterim Foundation at $99, Workforce at $299, and Scale at $799 per month. Request Early Access; no trial or payment begins with your request.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/pricing" },
  openGraph: { url: "https://auterim.com/pricing", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/pricing")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/pricing")] },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return <PublicSiteFrame>
    <PublicHero className="pricing-hero" label="Pricing" title="Operating capacity that scales with the work." description="Choose the capacity that fits your team. Begin with an Early Access request; an invited workspace decides when to start its trial." secondary={{ label: "How the trial works", href: "/getting-started" }} visual={<PricingHeroVisual plans={pricingPlans} />} />
    <PublicPricing plans={pricingPlans} />
    <RevealMount />
  </PublicSiteFrame>;
}
