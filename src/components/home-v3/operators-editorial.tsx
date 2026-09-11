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
    type: "Pipeline and renewals",
    body: "Keeps revenue work moving by surfacing risk and preparing the next move.",
    gate: "customer email and CRM changes",
    tools: ["Gmail", "HubSpot"],
  },
  {
    op: operator("Client Flow Operator"),
    type: "Onboarding and delivery",
    body: "Moves each client from signature to first value without a dropped step.",
    gate: "customer email and project changes",
    tools: ["Gmail", "Drive"],
  },
  {
    op: operator("Operations Operator"),
    type: "Delivery and project health",
    body: "Finds delivery risks and internal blockers before deadlines slip.",
    gate: "project changes and team updates",
    tools: ["Trello", "Slack"],
  },
  {
    op: operator("Support Operator"),
    type: "Customer support",
    body: "Triages inbound support, drafts the reply, and escalates what needs a human.",
    gate: "customer-facing replies and ticket changes",
    tools: ["Gmail", "Zendesk"],
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
            <p className="mt-[22px] max-w-[56ch] text-lg leading-[1.6]" style={{ color: "var(--auterim-v3-dim)" }}><ResponsiveCopy desktop="Each live operator has a defined job, real connector requirements, and clear execution boundaries." mobile="Four live roles work with your context, tools and boundaries." /></p>
          </div>
        </div>
        <Reveal>
          <div className="ops">
            {operators.map(({ op, type, body, gate, tools }, index) => (
              <details className="op" name="operator" key={op.name}>
                <summary>
                  <div className="op-row">
                    <div className="op-marker"><span className="op-index">{String(index + 1).padStart(2, "0")}</span><span className="op-avatar"><OperatorAvatar color={op.color} glyph={GLYPHS[op.glyph]} size={42} /></span></div>
                    <div className="op-name">
                      <h3 style={{ color: "var(--auterim-v3-ink)" }}>{op.name}</h3>
                      <div className="t">{type}</div>
                    </div>
                    <div className="op-say"><p>{body}</p><span className="gate">Approval required for {gate}.</span></div>
                    <div className="op-end">
                      <span className="tools-label">Connected systems</span>
                      <span className="tools" aria-label={`${op.name} connected systems`}>
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
