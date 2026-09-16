import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero } from "@/components/home-v3/public-page-components";
import { StorySection } from "@/components/home-v3/public-story-components";
import { SecurityControlDomains } from "@/components/home-v3/security-control-ledger";
import { SecurityPrinciples, SecurityControlPath, SecurityEvidence } from "@/components/home-v3/security-narrative";
import { SecurityHeroVisual } from "@/components/home-v3/page-specific-hero-visuals";
import RequestEarlyAccessButton from "@/components/home-v3/request-early-access-button";
import RevealMount from "@/components/home-v3/reveal-mount";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim Security and Data Controls";
const description = "How Auterim verifies identity, scopes connector access, checks proposed work against workspace policy, and keeps decisions reviewable — and where those guarantees stop.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/security" },
  openGraph: { url: "https://auterim.com/security", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/security")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/security")] },
  robots: { index: true, follow: true },
};

const principles = [
  { label: "Verified identity", body: "Every request is tied to a signed-in workspace member before protected data loads." },
  { label: "Scoped connections", body: "Each connected system is limited to the scopes and permissions your workspace grants." },
  { label: "Policy before action", body: "Proposed actions are checked against workspace policy before anything runs." },
  { label: "Reviewable decisions", body: "Approvals, policy outcomes, and execution state stay visible in the workspace." },
] as const;

const pathStages = [
  { n: "01", title: "Authenticate", body: "Workspace identity is verified before protected data is loaded.", icon: "user" as const },
  { n: "02", title: "Connect", body: "Provider access is limited by the scopes and permissions granted.", icon: "lock" as const },
  { n: "03", title: "Evaluate", body: "Proposed actions are checked against workspace policy.", icon: "check2" as const },
  { n: "04", title: "Approve or execute", body: "Consequential work can wait for a human decision.", icon: "shield" as const },
  { n: "05", title: "Record", body: "Runs, decisions, and confirmed outcomes remain reviewable.", icon: "doc" as const },
];

const domains = [
  {
    label: "Identity and workspace access",
    overview: "Every session is verified before protected data loads, and authorization is enforced by the application and the database together.",
    items: [
      {
        kicker: "Authentication",
        summary: "Protected requests verify the signed-in user through Supabase Auth before workspace data is loaded.",
        detail: "The server verifies each session with Supabase Auth rather than trusting a locally decoded cookie.",
        icon: "key" as const,
      },
      {
        kicker: "Workspace authorization",
        summary: "Core workspace tables enforce Row Level Security, and privileged server operations are isolated to server-only paths.",
        detail: "Some server workflows use a privileged service-role client that bypasses Row Level Security; those paths stay in server-side code and apply workspace and role checks before accessing protected data.",
        icon: "database" as const,
      },
    ],
  },
  {
    label: "Credentials and connected systems",
    overview: "Connector credentials are encrypted at rest, and each provider connection is limited to the scopes your workspace grants.",
    items: [
      {
        kicker: "Connector credential protection",
        summary: "Stored connector credentials are encrypted using authenticated encryption and decrypted only in server-side execution paths.",
        detail: "Credentials are encrypted with AES-256-GCM. The decryption key lives in the server environment and is never exposed to the client.",
        icon: "lock" as const,
      },
      {
        kicker: "Provider authorization",
        summary: "Connectors use each provider's OAuth flow, so available read and write capability is bounded by what that provider allows.",
        detail: "Available read and write capability differs by provider, and some providers require additional administrator consent. External sends and supported writes can be gated by workspace approval policy.",
        icon: "shield" as const,
      },
    ],
  },
  {
    label: "Decisions before action",
    overview: "Consequential work is checked against workspace policy, and sensitive actions can wait for a named approver.",
    items: [
      {
        kicker: "Policy and approvals",
        summary: "Operator actions are evaluated against configured policy before they run. Actions can proceed, wait for an approval, or be blocked.",
        detail: "Approval availability depends on the workflow and the connected provider.",
        icon: "check2" as const,
      },
      {
        kicker: "Verified webhook intake",
        summary: "Billing webhooks are verified before they are processed.",
        detail: "Inbound billing webhooks are checked against a signature using a timing-safe comparison, and requests outside a freshness window are rejected.",
        icon: "bolt" as const,
      },
    ],
  },
  {
    label: "Records and execution reliability",
    overview: "Activity, policy outcomes, and approval decisions stay visible in the workspace, with bounded retry behavior where a provider action is unclear.",
    items: [
      {
        kicker: "Activity and decision records",
        summary: "Operator activity, policy outcomes, approval decisions, and execution state are recorded in the workspace.",
        detail: "Record coverage depends on the action path and the connected provider; this is not a guarantee that every external event is observable.",
        icon: "doc" as const,
      },
      {
        kicker: "Execution reliability",
        summary: "Auterim uses idempotency, deduplication, and reconciliation where supported.",
        detail: "External provider timeouts can still leave an outcome unclear and may require verification before an action is retried.",
        icon: "layers" as const,
      },
    ],
  },
];

export default function SecurityPage() {
  return <PublicSiteFrame>
    <PublicHero
      className="security-hero"
      label="Security and control"
      title="Control before consequence."
      description="Auterim scopes access, protects stored connector credentials, and routes consequential work through workspace policy before execution."
      action
      secondary={{ label: "Review the control model", href: "/control" }}
      visual={<SecurityHeroVisual />}
    />

    <section className="sec public-content security-principles-section">
      <div className="wrap">
        <span className="lbl">Security model</span>
        <p className="sec-lead">Four things are true before any consequential action runs.</p>
        <div className="rv"><SecurityPrinciples items={principles} /></div>
      </div>
    </section>

    <section className="sec public-content security-path-section">
      <div className="wrap">
        <span className="lbl">Where control applies</span>
        <p className="sec-lead">Every consequential action passes the same path.</p>
        <div className="rv"><SecurityControlPath stages={pathStages} /></div>
      </div>
    </section>

    <StorySection className="public-security" label="Implemented controls" title="What exists in the product today.">
      <div className="rv"><SecurityControlDomains domains={domains} /></div>
    </StorySection>

    <section className="sec public-content security-evidence-section">
      <div className="wrap">
        <div className="public-section-heading">
          <span>Control you can see</span>
          <div><h2>Visible in the workspace, not just on this page.</h2><p>Policies, approval decisions, and execution evidence stay visible in the workspace.</p></div>
        </div>
        <div className="rv"><SecurityEvidence /></div>
      </div>
    </section>

    <section className="sec public-content security-boundaries-section">
      <div className="wrap">
        <div className="security-boundaries rv">
          <div className="security-boundaries-head">
            <span className="lbl">What we claim</span>
            <h3>What Auterim claims today.</h3>
          </div>
          <div className="security-boundaries-body">
            <p>Auterim does not currently claim SOC 2, ISO 27001, or HIPAA certification. Privacy and security obligations depend on how each workspace configures the product, which providers it connects, and the data it processes.</p>
            <p>Not every external provider event can always be observed, and external timeouts can create outcomes that need reconciliation before an action is retried.</p>
          </div>
        </div>
      </div>
    </section>

    <section className="close public-cta security-cta">
      <div className="wrap">
        <div className="public-cta-inner security-cta-inner">
          <div>
            <span className="lbl">Security review</span>
            <h2>Discuss your requirements with us.</h2>
            <p>Tell us which systems, data, and approval boundaries your workspace expects to use.</p>
          </div>
          <div className="security-cta-actions">
            <Link href="/contact" className="btn btn-a">Contact the team</Link>
            <RequestEarlyAccessButton className="btn btn-b" />
          </div>
        </div>
      </div>
    </section>
    <RevealMount />
  </PublicSiteFrame>;
}
