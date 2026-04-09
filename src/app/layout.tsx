import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import React from "react";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://inovense.com"),
  title: {
    default: "Inovense | Digital Infrastructure for Operators",
    template: "%s | Inovense",
  },
  description:
    "Inovense builds premium websites, AI automation systems, and growth infrastructure for operators and ambitious brands.",
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
    title: "Inovense | Digital Infrastructure for Operators",
    description:
      "Inovense builds premium websites, AI automation systems, and growth infrastructure for operators and ambitious brands.",
    url: "https://inovense.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inovense | Digital Infrastructure for Operators",
    description:
      "Inovense builds premium websites, AI automation systems, and growth infrastructure for operators and ambitious brands.",
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
    "Digital infrastructure for operators who compete on execution. Inovense builds websites, automation systems, and growth infrastructure.",
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
    "Digital infrastructure for operators who compete on execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
        {children}
      </body>
    </html>
  );
}
