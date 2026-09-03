import type { Metadata } from "next";
import { PageShell } from "@/components/marketing-ui";
import V3Header from "@/components/home-v3/v3-header";
import ContactEditorial from "@/components/home-v3/contact-editorial";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Auterim team. Ask about a first operator deployment, pricing, support, or partnerships.",
  alternates: {
    canonical: "https://auterim.com/contact",
  },
  openGraph: {
    url: "https://auterim.com/contact",
    title: "Contact | Auterim",
    description: "Get in touch with the Auterim team. Ask about a first operator deployment, pricing, support, or partnerships.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | Auterim",
    description: "Get in touch with the Auterim team. Ask about a first operator deployment, pricing, support, or partnerships.",
  },
};

export default function ContactPage() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <V3Header />
      <main>
        <PageShell>
          <ContactEditorial />
        </PageShell>
      </main>
    </div>
  );
}
