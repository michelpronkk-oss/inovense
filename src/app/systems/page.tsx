import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import SystemsHero from "@/components/systems/systems-hero";
import SystemsOfferings from "@/components/systems/systems-offerings";
import SystemsDifference from "@/components/systems/systems-difference";
import SystemsStandard from "@/components/systems/systems-standard";
import SystemsOutcomes from "@/components/systems/systems-outcomes";
import SystemsProcess from "@/components/systems/systems-process";
import SystemsCTA from "@/components/systems/systems-cta";
import RelatedServices from "@/components/related-services";

export const metadata: Metadata = {
  title: "Business Operations Systems and Internal Tooling",
  description:
    "Custom CRM logic, internal tooling, operational workflows, and business process infrastructure designed around how your team actually works. Built for the long-term, not stitched together.",
  alternates: {
    canonical: "https://inovense.com/systems",
    languages: {
      en: "https://inovense.com/systems",
      nl: "https://inovense.com/nl/systems",
      "x-default": "https://inovense.com/systems",
    },
  },
  openGraph: {
    url: "https://inovense.com/systems",
    title: "Business Operations Systems and Internal Tooling | Inovense",
    description:
      "Custom CRM logic, internal tooling, operational workflows, and business process infrastructure designed around how your team actually works. Built for the long-term, not stitched together.",
  },
};

export default function SystemsPage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <SystemsHero />
        <SystemsOfferings />
        <SystemsDifference />
        <SystemsStandard />
        <SystemsOutcomes />
        <SystemsProcess />
        <RelatedServices current="systems" />
        <SystemsCTA />
      </main>
      <Footer />
    </>
  );
}
