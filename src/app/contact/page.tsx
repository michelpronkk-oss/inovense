import type { Metadata } from "next";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import ContactForm from "@/components/contact-form";
import Reveal from "@/components/reveal";
import { PageShell, Eyebrow, PageCTA, MktCard } from "@/components/marketing-ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Inovense team. Book a demo, ask about pricing, discuss operator setup, or explore partnerships.",
  alternates: {
    canonical: "https://auterim.com/contact",
  },
  openGraph: {
    url: "https://auterim.com/contact",
    title: "Contact | Inovense",
    description: "Get in touch with the Inovense team. Book a demo, ask about pricing, discuss operator setup, or explore partnerships.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | Inovense",
    description: "Get in touch with the Inovense team. Book a demo, ask about pricing, discuss operator setup, or explore partnerships.",
  },
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <PageShell>
          <Reveal>
            <section className="mx-auto w-full max-w-6xl px-6 pb-18 pt-38">
              <div className="grid gap-10 lg:grid-cols-[1.05fr_1.15fr] lg:items-start">
                <div>
                  <Eyebrow>Contact</Eyebrow>
                  <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-100 md:text-5xl" style={{ letterSpacing: "-0.03em", lineHeight: 1.03 }}>
                    Let us design your first operator execution layer.
                  </h1>
                  <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-zinc-400">
                    Talk directly with the Inovense team about operator setup, workflows, policy guardrails, approvals, and connector strategy for your business.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {[
                      {
                        title: "Book product demo",
                        sub: "Walk through your workflow map",
                        href: "mailto:hello@auterim.com?subject=Book product demo",
                      },
                      {
                        title: "Operator setup",
                        sub: "Deployment planning and policies",
                        href: "mailto:hello@auterim.com?subject=Operator setup request",
                      },
                      {
                        title: "Sales and pricing",
                        sub: "Capacity planning and rollout",
                        href: "mailto:hello@auterim.com?subject=Sales inquiry",
                      },
                      {
                        title: "Partnerships",
                        sub: "Design partner and integrations",
                        href: "mailto:hello@auterim.com?subject=Partnership inquiry",
                      },
                    ].map((card) => (
                      <a key={card.title} href={card.href} className="block">
                        <MktCard className="h-full p-4">
                          <p className="text-sm font-medium text-zinc-100">{card.title}</p>
                          <p className="mt-1 text-xs text-zinc-500">{card.sub}</p>
                        </MktCard>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/65 p-7 md:p-8" style={{ boxShadow: "0 28px 65px -38px rgba(77,232,225,0.3)" }}>
                  <h2 className="mb-2 text-lg font-semibold text-zinc-100">Send us a message</h2>
                  <p className="mb-6 text-sm text-zinc-500">We reply within one business day.</p>
                  <ContactForm />
                </div>
              </div>
            </section>
          </Reveal>

          <PageCTA
            heading="Start with one controlled operator."
            sub="Bring your workflow and constraints. We will help you define a safe first deployment path."
            primary="Get Starter"
            primaryHref="/app/onboarding"
            secondary="Book a 20-min demo"
            secondaryHref="mailto:hello@auterim.com?subject=Book%20a%2020-min%20demo"
          />
        </PageShell>

      </main>
      <Footer />
    </>
  );
}
