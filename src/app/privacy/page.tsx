import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { LegalPage } from "@/components/home-v3/public-page-components";
import { staticOgImage } from "@/lib/static-og";

const title = "Privacy Policy";
const description = "How Auterim collects and uses information from its website, Early Access requests, accounts, connected systems, and product activity.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/privacy" },
  openGraph: { url: "https://auterim.com/privacy", siteName: "Auterim", title: `${title} | Auterim`, description, type: "website", images: [staticOgImage("/privacy")] },
  twitter: { card: "summary_large_image", title: `${title} | Auterim`, description, images: [staticOgImage("/privacy")] },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <PublicSiteFrame><LegalPage title={title}>
    <p>This Privacy Policy explains how Auterim collects, uses, stores, and protects information when you use our websites, products, and services.</p>

    <h2>Information Auterim handles</h2>
    <ul>
      <li><strong>Early Access requests:</strong> name, work email, company, role, team size, use case, and request attribution such as source path, referrer, and campaign parameters.</li>
      <li><strong>Contact messages:</strong> the name, email, company, reason, and message details submitted through the contact form.</li>
      <li><strong>Account and workspace details:</strong> sign-in identity, company context, workspace members, selected policies, and setup choices entered into the product.</li>
      <li><strong>Connected system information:</strong> data made available by providers you choose to connect, within the granted provider scopes and the enabled connector capabilities.</li>
      <li><strong>Product activity:</strong> operator runs, prepared actions, policy results, approvals, execution state, and troubleshooting information associated with product use.</li>
      <li><strong>Billing information:</strong> plan and subscription identifiers and billing events needed to operate paid plans. Payment details are handled by the payment provider.</li>
    </ul>

    <h2>How information is used</h2>
    <p>Auterim uses this information to review Early Access requests, respond to messages, provide and secure workspaces, connect providers, prepare and execute work within configured policies, support users, maintain activity records, and operate billing where applicable.</p>

    <h2>Connected systems</h2>
    <p>Connecting a provider is optional. The data available to Auterim depends on your connection, the scopes you grant, the connector capability, and workspace setup. Provider terms and privacy practices also apply. You can disconnect a provider through the product controls that are available in your workspace.</p>

    <h2>Service providers</h2>
    <p>Auterim uses service providers for infrastructure and product functions, including Supabase for database and authentication services, Vercel for hosting, Resend for email delivery, Trigger.dev for background jobs, and Dodo Payments for billing when a paid plan is used. Data is processed by a provider when needed for the function it supplies.</p>

    <h2>Browser storage and traffic attribution</h2>
    <p>The public site stores your cookie-preference choice in browser local storage. If you accept optional traffic attribution, Auterim can store first-touch campaign details in local storage, a session identifier in session storage, and send page and referrer details to Auterim&apos;s traffic endpoint. See the <a href="/cookies">Cookie and Browser Storage Policy</a> for details. Signed-in product sessions may use authentication cookies.</p>

    <h2>Retention</h2>
    <p>Auterim retains information while it is needed to provide the service, manage access, support the product, maintain security and billing records, or meet applicable obligations. Run-history limits vary by plan and are shown on the <a href="/pricing">pricing page</a>. The available product controls and retention period can depend on the type of information and workspace state.</p>

    <h2>Your requests</h2>
    <p>To ask about personal information associated with an Early Access request, contact message, or workspace, email <a href="mailto:hello@auterim.com">hello@auterim.com</a> and include enough context for us to locate it. We will assess the request and respond based on applicable requirements and the information involved.</p>

    <h2>Changes to this policy</h2>
    <p>We may update this policy as the service or its information handling changes. The date at the top of this page shows when the current text was updated.</p>

    <h2>Contact</h2>
    <p>For privacy questions, contact <a href="mailto:hello@auterim.com">hello@auterim.com</a>.</p>
  </LegalPage></PublicSiteFrame>;
}
