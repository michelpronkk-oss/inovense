import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { headers } from "next/headers";
import React from "react";
import "./globals.css";
import TrafficAttributionTracker from "@/components/analytics/traffic-attribution-tracker";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://inovense.com"),
  title: {
    default: "Inovense | Web Design, AI Automation & Growth Systems",
    template: "%s | Inovense",
  },
  description:
    "Inovense builds high-performance websites, AI automation workflows, and growth systems for operators and ambitious brands.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Inovense",
    title: "Inovense | Web Design, AI Automation & Growth Systems",
    description:
      "Inovense builds high-performance websites, AI automation workflows, and growth systems for operators and ambitious brands.",
    url: "https://inovense.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inovense | Web Design, AI Automation & Growth Systems",
    description:
      "Inovense builds high-performance websites, AI automation workflows, and growth systems for operators and ambitious brands.",
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
  name: "Inovense",
  url: "https://inovense.com",
  logo: "https://inovense.com/logo.png",
  description:
    "Inovense builds high-performance websites, AI automation workflows, and growth systems for operators and ambitious brands.",
  email: "hello@inovense.com",
  foundingDate: "2024",
  knowsAbout: [
    "Web Development",
    "AI Automation",
    "Business Process Automation",
    "Growth Marketing",
    "SEO",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Inovense",
  url: "https://inovense.com",
  description:
    "Inovense builds high-performance websites, AI automation workflows, and growth systems for operators and ambitious brands.",
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
    pathname.startsWith("/onboarding");

  return (
    <html
      lang={lang}
      className={`dark h-full antialiased ${figtree.variable} font-sans`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {!isPrivateRoute && <TrafficAttributionTracker />}
        {children}
      </body>
    </html>
  );
}
