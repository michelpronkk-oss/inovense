"use client";

import ContactForm from "@/components/contact-form";
import RequestEarlyAccessButton from "./request-early-access-button";
import { ContactHeroVisual } from "./page-specific-hero-visuals";
import { PublicHero } from "./public-page-components";
import { Icon } from "./icons";
import { useReveal } from "./use-reveal";

const routes = [
  { label: "General", icon: "message" as const, address: "hello@auterim.com", href: "mailto:hello@auterim.com", description: "Questions about Auterim, the operating model, or working together." },
  { label: "Support", icon: "shield" as const, address: "support@auterim.com", href: "mailto:support@auterim.com", description: "Help with an account, connection, approval, or operator run." },
];

export default function ContactEditorial() {
  useReveal("auterim-v3-page");

  return <>
    <PublicHero label="Contact" title="Tell us where work keeps getting stuck." description="Talk to us about your work, your systems, or the next step with Auterim." action={false} visual={<ContactHeroVisual />} />
    <section className="sec public-content contact-public-content">
      <div className="wrap">
        <div className="public-section-heading rv"><span>Direct routes</span><div><h2>Start with the right conversation.</h2><p>Use the contact form for a message, email the team directly, or request Early Access through the shared form.</p></div></div>

        <div className="contact-public-routes rv">
          {routes.map((route) => (
            <a href={route.href} key={route.label} className="contact-public-route">
              <span className="contact-public-route-top">
                <span className="contact-public-route-ic" aria-hidden="true"><Icon name={route.icon} size={15} /></span>
                <span>{route.label}</span>
              </span>
              <strong>{route.address}</strong>
              <p>{route.description}</p>
              <span className="contact-public-route-go" aria-hidden="true">Send a message <Icon name="arrowUR" size={12} /></span>
            </a>
          ))}
          <div className="contact-public-route-action">
            <span className="contact-public-route-top">
              <span className="contact-public-route-ic contact-public-route-ic-live" aria-hidden="true"><i /></span>
              <span>Early Access</span>
            </span>
            <p>Share the work you want an Operator to support.</p>
            <RequestEarlyAccessButton className="public-inline-button" />
          </div>
        </div>

        <div className="contact-form-panel rv">
          <div className="contact-form-heading"><span className="lbl">Send a message</span><h2>Write to the Auterim team.</h2><p>Include enough detail for us to understand the question. Do not send passwords, access tokens, or other credentials.</p></div>
          <ContactForm />
        </div>

        <p className="contact-followup rv">Messages are sent to <a href="mailto:hello@auterim.com">hello@auterim.com</a>. For account support, you can also write to <a href="mailto:support@auterim.com">support@auterim.com</a>.</p>
      </div>
    </section>
  </>;
}
