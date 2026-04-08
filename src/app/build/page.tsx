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

export const metadata: Metadata = {
  title: "Custom Website and Product Development",
  description:
    "Premium website design, conversion-focused landing pages, e-commerce builds, and full-stack digital products. Built to perform, not just to launch.",
  alternates: {
    canonical: "https://inovense.com/build",
  },
  openGraph: {
    url: "https://inovense.com/build",
    title: "Custom Website and Product Development | Inovense",
    description:
      "Premium website design, conversion-focused landing pages, e-commerce builds, and full-stack digital products. Built to perform, not just to launch.",
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
        <BuildCTA />
      </main>
      <Footer />
    </>
  );
}
