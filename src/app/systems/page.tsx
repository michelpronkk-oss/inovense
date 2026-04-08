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
  title: "AI Automation and Business Process Systems",
  description:
    "AI automation, business process systems, CRM logic, and operational infrastructure that reduce friction and make your company run cleaner. Precision execution from Inovense.",
  alternates: {
    canonical: "https://inovense.com/systems",
  },
  openGraph: {
    url: "https://inovense.com/systems",
    title: "AI Automation and Business Process Systems | Inovense",
    description:
      "AI automation, business process systems, CRM logic, and operational infrastructure that reduce friction and make your company run cleaner. Precision execution from Inovense.",
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
