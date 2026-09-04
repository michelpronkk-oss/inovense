import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import V3Header from "@/components/home-v3/v3-header";
import V3Footer from "@/components/home-v3/v3-footer";
import { OPERATORS } from "@/data/operators";
import { operatorAvatarPath } from "@/lib/operator-assets";
import type { OperatorKey } from "@/lib/operators/registry";
import "@/components/home-v3/auterim-v3.css";
import "@/components/home-v3/auterim-v3-refinement.css";
import "@/components/home-v3/auterim-v3-typography.css";
import "./operators-registry.css";

export const metadata: Metadata = {
  title: "AI Operator Registry | Auterim",
  description: "Explore Auterim's complete operator registry: defined roles, real context, connected tools and clear execution boundaries.",
  alternates: { canonical: "https://auterim.com/operators" },
  openGraph: {
    url: "https://auterim.com/operators",
    title: "AI Operator Registry | Auterim",
    description: "Explore defined AI roles with real company context, connected tools and clear execution boundaries.",
    type: "website",
    images: [{ url: "/og/og-operators.png", width: 1200, height: 630, alt: "Auterim AI Operator Registry" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Operator Registry | Auterim",
    description: "Explore defined AI roles with real company context, connected tools and clear execution boundaries.",
    images: [{ url: "/og/og-operators.png", width: 1200, height: 630, alt: "Auterim AI Operator Registry" }],
  },
};

const keys: OperatorKey[] = ["revenue", "client_flow", "operations", "marketing", "seo_implementation", "proposal_quote", "review_proof", "knowledge_memory", "approval_risk", "finance_billing", "support", "hiring_team", "social_community", "website_conversion", "automation_architect"];

export default function OperatorsPage() {
  return <div className="auterim-v3-page operators-registry-page"><V3Header /><main>
    <section className="page-hero operators-registry-hero"><div className="wrap"><div className="close-main"><span className="lbl"><i aria-hidden="true" />The workforce</span><h1>Operators built around the work.</h1><p>Every operator has a defined role, real company context, connected tools and a clear boundary for what it can do.</p><div className="close-actions"><Link href="/" className="btn btn-b">Back to the platform <span className="arrow">→</span></Link></div></div></div></section>
    <section className="sec operators-registry-section"><div className="wrap"><div className="registry-intro head"><span className="lbl">The complete registry</span><div><h2>Fifteen roles. One controlled operating layer.</h2><p className="say">Each role follows the same loop: detect the work, prepare the next step, pause where judgment matters, execute through the right systems and log the result.</p></div></div><div className="registry-list">{OPERATORS.map((operator, index) => <article className="registry-row" key={operator.name} style={{ "--operator-color": operator.color } as React.CSSProperties}><div className="registry-identity"><Image src={operatorAvatarPath(keys[index])} alt="" width={64} height={64} className="registry-avatar" /><div><span className="registry-index">{String(index + 1).padStart(2, "0")}</span><h3>{operator.name}</h3><span className="registry-tag">{operator.tag}</span></div></div><div className="registry-copy"><p>{operator.mission}</p><div className="registry-loop">{operator.loop.map((step) => <div key={step.k} className={step.k === "Approve" ? "gate" : ""}><span>{step.k}</span><p>{step.t}</p></div>)}</div></div><div className="registry-boundary"><span className="lbl">Approval boundary</span><strong>{operator.loop.find((step) => step.k === "Approve")?.t}</strong></div></article>)}</div></div></section>
    <section className="sec operators-registry-cta"><div className="wrap"><div className="close-in"><div className="close-main"><span className="lbl"><i aria-hidden="true" />Start with your company</span><h2>See which operators fit your business.</h2><p>Preview your company profile and receive a workforce recommendation grounded in the work you actually do.</p><div className="close-actions"><Link href="/app/onboarding" className="btn btn-a">Start preview <span className="arrow">→</span></Link><Link href="/#how" className="btn btn-b">See how it works</Link></div></div></div></div></section>
  </main><V3Footer /></div>;
}
