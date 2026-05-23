import type { Metadata } from "next";
import ClaudeHomeV2 from "@/components/home/claude-home-v2";
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
        <ClaudeHomeV2 />
      </main>
    </>
  );
}
