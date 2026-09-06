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
  title: "AI Operators for Business",
  description: "Meet the current Auterim AI operators for revenue, client flow and operations. Each owns a defined business responsibility and works within clear approval boundaries.",
  alternates: { canonical: "https://auterim.com/operators" },
  openGraph: { url: "https://auterim.com/operators", title: "AI Operators for Business | Auterim", description: "Meet the current Auterim operators for revenue, client flow and operations, built around approved business context and clear control boundaries.", type: "website", images: [{ url: "/og/og-operators.png", width: 1200, height: 630, alt: "Auterim AI Operator Registry" }] },
  twitter: { card: "summary_large_image", title: "AI Operators for Business | Auterim", description: "Meet the current Auterim operators for revenue, client flow and operations, built around approved business context and clear control boundaries.", images: [{ url: "/og/og-operators.png", width: 1200, height: 630, alt: "Auterim AI Operator Registry" }] },
};

const liveOperators: Array<{ key: OperatorKey; color: string; name: string; tag: string; owns: string; value: string; systems: string; work: string; control: string }> = [
  { key: "revenue", color: "#4DE8E1", name: "Revenue Operator", tag: "Sales · Pipeline", owns: "Inbound opportunities and sales follow-up.", value: "Keeps qualified interest moving while external actions remain reviewable.", systems: "Gmail or Microsoft 365; HubSpot adds CRM updates; Salesforce adds read context.", work: "Reads inbox context, prepares a follow-up, and creates an approval before an external send. HubSpot updates are approval-gated.", control: "External email and CRM writes wait for approval. Salesforce is read-context only today." },
  { key: "client_flow", color: "#5B8DEF", name: "Client Flow Operator", tag: "Intake · Onboarding", owns: "Client onboarding communication and handoff momentum.", value: "Prepares the next client update or handoff without losing the approval boundary.", systems: "Gmail or Microsoft 365; calendar and document context expand the role when available.", work: "Prepares onboarding summaries, follow-up drafts, and handoff checklists from approved workspace context.", control: "Client-facing messages and external invitations remain approval-gated." },
  { key: "operations", color: "#51D88A", name: "Operations Operator", tag: "Reports · Internal", owns: "Stalled internal work and delivery follow-through.", value: "Surfaces blocked work and prepares a controlled internal next step.", systems: "Trello; Slack adds internal channel visibility and approval-gated messages.", work: "Monitors boards for blocked, overdue, or stalled cards and prepares an update, card action, or escalation.", control: "Trello changes and Slack messages remain prepared until the right person approves them." },
];

const futureOperators = OPERATORS.slice(3);
const loopDescriptions = ["Find a signal in approved context.", "Make the next step specific.", "Route sensitive work to an owner.", "Run only what policy permits.", "Leave a reviewable record."];

export default function OperatorsPage() {
  return <div className="auterim-v3-page operators-registry-page"><V3Header /><main>
    <section className="page-hero operators-registry-hero"><div className="wrap"><div className="close-main"><span className="lbl"><i aria-hidden="true" />The AI workforce</span><h1>Defined AI operators for real business work.</h1><p>An operator monitors a defined area of your business, prepares the next action from approved context, works within policy, keeps consequential decisions visible, and records what happened.</p><div className="close-actions"><Link href="/getting-started" className="btn btn-a">See how operators deploy <span className="arrow">→</span></Link><Link href="/agents" className="btn btn-b">Why defined roles matter</Link></div></div></div></section>

    <section className="sec operators-explainer"><div className="wrap"><div className="operators-explainer-copy"><span className="lbl">How an operator works</span><h2>A role, a loop, and a visible boundary.</h2><p className="say">A generic AI agent can be configured for many jobs. An Auterim operator starts with one defined operating responsibility, approved systems, and a policy decision before consequential action proceeds.</p><p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm"><Link href="/integrations">Current integrations →</Link><Link href="/approvals">Approval boundaries →</Link><Link href="/workflows">Controlled workflows →</Link><Link href="/pricing">View pricing →</Link></p></div><ol className="operators-loop" aria-label="Operator operating loop">{["Detect", "Prepare", "Approve", "Execute", "Log"].map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong><p>{loopDescriptions[index]}</p></li>)}</ol></div></section>

    <section className="sec operators-live"><div className="wrap"><div className="registry-intro head"><span className="lbl">Available today</span><div><h2>Three operators, each with a focused operating loop.</h2><p className="say">Availability depends on the required connector and workspace setup. The roles below are the current product surface; the rest of the registry is intentionally separate.</p></div></div><div className="live-operator-grid">{liveOperators.map((operator) => <article className="live-operator-card" key={operator.key} style={{ "--operator-color": operator.color } as React.CSSProperties}><div className="live-operator-identity"><Image src={operatorAvatarPath(operator.key)} alt="" width={64} height={64} /><div><span>{operator.tag}</span><h3>{operator.name}</h3></div></div><div className="live-operator-facts"><div><span>Owns</span><p>{operator.owns}</p></div><div><span>Business value</span><p>{operator.value}</p></div><div><span>Current systems</span><p>{operator.systems}</p></div><div><span>Can prepare now</span><p>{operator.work}</p></div></div><div className="live-operator-control"><span>Control model</span><p>{operator.control}</p></div><Link href="/getting-started" className="live-operator-link">See deployment path <span>→</span></Link></article>)}</div></div></section>

    <section className="sec operators-future"><div className="wrap"><div className="registry-intro head"><span className="lbl">Expanding workforce</span><div><h2>Roles in the registry, not promises of live automation.</h2><p className="say">These roles define where the workforce can expand. They are preview, planned, or coming next; they do not represent current production-ready operator availability.</p></div></div><div className="future-operator-grid">{futureOperators.map((operator) => <div className="future-operator" key={operator.name}><span>{operator.tag}</span><strong>{operator.name}</strong><p>{operator.mission}</p><em>Expanding workforce</em></div>)}</div></div></section>

    <section className="sec operators-registry-cta"><div className="wrap"><div className="close-in"><div className="close-main"><span className="lbl"><i aria-hidden="true" />Start with your company</span><h2>Find the operator that fits the work already waiting.</h2><p>Start from company context, connect only the systems that matter, and activate a role with a clear approval boundary.</p><div className="close-actions"><Link href="/app/onboarding" className="btn btn-a">Start preview <span className="arrow">→</span></Link><Link href="/integrations" className="btn btn-b">Explore current integrations</Link></div></div></div></div></section>
  </main><V3Footer /></div>;
}
