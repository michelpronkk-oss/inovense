import Nav from "@/components/nav";
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
