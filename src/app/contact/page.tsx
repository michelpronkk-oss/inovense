import type { Metadata } from "next";
import ContactEditorial from "@/components/home-v3/contact-editorial";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { staticOgImage } from "@/lib/static-og";

const title = "Contact Auterim";
const description = "Contact Auterim about Early Access, available operators, connectors, support, or partnerships.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://auterim.com/contact" },
  openGraph: { url: "https://auterim.com/contact", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/contact")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/contact")] },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return <PublicSiteFrame><ContactEditorial /></PublicSiteFrame>;
}
