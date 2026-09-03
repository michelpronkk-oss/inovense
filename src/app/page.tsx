import type { Metadata } from "next";
import { PageShell } from "@/components/marketing-ui";
import V3Header from "@/components/home-v3/v3-header";
import V3Page from "@/components/home-v3/v3-page";
import {
  AUTERIM_HOME_FAQS,
  AUTERIM_ORGANIZATION_ID,
  AUTERIM_URL,
  AUTERIM_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

export const metadata: Metadata = {
  title: {
    absolute: "Auterim | AI Workforce Built Around Your Business",
  },
  description:
    "Auterim learns how your company works, recommends AI operators, and runs approved work across the systems your team already uses.",
  alternates: {
    canonical: "https://auterim.com",
    languages: {
      en: "https://auterim.com",
      "x-default": "https://auterim.com",
    },
  },
  openGraph: {
    url: "https://auterim.com",
    title: "Auterim | AI Workforce Built Around Your Business",
    description:
      "Auterim learns how your company works, recommends AI operators, and runs approved work across the systems your team already uses.",
    images: [
      {
        url: "/opengraph-image",
        alt: "Auterim | The AI workforce built around how your company works.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Auterim | AI Workforce Built Around Your Business",
    description:
      "Auterim learns how your company works, recommends AI operators, and runs approved work across the systems your team already uses.",
    images: [
      {
        url: "/opengraph-image",
        alt: "Auterim | The AI workforce built around how your company works.",
      },
    ],
  },
};

const homePageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${AUTERIM_URL}/#home`,
  url: AUTERIM_URL,
  name: "Auterim | AI Workforce Built Around Your Business",
  description:
    "Auterim learns how your company works, recommends AI operators, and runs approved work across the systems your team already uses.",
  isPartOf: {
    "@id": AUTERIM_WEBSITE_ID,
  },
  about: {
    "@id": AUTERIM_ORGANIZATION_ID,
  },
  inLanguage: "en",
};

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${AUTERIM_URL}/#home-faq`,
  mainEntity: AUTERIM_HOME_FAQS.map((faq) => ({
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
      <V3Header />
      <main>
        <PageShell>
          <V3Page />
        </PageShell>
      </main>
    </div>
  );
}
