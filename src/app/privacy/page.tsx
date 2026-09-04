import type { Metadata } from "next";
import { PageShell } from "@/components/marketing-ui";
import V3Header from "@/components/home-v3/v3-header";
import LegalEditorial from "@/components/home-v3/legal-editorial";
import { staticOgImage } from "@/lib/static-og";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Auterim collects, uses, and protects your data. We do not sell your data. Execution logs are retained per your plan and can be exported or deleted at any time.",
  alternates: {
    canonical: "https://auterim.com/privacy",
  },
  openGraph: {
    url: "https://auterim.com/privacy",
    title: "Privacy Policy | Auterim",
    description: "How Auterim collects, uses, and protects your data. We do not sell your data. Execution logs are retained per your plan and can be exported or deleted at any time.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Auterim",
    description: "How Auterim collects, uses, and protects your data. We do not sell your data. Execution logs are retained per your plan and can be exported or deleted at any time.",
    images: [staticOgImage("/")],
  },
};

export default function PrivacyPage() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <V3Header />
      <main>
        <PageShell>
          <LegalEditorial title="Privacy Policy" lastUpdated="May 2026">
            <div className="legal-notice">
              <i aria-hidden="true" />
              <span>This policy describes Auterim as it operates today, in product preview. It will be reviewed with counsel before commercial launch, and this page will be updated when that happens.</span>
            </div>

            <h2>Overview</h2>
            <p>
              This Privacy Policy describes how Auterim collects, uses, and protects information when you use the Auterim platform, from exploring a free preview through connecting systems and deploying operators.
            </p>

            <h2>Information we collect</h2>
            <p>
              <strong>Account information.</strong> Name, work email, company, and the credentials you use to sign in.
            </p>
            <p>
              <strong>Company profile data.</strong> Information Auterim gathers from your public website and the details you provide, such as goals, tools, team structure, and approval owners, used to build your operating profile and recommend operators.
            </p>
            <p>
              <strong>Connected system data.</strong> When you connect a tool such as Gmail, HubSpot, Google Calendar, or Slack, operators read and prepare work using the records needed for the specific job you have approved. Connected data stays inside the approval boundaries you set.
            </p>
            <p>
              <strong>Execution logs.</strong> A record of what each operator detected, prepared, and was approved or blocked from doing, kept for audit and troubleshooting.
            </p>
            <p>
              <strong>Usage data.</strong> Product analytics such as pages visited and features used, collected to improve the platform.
            </p>

            <h2>How we use information</h2>
            <p>
              We use the information above to operate the platform, build and update your company profile, recommend operators, execute the runs you approve, respond to support requests, and improve Auterim. We do not sell your data to third parties.
            </p>

            <h2>Connected systems</h2>
            <p>
              Connecting a third-party system is optional and always your decision. Auterim reads only what a given operator needs to prepare or execute approved work, and connections can be removed at any time from your workspace settings. Each connected provider (for example Google, HubSpot, or Slack) processes data under its own terms and privacy policy in addition to this one.
            </p>

            <h2>Sub-processors and infrastructure</h2>
            <p>
              Auterim runs on a small set of infrastructure providers who process data on our behalf under their own confidentiality and security commitments: Supabase (database and authentication), Vercel (hosting), Resend (transactional email), Nango (connector authentication), Trigger.dev (background job execution), and Dodo Payments (billing, for paid plans only).
            </p>

            <h2>Data retention</h2>
            <p>
              Execution logs and company profile data are retained for as long as your account is active, per the retention settings on your plan. You can export or delete this data at any time from your workspace, or by contacting us.
            </p>

            <h2>Your rights</h2>
            <p>
              You can access, export, correct, or delete the data associated with your account. Where applicable law grants you additional rights, such as data portability or objection to processing, contact us and we will respond.
            </p>

            <h2>Cookies</h2>
            <p>
              Auterim uses a limited set of cookies to keep you signed in and understand product usage. See our <a href="/cookies">Cookie Policy</a> for details.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We will update this page as the product and its data practices evolve, and update the date below when we do.
            </p>

            <h2>Contact</h2>
            <p>
              For privacy inquiries, contact us at <a href="mailto:hello@auterim.com">hello@auterim.com</a>.
            </p>
          </LegalEditorial>
        </PageShell>
      </main>
    </div>
  );
}
