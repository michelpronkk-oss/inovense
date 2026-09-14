import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero } from "@/components/home-v3/public-page-components";
import { UseCasesHeroVisual } from "@/components/home-v3/page-specific-hero-visuals";
import RequestEarlyAccessButton from "@/components/home-v3/request-early-access-button";
import {
  OperatingLoopVisual,
  RevenueVisual,
  ClientFlowVisual,
  OperationsVisual,
  SupportVisual,
  SharedContextVisual,
  PolicyForkVisual,
  OutcomesVisual,
} from "@/components/home-v3/use-case-finished-visuals";
import { toJsonLd } from "@/lib/geo";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim Use Cases | Revenue, Client Flow, Operations & Support";
const description = "See how Auterim Operators detect work, prepare next steps, apply approval rules, and move Revenue, Client Flow, Operations, and Support work forward.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "https://auterim.com/use-cases" },
  openGraph: {
    url: "https://auterim.com/use-cases",
    siteName: "Auterim",
    title,
    description,
    type: "website",
    images: [staticOgImage("/use-cases")],
  },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/use-cases")] },
  robots: { index: true, follow: true },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://auterim.com" },
    { "@type": "ListItem", position: 2, name: "Use Cases", item: "https://auterim.com/use-cases" },
  ],
};

export default function UseCasesPage() {
  return (
    <PublicSiteFrame>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbSchema) }} />
      <div className="uc-page">
        <PublicHero
          className="uc-hero"
          action
          label="Use cases"
          title="Where Auterim moves work forward."
          description="Auterim finds work before your team has to, then routes the relevant signal to an Operator who can prepare the next move."
          secondary={{ label: "See how Auterim works", href: "/how-it-works" }}
          visual={<UseCasesHeroVisual />}
        />

        <section className="uc-overview" aria-labelledby="uc-overview-title">
          <div className="wrap uc-overview-inner">
            <div className="uc-section-intro">
              <span className="uc-overline">The operating loop</span>
              <h2 id="uc-overview-title">A signal becomes owned work.</h2>
              <p>Connected systems remain the source of record. An Operator prepares the next move; your policy governs approval and execution.</p>
            </div>
            <OperatingLoopVisual />
            <p className="uc-overview-note">Operators are defined roles, not chatbots. One Operator owns each piece of work.</p>
          </div>
        </section>

        <section className="uc-case uc-case--revenue" aria-labelledby="uc-revenue-title">
          <div className="wrap uc-case-grid">
            <div className="uc-case-copy">
              <span className="uc-operator-label">Revenue Operator</span>
              <h2 id="uc-revenue-title">A buying signal arrives before the task does.</h2>
              <p className="uc-case-lede">A pricing or renewal signal arrives before a follow-up exists. Revenue Operator assembles approved deal context and prepares a reply and CRM update.</p>
            </div>
            <div className="uc-visual-stack">
              <RevenueVisual />
            </div>
          </div>
        </section>

        <section className="uc-case uc-case--client" aria-labelledby="uc-client-title">
          <div className="wrap uc-case-grid">
            <div className="uc-case-copy">
              <span className="uc-operator-label">Client Flow Operator</span>
              <h2 id="uc-client-title">Surface the missing handoff before onboarding stalls.</h2>
              <p className="uc-case-lede">Client Flow gathers approved client and project context for the next step.</p>
            </div>
            <div className="uc-visual-stack">
              <ClientFlowVisual />
            </div>
          </div>
        </section>

        <section className="uc-case uc-case--operations" aria-labelledby="uc-operations-title">
          <div className="wrap">
            <div className="uc-operations-heading">
              <span className="uc-operator-label">Operations Operator</span>
              <h2 id="uc-operations-title">Find the blocker before the deadline does.</h2>
              <p className="uc-case-lede">A blocked task or dependency can hold up work around it. Operations assembles project and team context for the owner.</p>
            </div>
            <OperationsVisual />
          </div>
        </section>

        <section className="uc-case uc-case--support" aria-labelledby="uc-support-title">
          <div className="wrap uc-case-grid">
            <div className="uc-case-copy">
              <span className="uc-operator-label">Support Operator</span>
              <h2 id="uc-support-title">Unresolved issues need a clear next step.</h2>
              <p className="uc-case-lede">Support prepares a reply or handoff from ticket context.</p>
            </div>
            <div className="uc-visual-stack">
              <SupportVisual />
            </div>
          </div>
        </section>

        <section className="uc-shared" aria-labelledby="uc-shared-title">
          <div className="wrap uc-shared-inner">
            <div className="uc-centered-heading">
              <h2 id="uc-shared-title">One business. Shared context. Clear ownership.</h2>
              <p>Company context, connected systems, workspace memory, policy, and past outcomes can inform each Operator. One primary owner carries each problem.</p>
            </div>
            <SharedContextVisual />
          </div>
        </section>

        <section className="uc-policy" aria-labelledby="uc-policy-title">
          <div className="wrap uc-policy-inner">
            <div className="uc-centered-heading">
              <span className="uc-operator-label">Policy</span>
              <h2 id="uc-policy-title">Fast does not mean unchecked.</h2>
              <p>Policy decides what can run, what waits for approval, and what stops.</p>
            </div>
            <PolicyForkVisual />
          </div>
        </section>

        <section className="uc-outcomes" aria-labelledby="uc-outcomes-title">
          <div className="wrap uc-outcomes-grid">
            <div>
              <span className="uc-overline">Outcomes</span>
              <h2 id="uc-outcomes-title">Execution is only the middle.</h2>
              <p>Auterim observes what happens next and records the outcome without assuming causation.</p>
            </div>
            <OutcomesVisual />
          </div>
        </section>

        <nav className="uc-explore" aria-label="Explore Auterim">
          <div className="wrap">
            <span className="uc-overline">Explore Auterim</span>
            <div className="uc-explore-links">
              <Link href="/operators">Meet the Operators <span aria-hidden="true">→</span></Link>
              <Link href="/how-it-works">How it works <span aria-hidden="true">→</span></Link>
              <Link href="/control">Policies and approvals <span aria-hidden="true">→</span></Link>
              <Link href="/connectors">Supported connectors <span aria-hidden="true">→</span></Link>
              <Link href="/pricing">Plans and capacity <span aria-hidden="true">→</span></Link>
              <Link href="/getting-started">Getting started <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </nav>

        <section className="uc-final-cta" aria-labelledby="uc-final-title">
          <div className="uc-final-inner">
            <span className="uc-overline">Early Access</span>
            <h2 id="uc-final-title">See what Auterim finds first.</h2>
            <p>Connect the systems your business already uses and turn signals into prepared work.</p>
            <div className="uc-final-actions">
              <RequestEarlyAccessButton className="btn btn-a" />
              <Link href="/connectors">See supported connectors <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>
      </div>
    </PublicSiteFrame>
  );
}
