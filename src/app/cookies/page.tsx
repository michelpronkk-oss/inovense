import type { Metadata } from "next";
import { PageShell } from "@/components/marketing-ui";
import V3Header from "@/components/home-v3/v3-header";
import LegalEditorial from "@/components/home-v3/legal-editorial";
import CookiePreferencesButton from "@/components/home-v3/cookie-preferences-button";
import { staticOgImage } from "@/lib/static-og";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Auterim uses cookies. Strictly necessary cookies for platform operation and analytics cookies to improve the product. No advertising cookies.",
  alternates: {
    canonical: "https://auterim.com/cookies",
  },
  openGraph: {
    url: "https://auterim.com/cookies",
    title: "Cookie Policy | Auterim",
    description: "How Auterim uses cookies. Strictly necessary cookies for platform operation and analytics cookies to improve the product. No advertising cookies.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy | Auterim",
    description: "How Auterim uses cookies. Strictly necessary cookies for platform operation and analytics cookies to improve the product. No advertising cookies.",
    images: [staticOgImage("/")],
  },
};

export default function CookiesPage() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <V3Header />
      <main>
        <PageShell>
          <LegalEditorial title="Cookie Policy" lastUpdated="May 2026">
            <div className="legal-notice">
              <i aria-hidden="true" />
              <span>This policy describes Auterim as it operates today, in product preview. It will be reviewed with counsel before commercial launch, and this page will be updated when that happens.</span>
            </div>

            <h2>Overview</h2>
            <p>
              Auterim uses cookies and similar technologies to keep you signed in, remember settings, and understand how the platform and marketing site are used. This policy explains what we use and why.
            </p>

            <h2>Strictly necessary cookies</h2>
            <p>
              Required for the platform to function: keeping you signed in to your workspace, remembering your session across the admin, app, and portal, and protecting against cross-site request forgery. These cannot be turned off without breaking core functionality.
            </p>

            <h2>Analytics cookies</h2>
            <p>
              Used to understand which pages and features are used, so we can improve the product and this site. These are set only with your consent where required by law, and never combine with advertising networks.
            </p>

            <h2>Cookies we do not use</h2>
            <ul>
              <li>No advertising or ad-retargeting cookies</li>
              <li>No cross-site tracking sold or shared with third parties</li>
              <li>No cookies from social media widgets we haven&apos;t embedded</li>
            </ul>

            <h2>Managing cookies</h2>
            <p>
              You can accept or decline analytics cookies at any time from the preference banner, or block and delete cookies through your browser settings directly. Disabling strictly necessary cookies will prevent you from staying signed in and will affect core platform functionality.
            </p>
            <CookiePreferencesButton />

            <h2>Changes to this policy</h2>
            <p>
              We will update this page if the cookies we use change, and update the date below when we do.
            </p>

            <h2>Contact</h2>
            <p>
              For questions about this policy, contact us at <a href="mailto:hello@auterim.com">hello@auterim.com</a>. See also our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.
            </p>
          </LegalEditorial>
        </PageShell>
      </main>
    </div>
  );
}
