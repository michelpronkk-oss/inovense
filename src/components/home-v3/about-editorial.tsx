"use client";

import Link from "next/link";
import V3Header from "./v3-header";
import V3Footer from "./v3-footer";
import { useReveal } from "./use-reveal";
import { appHref } from "@/lib/urls";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";
import "./about-editorial.css";

const principles = [
  ["01", "Understand before acting", "AI should learn the company, its systems and its boundaries before it moves work forward."],
  ["02", "Prepare before sending", "Useful automation starts by preparing good work, not by pushing blind actions into production."],
  ["03", "Keep judgment human", "Not every step needs approval. The important boundaries should always be explicit."],
  ["04", "Work inside the business", "Companies should not replace the systems they trust just to benefit from AI."],
  ["05", "Measure the work", "AI should be judged by the work it helps move forward, not by how impressive a response looks."],
] as const;

const operatingLayer = [
  ["Company context", "The business, systems, processes and working rules every operator starts with.", "/#profile"],
  ["Operators", "Purpose-built roles that prepare and coordinate the work a team already needs to do.", "/agents"],
  ["Approvals and policies", "Clear boundaries for what can run, what needs a decision and what is never allowed.", "/approvals"],
  ["Memory and measurement", "Useful context persists while runs, decisions and outcomes remain reviewable.", "/memory"],
  ["Existing systems", "Auterim works across the tools where customer history, work and communication already live.", "/integrations"],
] as const;

export default function AboutEditorial() {
  useReveal("auterim-v3-page");

  return (
    <div className="auterim-v3-page about-page">
      <V3Header />
      <main>
        <section className="page-hero about-hero">
          <div className="wrap">
            <div className="close-main rv">
              <span className="lbl"><i aria-hidden="true" />About Auterim</span>
              <h1>AI should understand the business before it touches the work.</h1>
              <p>Auterim exists because businesses should not have to choose between AI speed and operational control. We are building an AI workforce that learns how a company works, prepares useful work across its existing systems and keeps important boundaries clear.</p>
              <div className="close-actions">
                <Link href={appHref("/app/onboarding")} className="btn btn-a">Start preview <span className="arrow">→</span></Link>
                <Link href="/#how" className="btn btn-b">See how it works</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="sec about-why">
          <div className="wrap">
            <div className="head rv">
              <span className="lbl">Why Auterim exists</span>
              <div><h2>Businesses do not need more AI tools. They need AI that understands how work actually happens.</h2><p className="say">Real work is spread across inboxes, CRM, tasks, documents, conversations, approvals and the knowledge people carry. The hard part is not generating more content. It is knowing what matters, what should happen next, who owns the decision and where action is safe.</p></div>
            </div>
            <div className="about-why-grid body rv">
              <div><span className="n">01</span><strong>A blank prompt is not a business.</strong><p>Most AI products begin with an isolated task. Auterim begins with the company that task belongs to.</p></div>
              <div><span className="n">02</span><strong>Coordination is the constraint.</strong><p>Work waits when context is scattered, ownership is unclear or the next action is trapped in one person&apos;s inbox.</p></div>
              <div><span className="n">03</span><strong>Control makes speed usable.</strong><p>AI can move faster when the company has already defined its permissions, policies and approval boundaries.</p></div>
            </div>
          </div>
        </section>

        <section className="sec about-principles">
          <div className="wrap">
            <div className="head rv"><span className="lbl">Our point of view</span><div><h2>Build depth before theatre.</h2><p className="say">The product should fit the way a business already works, then make that work more capable without making control harder to see.</p></div></div>
            <div className="about-principle-list body">
              {principles.map(([number, title, body]) => <div className="about-principle rv" key={number}><span className="n">{number}</span><h3>{title}</h3><p>{body}</p></div>)}
            </div>
          </div>
        </section>

        <section className="sec about-shift">
          <div className="wrap">
            <div className="head rv"><span className="lbl">The shift</span><div><h2>Software is moving from waiting for instructions to understanding context.</h2><p className="say">The next useful layer of software will prepare work, coordinate across systems and know when to stop. Businesses will trust it only when permissions are clear, actions are traceable and people can intervene.</p></div></div>
            <div className="about-signal rv" aria-label="Context to controlled work"><div><span>Context</span><strong>Understand the business</strong></div><i aria-hidden="true" /><div><span>Work</span><strong>Prepare the next action</strong></div><i className="gate" aria-hidden="true" /><div><span>Boundary</span><strong>Keep judgment where it matters</strong></div></div>
          </div>
        </section>

        <section className="sec about-layer">
          <div className="wrap">
            <div className="head rv"><span className="lbl">What we are building</span><div><h2>An operating layer for AI work.</h2><p className="say">Auterim brings the pieces together without asking the business to abandon the systems, knowledge and controls it already depends on.</p></div></div>
            <div className="about-layer-list body">
              {operatingLayer.map(([title, body, href]) => <Link className="about-layer-row rv" href={href} key={title}><span className="about-layer-arrow">↗</span><h3>{title}</h3><p>{body}</p><span className="about-layer-link">Explore <b>→</b></span></Link>)}
            </div>
          </div>
        </section>

        <section className="sec about-not">
          <div className="wrap">
            <div className="head rv"><span className="lbl">A deliberate choice</span><div><h2>What we chose not to build.</h2><p className="say">Auterim starts with the business itself: its context, systems, work patterns and controls.</p></div></div>
            <div className="about-not-list body rv">
              {["A chatbot waiting for another prompt.", "An automation builder that starts with wiring steps together.", "Autonomous software acting without boundaries.", "Another system where the business must move all its work."] .map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></div>)}
            </div>
          </div>
        </section>

        <section className="sec about-control">
          <div className="wrap">
            <div className="head rv"><span className="lbl">Built around control</span><div><h2>Autonomy should have boundaries.</h2><p className="say">AI becomes useful when it can move work forward. It becomes trustworthy when the company defines where it can and cannot act.</p></div></div>
            <div className="about-control-grid body rv">
              <div><span className="control-dot can" /><h3>Can run</h3><p>Work your policy allows to continue automatically.</p></div>
              <div><span className="control-dot review" /><h3>Needs approval</h3><p>Actions that pause for the named owner to decide.</p></div>
              <div><span className="control-dot block" /><h3>Never allowed</h3><p>Actions the company has explicitly ruled out.</p></div>
            </div>
            <Link className="about-inline-link rv" href="/approvals">See how approvals work <span>→</span></Link>
          </div>
        </section>

        <section className="sec about-company">
          <div className="wrap"><div className="about-company-line rv"><span className="lbl">The company we are building</span><p>Auterim is building software for controlled AI work: a product with a clear point of view about how intelligence should fit inside a real business.</p></div></div>
        </section>

        <section className="close about-cta">
          <div className="wrap close-in rv"><div className="close-main"><span className="lbl"><i aria-hidden="true" />Start with your company</span><h2>See what Auterim would build around your business.</h2><p>Start with a preview of your company context and recommended workforce. Connect live systems when you are ready.</p><div className="close-actions"><Link href={appHref("/app/onboarding")} className="btn btn-a">Start preview <span className="arrow">→</span></Link><Link href="/#how" className="btn btn-b">See how it works</Link></div></div></div>
        </section>
      </main>
      <V3Footer />
    </div>
  );
}
