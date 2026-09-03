import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { PageShell } from "@/components/marketing-ui";
import AuterimHomeHandoff from "@/components/home-v3/auterim-home-handoff";
import {
  INOVENSE_HOME_FAQS,
  AUTERIM_ORGANIZATION_ID,
  AUTERIM_URL,
  AUTERIM_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

export const metadata: Metadata = {
  title: {
    absolute: "Auterim | The AI workforce built around how your company works.",
  },
  description:
    "Auterim understands your business, recommends the right AI workforce, and lets it prepare and execute real work with controls.",
  alternates: {
    canonical: "https://auterim.com",
    languages: {
      en: "https://auterim.com",
      nl: "https://auterim.com/nl",
      "x-default": "https://auterim.com",
    },
  },
  openGraph: {
    url: "https://auterim.com",
    title: "Auterim | The AI workforce built around how your company works.",
    description:
      "Auterim understands your business, recommends the right AI workforce, and lets it prepare and execute real work with controls.",
    images: [
      {
        url: "/opengraph-image",
        alt: "Auterim | The AI workforce built around how your company works.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Auterim | The AI workforce built around how your company works.",
    description:
      "Auterim understands your business, recommends the right AI workforce, and lets it prepare and execute real work with controls.",
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
  name: "Auterim | The AI workforce built around how your company works.",
  description:
    "Auterim understands your business, recommends the right AI workforce, and lets it prepare and execute real work with controls.",
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
      <Nav homepage />
      <main>
        <PageShell>
          <AuterimHomeHandoff />
        </PageShell>
      </main>
      <Footer />
    </div>
  );
}
