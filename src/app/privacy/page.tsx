import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import Link from "next/link";
import { PageShell, Eyebrow } from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Inovense collects, uses, and protects your data. We do not sell your data. Execution logs are retained per your plan and can be exported at any time.",
  alternates: {
    canonical: "https://auterim.com/privacy",
  },
  openGraph: {
    url: "https://auterim.com/privacy",
    title: "Privacy Policy | Inovense",
    description: "How Inovense collects, uses, and protects your data. We do not sell your data. Execution logs are retained per your plan and can be exported at any time.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Inovense",
    description: "How Inovense collects, uses, and protects your data. We do not sell your data. Execution logs are retained per your plan and can be exported at any time.",
  },
};

export default function PrivacyPage() {
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
              Privacy Policy
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
                This Privacy Policy describes how Inovense collects, uses, and protects information about you when you use the Inovense platform.
              </p>
              <p>
                We collect information necessary to operate the platform, including account information, usage data, and the content you provide to configure your operators and workflows. We do not sell your data to third parties.
              </p>
              <p>
                Data processed by your agents runs inside your configured policy boundaries. Execution logs are retained per your plan settings and can be exported or deleted at any time.
              </p>
              <p>
                For privacy inquiries, contact us at{" "}
                <a
                  href="mailto:hello@auterim.com"
                  className="underline underline-offset-2"
                  style={{ color: "#ECEFF3" }}
                >
                  hello@auterim.com
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
