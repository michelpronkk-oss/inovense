import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { LegalPage } from "@/components/home-v3/public-page-components";
import CookiePreferencesButton from "@/components/home-v3/cookie-preferences-button";
import { staticOgImage } from "@/lib/static-og";

const title = "Cookie and Browser Storage Policy";
const description = "Learn how Auterim uses authentication cookies, local storage, session storage, and optional traffic attribution, and update your preferences.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/cookies" },
  openGraph: { url: "https://auterim.com/cookies", siteName: "Auterim", title: `${title} | Auterim`, description, type: "website", images: [staticOgImage("/cookies")] },
  twitter: { card: "summary_large_image", title: `${title} | Auterim`, description, images: [staticOgImage("/cookies")] },
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return <PublicSiteFrame><LegalPage title={title}>
    <h2>Overview</h2>
    <p>Auterim uses cookies in the signed-in product to support authentication. The public site also uses browser local and session storage for preference and optional traffic-attribution functions. The traffic-attribution feature does not set an analytics cookie.</p>

    <h2>Authentication cookies</h2>
    <p>When you sign in, Supabase Auth may set and read session cookies so the product can maintain and refresh your authenticated session. These cookies are used by the product authentication flow. Blocking them can prevent sign-in or session continuity.</p>

    <h2>Cookie preference</h2>
    <p>Your public-site choice to accept or decline optional traffic attribution is stored in local storage under <code>auterim_cookie_consent</code>. This preference is not itself an authentication cookie.</p>

    <h2>Optional traffic attribution</h2>
    <p>If you accept, the site may store first-touch source, landing path, referrer host, campaign parameters, and a timestamp in local storage under <code>_iv_attr</code>. A session identifier is stored in session storage under <code>_iv_sk</code>. Page and attribution details are sent to Auterim&apos;s own traffic endpoint to understand site traffic. The tracker does not run until you accept. If you decline, any existing attribution snapshot and session identifier are removed and future tracking remains off.</p>

    <h2>Advertising</h2>
    <p>The traffic-attribution code described here does not set advertising cookies or send the recorded visit to an advertising network.</p>

    <h2>Manage your choice</h2>
    <p>You can reopen the preference controls at any time. Your browser also lets you inspect and clear cookies or storage. Clearing the preference value will cause the choice banner to appear again.</p>
    <CookiePreferencesButton />

    <h2>Changes and contact</h2>
    <p>We will update this page if the technologies described here change. Questions can be sent to <a href="mailto:hello@auterim.com">hello@auterim.com</a>. See our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.</p>
  </LegalPage></PublicSiteFrame>;
}
