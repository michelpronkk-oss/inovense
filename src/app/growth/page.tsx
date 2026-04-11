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
  title: "SEO, Content, and Paid Growth Systems",
  description:
    "Structured SEO infrastructure, content systems, paid media, and growth execution built to compound. Inovense builds growth assets you own.",
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
    title: "SEO, Content, and Paid Growth Systems | Inovense",
    description:
      "Structured SEO infrastructure, content systems, paid media, and growth execution built to compound. Inovense builds growth assets you own.",
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
