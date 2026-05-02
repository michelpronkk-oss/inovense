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
  title: "Client Flow Systems and Acquisition Automation",
  description:
    "Intake, qualification, follow-up, proposal, payment, onboarding, and CRM handoff systems built to reduce leakage after the first click.",
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
    title: "The Client Flow Behind Every Better Website | Inovense",
    description:
      "Client acquisition systems that keep qualified leads moving from intake to paid project without manual gaps.",
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
