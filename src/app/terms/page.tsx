import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { LegalPage } from "@/components/home-v3/public-page-components";
import { staticOgImage } from "@/lib/static-og";

const title = "Terms of Service";
const description = "Terms for accessing Auterim, requesting Early Access, connecting third-party systems, and using operator workflows.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/terms" },
  openGraph: { url: "https://auterim.com/terms", siteName: "Auterim", title: `${title} | Auterim`, description, type: "website", images: [staticOgImage("/terms")] },
  twitter: { card: "summary_large_image", title: `${title} | Auterim`, description, images: [staticOgImage("/terms")] },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return <PublicSiteFrame><LegalPage title={title}>
    <h2>Acceptance and accounts</h2>
    <p>These terms apply when you access or use Auterim. You must provide accurate account information and are responsible for activity in your account and workspace, including actions approved by people you authorize.</p>

    <h2>Early Access</h2>
    <p>An Early Access request is a request for consideration. It does not create an account, guarantee an invitation, start a trial, or authorize a payment. Access may follow an invitation and workspace setup. Product features and availability may change as Early Access develops.</p>

    <h2>Trials and billing</h2>
    <p>Current plan prices are listed on the <a href="/pricing">pricing page</a>. If invited, a workspace can choose to start the three-day trial explicitly through the product. Paid plan, billing interval, applicable charges, and other checkout terms are shown before a purchase is completed. A request for Early Access does not begin a trial or create a payment obligation.</p>

    <h2>Using Auterim</h2>
    <p>You may use Auterim only for lawful business purposes and in accordance with these terms. You must not use the service to access another workspace without permission, interfere with its operation, or configure an operator to bypass a policy or approval boundary.</p>

    <h2>Operator actions and connected systems</h2>
    <p>Operators prepare and may execute work according to enabled capabilities, provider permissions, and workspace policies. You are responsible for reviewing configured rules, granting appropriate access, and deciding whether to approve actions. Third-party providers remain subject to their own terms, permissions, and availability. Auterim cannot guarantee that a provider will accept, complete, or reverse an action.</p>

    <h2>Your content and product intellectual property</h2>
    <p>You retain the rights you hold in information you submit or connect. You authorize Auterim to process that information as needed to provide the service and related support. Auterim and its licensors retain rights in the service, software, and product materials.</p>

    <h2>Availability and changes</h2>
    <p>Auterim may change, suspend, or discontinue parts of the service. We aim to communicate material changes through the product or this site when appropriate, but uninterrupted availability is not guaranteed.</p>

    <h2>Suspension and termination</h2>
    <p>You may stop using Auterim at any time. Access may be suspended or ended if needed to protect the service, users, or connected systems, or in response to a breach of these terms. Applicable account and data handling after access ends depends on the information type and billing state.</p>

    <h2>Disclaimers</h2>
    <p>Auterim is provided as available. Recommendations, prepared work, and observed outcomes may be incomplete or incorrect. You should review work in context and determine whether it is suitable before approving or relying on it.</p>

    <h2>Limitation of liability</h2>
    <p>To the extent permitted by applicable law, Auterim is not liable for indirect, incidental, special, or consequential damages arising from use of the service. Liability limits do not apply where applicable law does not permit them to apply.</p>

    <h2>Changes to these terms</h2>
    <p>We may update these terms as Auterim changes. The date at the top of this page indicates when the current text was updated. Continued use after an update constitutes acceptance only to the extent permitted by applicable law.</p>

    <h2>Contact</h2>
    <p>Questions about these terms can be sent to <a href="mailto:hello@auterim.com">hello@auterim.com</a>.</p>
  </LegalPage></PublicSiteFrame>;
}
