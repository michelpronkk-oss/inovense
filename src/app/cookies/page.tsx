import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import { PageShell, Eyebrow } from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Inovense uses cookies. Strictly necessary cookies for platform operation and analytics cookies to improve the product. No advertising cookies.",
  alternates: {
    canonical: "https://inovense.com/cookies",
  },
  openGraph: {
    url: "https://inovense.com/cookies",
    title: "Cookie Policy | Inovense",
    description: "How Inovense uses cookies. Strictly necessary cookies for platform operation and analytics cookies to improve the product. No advertising cookies.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy | Inovense",
    description: "How Inovense uses cookies. Strictly necessary cookies for platform operation and analytics cookies to improve the product. No advertising cookies.",
  },
};

export default function CookiesPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          <section className="mx-auto max-w-2xl px-6 pb-24 pt-36">
            <Eyebrow>Legal</Eyebrow>
            <h1
              className="mb-6 text-3xl font-semibold"
              style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
            >
              Cookie Policy
            </h1>
            <p
              className="mb-8 font-mono text-xs uppercase tracking-[0.14em]"
              style={{ color: "#4A4F57" }}
            >
              Last updated: May 2026
            </p>
            <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>
              <p>
                This page is provided for product preview purposes and should be reviewed before commercial launch.
              </p>
              <p>
                The Inovense platform uses cookies and similar technologies to maintain sessions, remember preferences, and understand how the platform is used.
              </p>
              <p>
                We use strictly necessary cookies to operate the platform, and analytics cookies to improve the product. We do not use advertising cookies.
              </p>
              <p>
                You can manage cookie preferences through your browser settings. Disabling strictly necessary cookies will affect platform functionality.
              </p>
              <p>
                For questions, contact us at{" "}
                <a
                  href="mailto:hello@inovense.com"
                  className="underline underline-offset-2"
                  style={{ color: "#ECEFF3" }}
                >
                  hello@inovense.com
                </a>
                .
              </p>
            </div>
            <div className="mt-10 flex gap-4">
              <Link
                href="/terms"
                className="text-sm underline underline-offset-2"
                style={{ color: "#4A4F57" }}
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="text-sm underline underline-offset-2"
                style={{ color: "#4A4F57" }}
              >
                Privacy Policy
              </Link>
            </div>
          </section>
        </PageShell>
      </main>
      <Footer />
    </>
  );
}
