import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import GrowthHero from "@/components/growth/growth-hero";
import GrowthOfferings from "@/components/growth/growth-offerings";
import GrowthDifference from "@/components/growth/growth-difference";
import GrowthStandard from "@/components/growth/growth-standard";
import GrowthOutcomes from "@/components/growth/growth-outcomes";
import GrowthProcess from "@/components/growth/growth-process";
import GrowthCTA from "@/components/growth/growth-cta";
import RelatedServices from "@/components/related-services";

export const metadata: Metadata = {
  title: "Growth Loops for Acquisition Systems",
  description:
    "Campaign assets, landing-page variants, proof loops, and source feedback built to improve acquisition systems over time.",
  alternates: {
    canonical: "https://inovense.com/growth",
    languages: {
      en: "https://inovense.com/growth",
      nl: "https://inovense.com/nl/growth",
      "x-default": "https://inovense.com/growth",
    },
  },
  openGraph: {
    url: "https://inovense.com/growth",
    title: "Growth Loops Built Around the System | Inovense",
    description:
      "Growth execution for teams that care about qualified leads, conversion quality, and long-term pipeline signal.",
  },
};

export default function GrowthPage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <GrowthHero />
        <GrowthOfferings />
        <GrowthDifference />
        <GrowthStandard />
        <GrowthOutcomes />
        <GrowthProcess />
        <RelatedServices current="growth" />
        <GrowthCTA />
      </main>
      <Footer />
    </>
  );
}
