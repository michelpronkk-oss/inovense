import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell } from "@/components/marketing-ui";
import Hero from "@/components/home-v3/hero";
import { IntegrationsBand, StatsStrip } from "@/components/home-v3/bands";
import OperatingLayerSection from "@/components/home-v3/operating-layer";
import AgentsSection from "@/components/home-v3/agents";
import WorkflowsSection from "@/components/home-v3/workflows";
import MemorySection from "@/components/home-v3/memory";
import ApprovalsSection from "@/components/home-v3/approvals";
import IntegrationsSection from "@/components/home-v3/integrations-grid";
import SecuritySection from "@/components/home-v3/security";
import PricingSection from "@/components/home-v3/pricing";
import FinalCTA from "@/components/home-v3/final-cta";
import {
  INOVENSE_HOME_FAQS,
  INOVENSE_ORGANIZATION_ID,
  INOVENSE_URL,
  INOVENSE_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

export const metadata: Metadata = {
  title: {
    absolute: "Inovense | AI Operating Layer for Modern Businesses",
  },
  description:
    "Inovense OS is a self-serve AI operating layer for modern businesses. Operators propose, policies enforce, humans approve, and every action is logged.",
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
    title: "Inovense | AI Operating Layer for Modern Businesses",
    description:
      "Inovense OS is a self-serve AI operating layer for modern businesses. Operators propose, policies enforce, humans approve, and every action is logged.",
    images: [
      {
        url: "/opengraph-image",
        alt: "Inovense | Web, Systems, and Growth Built to Perform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inovense | AI Operating Layer for Modern Businesses",
    description:
      "Inovense OS is a self-serve AI operating layer for modern businesses. Operators propose, policies enforce, humans approve, and every action is logged.",
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
  name: "Inovense | AI Operating Layer for Modern Businesses",
  description:
    "Inovense OS is a self-serve AI operating layer for modern businesses. Connect tools, deploy operators, enforce policies, and execute workflows safely.",
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
    <div className="font-[family-name:var(--font-geist-sans)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(homePageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(homeFaqSchema) }}
      />
      <Nav />
      <main>
        <PageShell>
          <Hero />
          <IntegrationsBand />
          <OperatingLayerSection />
          <StatsStrip />
          <AgentsSection />
          <WorkflowsSection />
          <MemorySection />
          <ApprovalsSection />
          <IntegrationsSection />
          <SecuritySection />
          <PricingSection />
          <FinalCTA />
        </PageShell>
      </main>
      <Footer />
    </div>
  );
}
