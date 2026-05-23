import type { Metadata } from "next";
import ClaudeHome from "@/components/home/claude-home";
import {
  INOVENSE_HOME_FAQS,
  INOVENSE_ORGANIZATION_ID,
  INOVENSE_URL,
  INOVENSE_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

export const metadata: Metadata = {
  title: {
    absolute: "Inovense | Conversion Websites and Client Acquisition Systems",
  },
  description:
    "Inovense builds conversion websites and automated client acquisition systems for service businesses, SaaS teams, consultants, agencies, and high-value local brands.",
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
    title: "Inovense | Conversion Websites and Client Acquisition Systems",
    description:
      "Inovense builds conversion websites and automated client acquisition systems for service businesses, SaaS teams, consultants, agencies, and high-value local brands.",
    images: [
      {
        url: "/opengraph-image",
        alt: "Inovense | Web, Systems, and Growth Built to Perform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inovense | Conversion Websites and Client Acquisition Systems",
    description:
      "Inovense builds conversion websites and automated client acquisition systems for service businesses, SaaS teams, consultants, agencies, and high-value local brands.",
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
  name: "Inovense | Conversion Websites and Client Acquisition Systems",
  description:
    "Inovense builds conversion websites, client acquisition systems, and growth infrastructure for businesses that need predictable commercial outcomes.",
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
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(homePageSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(homeFaqSchema) }}
        />
        <ClaudeHome />
      </main>
    </>
  );
}
