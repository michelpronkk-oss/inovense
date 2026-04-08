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

export const metadata: Metadata = {
  title: "Growth | Inovense",
  description:
    "SEO infrastructure, content systems, paid media, and growth execution built to compound. Precision growth work from Inovense.",
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
        <GrowthCTA />
      </main>
      <Footer />
    </>
  );
}
