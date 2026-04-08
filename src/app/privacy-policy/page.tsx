import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Inovense",
  description:
    "How Inovense Agency collects, uses, and protects your personal data.",
};

const sections = [
  {
    id: "who-we-are",
    heading: "Who we are",
    content: (
      <>
        <p>
          Inovense Agency is a digital agency registered in the Netherlands
          (Chamber of Commerce: 96509198). We help companies design and build
          websites, operational systems, and growth infrastructure.
        </p>
        <p className="mt-4">
          This policy explains what personal data we collect, why we collect it,
          and how we handle it when you use this website or get in touch with us.
          For any privacy-related questions, contact us at{" "}
          <a
            href="mailto:hello@inovense.com"
            className="text-zinc-300 underline underline-offset-4 hover:text-brand transition-colors"
          >
            hello@inovense.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    heading: "What data we collect",
    content: (
      <>
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
          Contact and intake form submissions
        </p>
        <p>
          When you submit an inquiry through our website, we collect the
          information you provide. This typically includes your name, email
          address, company name, and details about the project or service you
          are enquiring about. We only collect what you choose to share.
        </p>
        <p className="mt-4 mb-4 text-xs font-medium uppercase tracking-widest text-brand">
          Email communication
        </p>
        <p>
          If you contact us by email, we retain the content of that
          correspondence along with your email address and any other information
          included in your message.
        </p>
        <p className="mt-4 mb-4 text-xs font-medium uppercase tracking-widest text-brand">
          Technical and usage data
        </p>
        <p>
          Our website may log basic technical information such as your IP
          address, browser type, and pages visited. This information is used to
          maintain website security and improve performance.
        </p>
      </>
    ),
  },
  {
    id: "why-we-process",
    heading: "Why we process your data",
    content: (
      <>
        <p className="mb-4">
          We process your data for the following purposes:
        </p>
        <ul className="space-y-2">
          {[
            "To respond to your inquiry and assess whether we can help",
            "To communicate with you regarding a project, proposal, or ongoing engagement",
            "To fulfil our contractual obligations if we enter a working relationship",
            "To maintain records of business correspondence",
            "To maintain the security and performance of our website",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "legal-bases",
    heading: "Legal bases",
    content: (
      <>
        <p className="mb-4">
          Under the General Data Protection Regulation (GDPR), we rely on the
          following legal bases:
        </p>
        <ul className="space-y-3">
          {[
            {
              basis: "Legitimate interest",
              detail:
                "responding to business enquiries and maintaining correspondence",
            },
            {
              basis: "Contract",
              detail:
                "where processing is necessary to deliver agreed services",
            },
            {
              basis: "Legal obligation",
              detail: "where we are required to retain records by law",
            },
          ].map(({ basis, detail }) => (
            <li key={basis} className="flex gap-3">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/60" />
              <span>
                <span className="font-medium text-zinc-300">{basis}:</span>{" "}
                {detail}
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    heading: "How long we keep your data",
    content: (
      <p>
        Enquiries that do not lead to an engagement are retained for up to 12
        months. Data related to active or completed client engagements is
        retained for up to 7 years in line with Dutch financial and
        administrative obligations. After the applicable retention period, data
        is securely deleted.
      </p>
    ),
  },
  {
    id: "sharing",
    heading: "Who we share your data with",
    content: (
      <>
        <p className="mb-4">
          We do not sell your personal data. We may share it with third-party
          service providers who support our operations, including:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            "Email delivery services for sending and receiving correspondence",
            "Hosting and infrastructure providers",
            "Project management or CRM tools used internally",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          All service providers are contractually required to handle your data
          securely and in accordance with applicable law.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies and analytics",
    content: (
      <p>
        This website may use cookies for basic functionality. If we introduce
        analytics tools to understand website performance, this policy will be
        updated to reflect that. We do not currently run advertising-based
        tracking or share data with ad platforms.
      </p>
    ),
  },
  {
    id: "security",
    heading: "Security",
    content: (
      <p>
        We take reasonable technical and organisational measures to protect your
        personal data from unauthorised access, loss, or misuse. No method of
        transmission over the internet is completely secure, but we work to
        maintain appropriate safeguards.
      </p>
    ),
  },
  {
    id: "your-rights",
    heading: "Your rights",
    content: (
      <>
        <p className="mb-4">Under the GDPR, you have the right to:</p>
        <ul className="space-y-2 mb-4">
          {[
            "Access the personal data we hold about you",
            "Request correction of inaccurate data",
            "Request deletion of your data where there is no legitimate reason to retain it",
            "Object to processing based on legitimate interest",
            "Request restriction of processing",
            "Receive your data in a portable format where applicable",
            "Lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens)",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a
            href="mailto:hello@inovense.com"
            className="text-zinc-300 underline underline-offset-4 hover:text-brand transition-colors"
          >
            hello@inovense.com
          </a>
          . We will respond within the timeframes required by applicable law.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    content: (
      <p>
        We may update this policy from time to time. The most recent version
        will always be published on this page with the date it was last updated.
        Continued use of the website after any update constitutes acceptance of
        the revised policy.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    content: (
      <>
        <p className="mb-4">
          For any privacy-related questions or requests:
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-5 text-sm space-y-1">
          <p className="font-medium text-zinc-200">Inovense Agency</p>
          <p>Chamber of Commerce (KvK): 96509198</p>
          {/* TODO: Add business address when available */}
          <p>
            Email:{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-300 underline underline-offset-4 hover:text-brand transition-colors"
            >
              hello@inovense.com
            </a>
          </p>
        </div>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden pt-32 pb-24">

          {/* Subtle grid texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
            }}
          />

          {/* Top ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[50vh]"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(73,160,164,0.07) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto max-w-3xl px-6">

            {/* Page header */}
            <div className="mb-14 border-b border-zinc-800/60 pb-10">
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
                Legal
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-4 text-sm text-zinc-600">
                Last updated: April 2026
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              {sections.map((section) => (
                <div key={section.id} id={section.id}>
                  <h2 className="mb-4 text-base font-semibold text-zinc-100">
                    {section.heading}
                  </h2>
                  <div className="text-sm leading-relaxed text-zinc-400">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
