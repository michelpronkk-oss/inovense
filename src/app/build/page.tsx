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
  title: "Build | Inovense",
  description:
    "Conversion-focused websites, landing pages, e-commerce builds, and full-stack digital products. Precision execution from Inovense.",
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
