import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { MktCard, PageHero, PageShell } from "@/components/marketing-ui";

const title = "Auterim Service Status";
const description = "Auterim does not publish live public monitoring during Early Access. Contact support for current service information.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://auterim.com/status" },
  openGraph: { url: "https://auterim.com/status", title: `${title} | Auterim`, description, type: "website" },
  twitter: { card: "summary_large_image", title: `${title} | Auterim`, description },
  robots: { index: false, follow: true },
};

export default function StatusPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          <PageHero
            eyebrow="Service status"
            heading="Live public monitoring is not published yet."
            description="Auterim is in Early Access. This page does not report live availability, uptime measurements, or incident history. Contact the team for current information about a service or workspace."
          >
            <a
              href="mailto:support@auterim.com?subject=Service%20status%20question"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", color: "#ECEFF3", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
            >
              Contact Auterim support
            </a>
          </PageHero>

          <section className="relative py-12 md:py-20">
            <div className="mx-auto max-w-3xl px-6">
              <MktCard>
                <h2 className="mb-2 text-base font-semibold" style={{ color: "#ECEFF3" }}>
                  Need current service information?
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "#A4ABB4" }}>
                  Email <a href="mailto:support@auterim.com" className="underline underline-offset-2">support@auterim.com</a> with your question. The team can share relevant information directly.
                </p>
              </MktCard>
            </div>
          </section>
        </PageShell>
      </main>
      <Footer />
    </>
  );
}
