import type { Metadata } from "next";
import { PageShell } from "@/components/marketing-ui";
import V3Header from "@/components/home-v3/v3-header";
import LegalEditorial from "@/components/home-v3/legal-editorial";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service governing use of the Auterim platform: the operator runtime, approval and policy system, connected systems, and subscription plans.",
  alternates: {
    canonical: "https://auterim.com/terms",
  },
  openGraph: {
    url: "https://auterim.com/terms",
    title: "Terms of Service | Auterim",
    description: "Terms of service governing use of the Auterim platform: the operator runtime, approval and policy system, connected systems, and subscription plans.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | Auterim",
    description: "Terms of service governing use of the Auterim platform: the operator runtime, approval and policy system, connected systems, and subscription plans.",
  },
};

export default function TermsPage() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <V3Header />
      <main>
        <PageShell>
          <LegalEditorial title="Terms of Service" lastUpdated="May 2026">
            <div className="legal-notice">
              <i aria-hidden="true" />
              <span>These terms describe Auterim as it operates today, in product preview. They will be reviewed with counsel before commercial launch, and this page will be updated when that happens.</span>
            </div>

            <h2>Acceptance of terms</h2>
            <p>
              These Terms of Service govern your access to and use of the Auterim platform, including the operator runtime, approval and policy system, connector framework, and all associated services. By accessing or using Auterim, you agree to be bound by these terms. If you do not agree, do not use the platform.
            </p>

            <h2>What Auterim does</h2>
            <p>
              Auterim understands your business, recommends an AI workforce of operators suited to it, and lets those operators prepare and execute real work under the controls you define. The platform follows one loop for every account: connect your systems, understand your business, diagnose where time and opportunity are being lost, recommend the right operators, deploy them with controls, and measure and improve the result.
            </p>

            <h2>Accounts</h2>
            <p>
              You must provide accurate information when creating an account and are responsible for activity that occurs under it, including actions approved by anyone you grant access to your workspace.
            </p>

            <h2>The approval model</h2>
            <p>
              Operators propose work; they do not act outside the boundaries you set. Every action falls into one of three states: it can run automatically, it stops and waits for your named approver, or it is never allowed. You are responsible for the approval decisions made under your account, and for keeping your policy boundaries set the way you intend.
            </p>

            <h2>Connected systems</h2>
            <p>
              Connecting a third-party system such as Gmail, HubSpot, Google Calendar, or Slack is your choice, and you can disconnect at any time. Your use of those systems through Auterim is still subject to that provider's own terms. Auterim is not responsible for the availability or behavior of third-party systems you connect.
            </p>

            <h2>Subscriptions and payment</h2>
            <p>
              Preview is free and does not require a connected system. Paid plans (Foundation, Workforce, and Enterprise) are billed on the cycle shown at checkout through our payment processor, Dodo Payments. Fees are non-refundable except where required by law. You can cancel a paid plan at any time; access continues until the end of the billing period already paid for.
            </p>

            <h2>Acceptable use</h2>
            <p>
              You agree not to use Auterim to break the law, to configure operators to bypass an approval boundary, to attempt to access another workspace's data, or to interfere with the platform's normal operation.
            </p>

            <h2>Disclaimers</h2>
            <p>
              Auterim is provided during product preview on an "as is" basis, without warranties of any kind, express or implied. We do not guarantee that operator recommendations or prepared work are free of error, and approved actions remain your responsibility.
            </p>

            <h2>Limitation of liability</h2>
            <p>
              To the extent permitted by law, Auterim is not liable for indirect, incidental, or consequential damages arising from use of the platform. Our total liability for any claim is limited to the amount you paid us in the twelve months before the claim arose.
            </p>

            <h2>Termination</h2>
            <p>
              You may stop using Auterim at any time. We may suspend or terminate access for a breach of these terms or acceptable use. On termination, execution logs and profile data remain available for export for a reasonable period before deletion.
            </p>

            <h2>Changes to these terms</h2>
            <p>
              We may update these terms as the product evolves. We will update the date below when we do, and continued use of Auterim after a change means you accept the updated terms.
            </p>

            <h2>Contact</h2>
            <p>
              For questions regarding these terms, contact us at <a href="mailto:hello@auterim.com">hello@auterim.com</a>.
            </p>
          </LegalEditorial>
        </PageShell>
      </main>
    </div>
  );
}
