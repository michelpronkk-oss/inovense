import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import "./globals.css";
import TrafficAttributionTracker from "@/components/analytics/traffic-attribution-tracker";
import CookieConsentBanner from "@/components/cookie-consent-banner";
import {
  AUTERIM_DESCRIPTION,
  AUTERIM_URL,
} from "@/lib/geo";
import { staticOgImage } from "@/lib/static-og";
import { getAdminHost, getAppHost, normalizeHost } from "@/lib/host-routing";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"],
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? "/";
  const host = normalizeHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );
  const isPrivateHost =
    host === getAppHost() ||
    host === getAdminHost() ||
    requestHeaders.get("x-auterim-surface") === "app" ||
    requestHeaders.get("x-auterim-surface") === "admin";

  // Public discovery metadata belongs only to the marketing host. The app and
  // admin hosts have their own private layouts and must not inherit marketing
  // sharing metadata, canonical context, or indexability.
  if (isPrivateHost) {
    return {
      title: { default: "Auterim", template: "%s | Auterim" },
      robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    };
  }

  const image = staticOgImage(pathname);
  return {
    metadataBase: new URL(AUTERIM_URL),
    title: {
      default: "Auterim — AI Workforce for Business Operations",
      template: "%s | Auterim",
    },
    description: AUTERIM_DESCRIPTION,
    icons: { icon: "/favicon.ico", shortcut: "/favicon.ico" },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Auterim",
      title: "Auterim | AI workforce for businesses",
      description: AUTERIM_DESCRIPTION,
      url: AUTERIM_URL,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: "Auterim | AI workforce for businesses",
      description: AUTERIM_DESCRIPTION,
      images: [image],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

/* â”€â”€â”€ JSON-LD: Organization + WebSite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
  const host = normalizeHost(
    headersList.get("x-forwarded-host") ?? headersList.get("host")
  );
  const lang = pathname.startsWith("/nl") ? "nl" : "en";
  const isPrivateRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/proposal") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/client") ||
    host === getAppHost() ||
    host === getAdminHost() ||
    headersList.get("x-auterim-surface") === "app" ||
    headersList.get("x-auterim-surface") === "admin";

  return (
    <html
      lang={lang}
      className={`dark h-full antialiased font-sans ${geistSans.variable} ${geistMono.variable}`}
      style={{ "--font-sans": "var(--font-geist-sans)" } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {!isPrivateRoute && <TrafficAttributionTracker />}
        {children}
        {!isPrivateRoute && <CookieConsentBanner />}
      </body>
    </html>
  );
}
