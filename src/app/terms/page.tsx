import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import { PageShell, Eyebrow } from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service governing use of the Inovense platform, agent runtime, workflow execution environment, and connector framework.",
  alternates: {
    canonical: "https://inovense.com/terms",
  },
  openGraph: {
    url: "https://inovense.com/terms",
    title: "Terms of Service | Inovense",
    description: "Terms of service governing use of the Inovense platform, agent runtime, workflow execution environment, and connector framework.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | Inovense",
    description: "Terms of service governing use of the Inovense platform, agent runtime, workflow execution environment, and connector framework.",
  },
};

export default function TermsPage() {
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
              Terms of Service
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
                These Terms of Service govern your access to and use of the Inovense platform, including the agent runtime, workflow execution environment, connector framework, and all associated services.
              </p>
              <p>
                By accessing or using the Inovense platform, you agree to be bound by these terms. If you do not agree, do not use the platform.
              </p>
              <p>
                For questions regarding these terms, contact us at{" "}
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
                href="/privacy"
                className="text-sm underline underline-offset-2"
                style={{ color: "#4A4F57" }}
              >
                Privacy Policy
              </Link>
              <Link
                href="/cookies"
                className="text-sm underline underline-offset-2"
                style={{ color: "#4A4F57" }}
              >
                Cookie Policy
              </Link>
            </div>
          </section>
        </PageShell>
      </main>
      <Footer />
    </>
  );
}
