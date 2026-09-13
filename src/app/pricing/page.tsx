import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicPricing } from "@/components/home-v3/public-page-components";
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
    <PublicHero label="Pricing" title="Operating capacity that scales with the work." description="Foundation, Workforce, and Scale are the canonical Auterim plans. Early Access remains active, so begin with a request and choose when to start a trial only after invitation." secondary={{ label: "How the trial works", href: "/getting-started" }} />
    <PublicPricing plans={pricingPlans} />
  </PublicSiteFrame>;
}
