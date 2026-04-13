import type { Metadata } from "next";
import Footer from "@/components/footer";
import CTA from "@/components/home/cta";
import GeoAnswers from "@/components/home/geo-answers";
import Hero from "@/components/home/hero";
import Process from "@/components/home/process";
import Services from "@/components/home/services";
import Trust from "@/components/home/trust";
import Why from "@/components/home/why";
import Work from "@/components/home/work";
import Nav from "@/components/nav";
import {
  INOVENSE_HOME_FAQS,
  INOVENSE_ORGANIZATION_ID,
  INOVENSE_URL,
  INOVENSE_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

export const metadata: Metadata = {
  title: {
    absolute: "Inovense | Web, Systems, and Growth Built to Perform",
  },
  description:
    "Conversion-focused websites, AI workflows, and growth systems for ambitious companies that compete on execution.",
  alternates: {
    canonical: "https://inovense.com",
    languages: {
      en: "https://inovense.com",
      nl: "https://inovense.com/nl",
      "x-default": "https://inovense.com",
    },
  },
  openGraph: {
    url: "https://inovense.com",
    title: "Inovense | Web, Systems, and Growth Built to Perform",
    description:
      "Conversion-focused websites, AI workflows, and growth systems for ambitious companies that compete on execution.",
    images: [
      {
        url: "/opengraph-image",
        alt: "Inovense | Web, Systems, and Growth Built to Perform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inovense | Web, Systems, and Growth Built to Perform",
    description:
      "Conversion-focused websites, AI workflows, and growth systems for ambitious companies that compete on execution.",
    images: [
      {
        url: "/opengraph-image",
        alt: "Inovense | Web, Systems, and Growth Built to Perform",
      },
    ],
  },
};

const homePageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${INOVENSE_URL}/#home`,
  url: INOVENSE_URL,
  name: "Inovense | Web, Systems, and Growth Built to Perform",
  description:
    "Inovense helps operators build digital infrastructure across Build, Systems, and Growth lanes.",
  isPartOf: {
    "@id": INOVENSE_WEBSITE_ID,
  },
  about: {
    "@id": INOVENSE_ORGANIZATION_ID,
  },
  inLanguage: "en",
};

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${INOVENSE_URL}/#home-faq`,
  mainEntity: INOVENSE_HOME_FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(homePageSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(homeFaqSchema) }}
        />
        <Hero />
        <Trust />
        <Services />
        <GeoAnswers />
        <Why />
        <Process />
        <Work />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
