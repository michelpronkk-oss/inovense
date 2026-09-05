import Link from "next/link";
import Reveal from "@/components/reveal";
import { OperatorAvatar } from "@/components/operators/avatar";
import { GLYPHS, OPERATORS } from "@/data/operators";
import { LOGOS } from "./integrations-grid";
import "./auterim-v3-editorial.module.css";
import { ResponsiveCopy } from "./responsive-copy";

function operator(name: string) {
  const match = OPERATORS.find((item) => item.name === name);
  if (!match) throw new Error(`Operator profile not found: ${name}`);
  return match;
}

const operators = [
  {
    op: operator("Revenue Operator"),
    type: "Sales / Pipeline",
    body: "Qualifies inbound demand, prepares follow-ups and keeps CRM next steps current from real revenue signals.",
    gate: "External email, CRM contact and deal updates",
    status: "Connector setup",
    tools: ["Gmail", "HubSpot"],
  },
  {
    op: operator("Client Flow Operator"),
    type: "Intake / Onboarding",
    body: "Prepares client updates, onboarding messages, checklists and handoff summaries as requests arrive.",
    gate: "Client-facing messages and calendar invites",
    status: "Connector setup",
    tools: ["Gmail", "Calendar"],
  },
  {
    op: operator("Operations Operator"),
    type: "Reports / Internal",
    body: "Monitors project work, finds stalled tasks and prepares approved internal updates before work becomes delayed.",
    gate: "External email and Slack updates",
    status: "Workspace setup",
    tools: ["Trello", "Slack"],
  },
  {
    op: operator("Marketing Operator"),
    type: "Content / Campaigns",
    body: "Prepares campaign briefs, content drafts and brand-aware planning from your approved company context.",
    gate: "Publishing and external email",
    status: "Preview",
    tools: ["Draft-only"],
  },
];

export default function OperatorsEditorial() {
  return (
    <section id="operators" className="auterim-v3-editorial sec">
      <div className="wrap">
        <div className="mb-10 grid gap-5 md:grid-cols-[190px_minmax(0,1fr)] md:gap-[60px]">
          <div className="font-mono text-[10px] uppercase tracking-[.2em]" style={{ color: "var(--auterim-v3-mute)" }}>The workforce</div>
          <div>
            <h2 className="max-w-[22ch] font-medium" style={{ color: "var(--auterim-v3-ink)", fontSize: "clamp(30px,3.5vw,46px)", lineHeight: 1.1 }}>Operators are roles, not chatbots.</h2>
            <p className="mt-[22px] max-w-[56ch] text-lg leading-[1.6]" style={{ color: "var(--auterim-v3-dim)" }}><ResponsiveCopy desktop="Each operator has a defined job, its own context, connected tools and clear execution boundaries. Four of fifteen are shown." mobile="Specialized roles work with your context, tools and boundaries." /></p>
          </div>
        </div>
        <Reveal>
          <div className="ops">
            {operators.map(({ op, type, body, gate, status, tools }) => (
              <details className="op" key={op.name}>
                <summary>
                  <div className="op-row">
                    <span className="op-avatar"><OperatorAvatar color={op.color} glyph={GLYPHS[op.glyph]} size={42} /></span>
                    <div className="op-name">
                      <h3 style={{ color: "var(--auterim-v3-ink)" }}>{op.name}</h3>
                      <div className="t">{type}</div>
                    </div>
                    <p className="op-say">{body}<span className="gate">Gate: {gate}</span></p>
                    <div className="op-end">
                      <span className={`st ${status === "Preview" ? "preview" : ""}`}><i />{status}</span>
                      <span className="tools">
                        {tools.map((tool) => (
                          LOGOS[tool]
                            ? <span className="tool-logo" key={tool} title={tool}>{LOGOS[tool]}</span>
                            : <span key={tool}>{tool}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                  <span className="op-toggle" aria-hidden="true" />
                </summary>
                <div className="op-expand">
                  <p className="op-mission">{op.mission}</p>
                  <ul className="op-loop">
                    {op.loop.map((step) => <li key={step.k}><b>{step.k}</b><span>{step.t}</span></li>)}
                  </ul>
                </div>
              </details>
            ))}
          </div>
          <Link href="/operators" className="ops-more">View the full operator registry <span aria-hidden="true">→</span></Link>
        </Reveal>
      </div>
    </section>
  );
}
