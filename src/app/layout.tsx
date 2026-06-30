import type { Metadata } from "next";
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

const sansFallbackStack =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
const monoFallbackStack =
  'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export const metadata: Metadata = {
  metadataBase: new URL(INOVENSE_URL),
  title: {
    default: "Auterim OS â€” AI agents that run your work.",
    template: "%s | Auterim",
  },
  description: "Auterim connects to your tools, monitors what matters, and lets agents execute safely across your business.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/brand/inovense-app-icon-1024.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Auterim",
    title: "Auterim OS â€” AI agents that run your work.",
    description: "Auterim connects to your tools, monitors what matters, and lets agents execute safely across your business.",
    url: INOVENSE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Auterim OS â€” AI agents that run your work.",
    description: "Auterim connects to your tools, monitors what matters, and lets agents execute safely across your business.",
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

/* â”€â”€â”€ JSON-LD: Organization + WebSite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": INOVENSE_ORGANIZATION_ID,
  name: "Auterim",
  url: INOVENSE_URL,
  logo: `${INOVENSE_URL}/logo.png`,
  description: "Auterim connects to your tools, monitors what matters, and lets agents execute safely across your business.",
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
    name: "Auterim service lanes",
    itemListElement: INOVENSE_LANES.map((lane) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: `${lane.name} by Auterim`,
        url: `${INOVENSE_URL}${lane.path}`,
        description: lane.description,
      },
    })),
  },
  knowsAbout: [
    "AI Agents",
    "Workflow Automation",
    "Policy Enforcement",
    "Business Operating Systems",
    "AI Integration",
    "Approval Gates",
    "Company Memory",
    "Operator Execution",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": INOVENSE_WEBSITE_ID,
  name: "Auterim",
  url: INOVENSE_URL,
  description: "Auterim connects to your tools, monitors what matters, and lets agents execute safely across your business.",
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
      className="dark h-full antialiased font-sans"
      style={
        {
          "--font-sans": sansFallbackStack,
          "--font-geist-sans": sansFallbackStack,
          "--font-geist-mono": monoFallbackStack,
        } as React.CSSProperties
      }
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
