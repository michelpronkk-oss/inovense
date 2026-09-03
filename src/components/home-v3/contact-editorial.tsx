"use client";

import Link from "next/link";
import ContactForm from "@/components/contact-form";
import { appHref } from "@/lib/urls";
import { Head } from "./v3-page";
import V3Footer from "./v3-footer";
import { useReveal } from "./use-reveal";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";

const SUPPORT_FEATURES = [
  ["Reply time", "One business day", "Every message gets a real reply, not an autoresponder."],
  ["Who replies", "The team that builds it", "You reach the people running Auterim, not a support tier."],
  ["No pressure", "Nothing to commit to", "Ask anything before you connect a system or choose a plan."],
] as const;

const REASONS = [
  ["Sales", "Pricing and rollout", "Plans, procurement, or deploying Auterim across more than one team.", "sales@auterim.com", "Sales inquiry"],
  ["Support", "Already using Auterim", "Help with a run, an approval, or a connected system.", "support@auterim.com", "Support request"],
  ["Partnerships", "Integrations and referrals", "Build on Auterim, or bring it into a client engagement.", "hello@auterim.com", "Partnership inquiry"],
] as const;

export default function ContactEditorial() {
  useReveal("auterim-v3-page");

  return (
    <div className="auterim-v3-page">
      <section className="page-hero">
        <div className="wrap">
          <div className="close-main rv">
            <span className="lbl"><i aria-hidden="true" />Contact</span>
            <h1>Tell us what's taking up your team's time.</h1>
            <p>Talk to us about deploying your first operator, or ask anything about approvals, connectors and control before you connect a system.</p>
            <div className="close-actions">
              <Link href={appHref("/app/onboarding")} className="btn btn-a">Start free preview <span className="arrow">→</span></Link>
              <a href="mailto:hello@auterim.com" className="close-run">hello@auterim.com <span>→</span></a>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <Head label="Where to start" title="Pick what fits, or send a message below." />
          <div className="body connect-editorial-grid contact-reasons rv">
            {REASONS.map(([tag, title, body, email, subject]) => (
              <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} key={tag}>
                <span className="connect-editorial-number">{tag}</span>
                <h3>{title}</h3>
                <p>{body}</p>
                <span className="connect-editorial-cue"><i />{email} <span>→</span></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="sec contact-form-section">
        <div className="wrap">
          <Head label="Send a message" title="Write to us directly." />
          <div className="body connect-editorial-grid rv">
            {SUPPORT_FEATURES.map(([tag, title, body]) => (
              <article key={tag}>
                <span className="connect-editorial-number">{tag}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <div className="body rv"><ContactForm /></div>
        </div>
      </section>

      <V3Footer />
    </div>
  );
}
