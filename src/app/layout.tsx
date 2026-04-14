import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { headers } from "next/headers";
import React from "react";
import "./globals.css";
import TrafficAttributionTracker from "@/components/analytics/traffic-attribution-tracker";
import {
  INOVENSE_DESCRIPTION,
  INOVENSE_LANES,
  INOVENSE_NAME,
  INOVENSE_ORGANIZATION_ID,
  INOVENSE_URL,
  INOVENSE_WEBSITE_ID,
  toJsonLd,
} from "@/lib/geo";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(INOVENSE_URL),
  title: {
    default: "Inovense | Web Design, AI Automation & Growth Systems",
    template: "%s | Inovense",
  },
  description: INOVENSE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: INOVENSE_NAME,
    title: "Inovense | Web Design, AI Automation & Growth Systems",
    description: INOVENSE_DESCRIPTION,
    url: INOVENSE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Inovense | Web Design, AI Automation & Growth Systems",
    description: INOVENSE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

/* ─── JSON-LD: Organization + WebSite ──────────────────────────────────── */

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": INOVENSE_ORGANIZATION_ID,
  name: INOVENSE_NAME,
  url: INOVENSE_URL,
  logo: `${INOVENSE_URL}/logo.png`,
  description: INOVENSE_DESCRIPTION,
  email: "hello@inovense.com",
  foundingDate: "2024",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "hello@inovense.com",
      url: `${INOVENSE_URL}/intake`,
      availableLanguage: ["en", "nl"],
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Inovense service lanes",
    itemListElement: INOVENSE_LANES.map((lane) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: `${lane.name} by ${INOVENSE_NAME}`,
        url: `${INOVENSE_URL}${lane.path}`,
        description: lane.description,
      },
    })),
  },
  knowsAbout: [
    "Web Design",
    "Web Development",
    "AI Automation",
    "Business Process Automation",
    "Internal Tooling",
    "Lead Generation Systems",
    "Growth Marketing",
    "SEO",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": INOVENSE_WEBSITE_ID,
  name: INOVENSE_NAME,
  url: INOVENSE_URL,
  description: INOVENSE_DESCRIPTION,
  inLanguage: ["en", "nl"],
  publisher: {
    "@id": INOVENSE_ORGANIZATION_ID,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Middleware sets x-pathname for all routes so server components can detect
  // the active segment. Use it here to apply the correct html lang attribute
  // without a client-side hack.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const lang = pathname.startsWith("/nl") ? "nl" : "en";
  const isPrivateRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/proposal") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/client");

  return (
    <html
      lang={lang}
      className={`dark h-full antialiased ${figtree.variable} font-sans`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(websiteSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {!isPrivateRoute && <TrafficAttributionTracker />}
        {children}
      </body>
    </html>
  );
}
