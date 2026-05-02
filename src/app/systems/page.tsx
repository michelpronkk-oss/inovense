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
  title: "Client Acquisition Systems and Workflow Automation",
  description:
    "Automated intake, follow-up, proposal, onboarding, and CRM workflows designed to remove friction from your lead-to-client handoff.",
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
    title: "Automated client systems. Less leakage. | Inovense",
    description:
      "Custom workflows and CRM automation that keep qualified leads moving from intake to paid project without manual gaps.",
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
