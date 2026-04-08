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

export const metadata: Metadata = {
  title: "AI Automation and Business Systems",
  description:
    "AI workflows, automation infrastructure, CRM logic, and operational systems that reduce friction and make your company run cleaner. Precision execution from Inovense.",
  alternates: {
    canonical: "https://inovense.com/systems",
  },
  openGraph: {
    url: "https://inovense.com/systems",
    title: "AI Automation and Business Systems | Inovense",
    description:
      "AI workflows, automation infrastructure, CRM logic, and operational systems that reduce friction and make your company run cleaner. Precision execution from Inovense.",
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
        <SystemsCTA />
      </main>
      <Footer />
    </>
  );
}
