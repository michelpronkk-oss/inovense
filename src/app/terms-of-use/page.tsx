import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Use | Inovense",
  description:
    "The terms that govern your use of the Inovense Agency website.",
};

const sections = [
  {
    id: "about",
    heading: "About this website",
    content: (
      <p>
        This website is operated by Inovense Agency, a digital agency registered
        in the Netherlands (Chamber of Commerce: 96509198). By using this
        website, you agree to the terms set out below. If you do not agree,
        please do not use the website.
      </p>
    ),
  },
  {
    id: "use",
    heading: "Use of this website",
    content: (
      <>
        <p className="mb-4">
          You may use this website for lawful purposes only. You may not:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            "Use the website in any way that is unlawful, harmful, or disruptive",
            "Attempt to gain unauthorised access to any part of the website or its infrastructure",
            "Scrape, copy, or republish content without prior written permission",
            "Transmit any malicious code, spam, or unsolicited communications through the website",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          We reserve the right to restrict access to the website for users who
          do not comply with these terms.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    heading: "Intellectual property",
    content: (
      <p>
        All content on this website, including text, design, graphics, code,
        and brand assets, is the property of Inovense Agency unless otherwise
        stated. Nothing on this website grants you any licence or right to use
        our intellectual property. You may not reproduce, distribute, modify, or
        republish any part of this website without prior written permission from
        us.
      </p>
    ),
  },
  {
    id: "service-info",
    heading: "Service and pricing information",
    content: (
      <p>
        The service descriptions, scope information, and any pricing indications
        published on this website are for general informational purposes only.
        They are indicative and subject to change without notice. They do not
        constitute a binding offer or proposal. No rights can be derived from
        the content of this website alone. All engagements are subject to a
        separate written agreement between Inovense Agency and the client.
      </p>
    ),
  },
  {
    id: "availability",
    heading: "Website availability",
    content: (
      <p>
        We aim to keep this website available and accurate, but we do not
        guarantee uninterrupted, error-free, or continuous access. We reserve
        the right to modify, suspend, or discontinue any part of the website at
        any time and without prior notice. We are not liable for any
        inconvenience or loss caused by unavailability.
      </p>
    ),
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    content: (
      <>
        <p className="mb-4">
          To the extent permitted by law, Inovense Agency is not liable for any
          direct, indirect, incidental, or consequential loss arising from:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            "The use of, or inability to use, this website or its content",
            "Errors, inaccuracies, or omissions in the content",
            "Unauthorised access to our systems",
            "Any loss of data, revenue, or business opportunity",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          This limitation applies regardless of whether the loss was foreseeable
          or whether we had been advised of the possibility of such loss.
        </p>
      </>
    ),
  },
  {
    id: "links",
    heading: "External links",
    content: (
      <p>
        This website may contain links to third-party websites. These links are
        provided for convenience only. We do not endorse, control, or accept
        responsibility for the content, accuracy, or privacy practices of any
        external site. Visiting linked websites is at your own risk.
      </p>
    ),
  },
  {
    id: "governing-law",
    heading: "Governing law",
    content: (
      <p>
        These terms are governed by and construed in accordance with the laws of
        the Netherlands. Any disputes arising from the use of this website or
        these terms will be subject to the exclusive jurisdiction of the
        competent courts in the Netherlands.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    content: (
      <p>
        We may update these terms from time to time. The current version will
        always be published on this page with the date it was last updated.
        Continued use of the website after any update constitutes acceptance of
        the revised terms.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    content: (
      <>
        <p className="mb-4">For any questions regarding these terms:</p>
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

export default function TermsOfUsePage() {
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
                Terms of Use
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
