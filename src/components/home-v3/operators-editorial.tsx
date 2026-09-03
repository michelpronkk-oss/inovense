import Link from "next/link";
import Reveal from "@/components/reveal";
import "./auterim-v3-editorial.module.css";

const operators = [
  ["Revenue Operator", "Sales · Pipeline", "Makes sure no lead, deal or follow-up ever slips through. Prepares follow-ups, CRM notes and deal updates from real pipeline signals.", "External email, pricing, deal stage", "Best first operator", "#4DE8E1"],
  ["Client Flow Operator", "Intake · Onboarding", "Keeps client communication, onboarding and delivery tight. Builds intake summaries, checklists and handoff notes as work arrives.", "Any client-facing message", "Ready to deploy", "#5B8DEF"],
  ["Operations Operator", "Reports · Internal", "Gives the company daily oversight and keeps work moving. Surfaces blockers, pending approvals and drift before they become delays.", "Team broadcasts", "Suggested", "#51D88A"],
  ["Marketing Operator", "Content · Campaigns", "Does not just advise on marketing; it prepares and runs the work. Angles, copy, briefs and schedules, drawn from your own positioning.", "Publishing, spend, claims", "Suggested", "#A78BFA"],
];

function OperatorIcon({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" style={{ color }}><path d="M3 17 9 11l4 4 8-9" /><path d="M14 6h7v7" /></svg>;
}

export default function OperatorsEditorial() {
  return (
    <section id="operators" className="auterim-v3-editorial sec">
      <div className="wrap">
      <div className="mb-10 grid gap-5 md:grid-cols-[190px_minmax(0,1fr)] md:gap-[60px]"><div className="font-mono text-[10px] uppercase tracking-[.2em]" style={{ color: "var(--auterim-v3-mute)" }}>The workforce</div><div><h2 className="max-w-[22ch] font-medium" style={{ color: "var(--auterim-v3-ink)", fontSize: "clamp(30px,3.5vw,46px)", lineHeight: 1.1 }}>Operators are roles, not chatbots.</h2><p className="mt-[22px] max-w-[56ch] text-lg leading-[1.6]" style={{ color: "var(--auterim-v3-dim)" }}>Each operator has a defined job, its own context, connected tools and clear execution boundaries. Four of fifteen are shown.</p></div></div>
      <Reveal><div className="ops">{operators.map(([name, type, body, gate, status, color]) => <article className="op" key={name}><span className="op-ic" style={{ color }}><OperatorIcon color={color} /></span><div className="op-name"><h3 style={{ color: "var(--auterim-v3-ink)" }}>{name}</h3><div className="t">{type}</div></div><p className="op-say">{body}<span className="gate">Gate: {gate}</span></p><div className="op-end"><span className={`st ${status === "Best first operator" ? "first" : ""}`}>{status}</span><span className="tools" aria-label="Connected tools"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke={color} /><path d="M4 8l8 6 8-6" stroke={color} /></svg><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke={color} /><path d="M8 12h8M12 8v8" stroke={color} /></svg></span></div></article>)}</div><Link href="/operators" className="ops-more">All fifteen operators <span aria-hidden="true">→</span></Link></Reveal>
      </div>
    </section>
  );
}
