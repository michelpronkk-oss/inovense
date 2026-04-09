import type { Metadata } from "next";
import Nav from "@/components/nav";

export const metadata: Metadata = {
  title: {
    absolute: "Inovense | Digital Infrastructure for Operators",
  },
  description:
    "Websites, AI automation, and growth infrastructure for operators who compete on execution. Inovense builds systems that perform.",
  alternates: {
    canonical: "https://inovense.com",
  },
  openGraph: {
    url: "https://inovense.com",
    title: "Inovense | Digital Infrastructure for Operators",
    description:
      "Websites, AI automation, and growth infrastructure for operators who compete on execution. Inovense builds systems that perform.",
  },
};
import Footer from "@/components/footer";
import Hero from "@/components/home/hero";
import Trust from "@/components/home/trust";
import Services from "@/components/home/services";
import Why from "@/components/home/why";
import Process from "@/components/home/process";
import Work from "@/components/home/work";
import CTA from "@/components/home/cta";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <Hero />
        <Trust />
        <Services />
        <Why />
        <Process />
        <Work />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
