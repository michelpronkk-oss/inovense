import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import BuildHero from "@/components/build/build-hero";
import BuildOfferings from "@/components/build/build-offerings";
import BuildDifference from "@/components/build/build-difference";
import BuildStandard from "@/components/build/build-standard";
import BuildWork from "@/components/build/build-work";
import BuildProcess from "@/components/build/build-process";
import BuildCTA from "@/components/build/build-cta";
import RelatedServices from "@/components/related-services";

export const metadata: Metadata = {
  title: "Conversion Website and Landing Page Build",
  description:
    "Conversion websites, landing pages, and Shopify builds for teams that need better qualified leads and stronger first-call trust.",
  alternates: {
    canonical: "https://inovense.com/build",
    languages: {
      en: "https://inovense.com/build",
      nl: "https://inovense.com/nl/build",
      "x-default": "https://inovense.com/build",
    },
  },
  openGraph: {
    url: "https://inovense.com/build",
    title: "Conversion websites and landing systems. | Inovense",
    description:
      "Custom-built websites and Shopify builds designed for conversion, speed, and handoff from lead to paid project.",
  },
};

export default function BuildPage() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <BuildHero />
        <BuildOfferings />
        <BuildDifference />
        <BuildStandard />
        <BuildWork />
        <BuildProcess />
        <RelatedServices current="build" />
        <BuildCTA />
      </main>
      <Footer />
    </>
  );
}
