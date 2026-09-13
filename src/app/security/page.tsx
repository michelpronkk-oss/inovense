import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicRows, PublicCta } from "@/components/home-v3/public-page-components";
import { staticOgImage } from "@/lib/static-og";

const title = "Auterim Security and Data Controls";
const description = "A factual overview of Auterim authentication, connector token encryption, workspace authorization, approval controls, webhook verification, and activity records.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/security" },
  openGraph: { url: "https://auterim.com/security", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/security")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/security")] },
  robots: { index: true, follow: true },
};

const controls = [
  { kicker: "Authentication", title: "Signed-in users are verified through Supabase Auth.", body: "The server-side Supabase client uses the public anon key with the request session. User identity is verified with Supabase Auth rather than trusted from a locally decoded cookie." },
  { kicker: "Database access", title: "Authorization is enforced in server code and database policies.", body: "Core auth and workspace tables have Row Level Security policies. Some server workflows use a privileged service-role client, which bypasses RLS; those paths are kept in server-side code and apply workspace and role checks in the application." },
  { kicker: "Connector credentials", title: "Stored connector tokens use authenticated encryption.", body: "The connector token utility encrypts and decrypts credentials with AES-256-GCM using a 32-byte CONNECTOR_TOKEN_ENCRYPTION_KEY. The key is read from the server environment and is not a public client setting." },
  { kicker: "Provider authorization", title: "OAuth scopes bound what a connector can access.", body: "Connectors use provider OAuth flows with product-defined scopes. Available read and write capabilities differ by provider, and some providers require additional administrator consent. External sends and supported writes can be gated by workspace approval policy." },
  { kicker: "Approvals and policy", title: "Sensitive work can stop for a human decision.", body: "Operator actions are evaluated against configured policy. Actions can proceed, wait for an approval, or be blocked. Approval availability depends on the workflow and connected provider." },
  { kicker: "Webhook verification", title: "Billing webhooks verify signatures and timestamp freshness.", body: "The Dodo webhook handler checks an HMAC signature using a timing-safe comparison and rejects timestamps outside its freshness window before processing an event." },
  { kicker: "Activity records", title: "Runs and decisions can be reviewed in the workspace.", body: "The product records operator activity, policy outcomes, approval decisions, and execution state. Record coverage depends on the action path and connected provider; it is not a guarantee that every external event is observable." },
  { kicker: "Execution reliability", title: "Exactly-once execution is not promised for every provider action.", body: "Idempotency and deduplication controls apply where supported. External provider timeouts can leave an outcome unclear and may require reconciliation." },
];

export default function SecurityPage() {
  return <PublicSiteFrame>
    <PublicHero label="Security and control" title="Keep access bounded and consequential work visible." description="Auterim is built around authenticated workspaces, scoped provider access, workspace policies, and reviewable operator activity. The details below describe implemented controls rather than certification claims." secondary={{ label: "Control model", href: "/control" }} />
    <PublicRows label="Implemented controls" title="What the product does today." rows={controls} note="Auterim does not represent itself as certified under SOC 2, ISO 27001, HIPAA, or GDPR. Security properties also depend on deployment configuration, provider permissions, and how each workspace sets its policies." />
    <PublicCta title="Ask about a connector or security control." description="Contact the team with a specific question about the product paths your workspace expects to use." />
  </PublicSiteFrame>;
}
