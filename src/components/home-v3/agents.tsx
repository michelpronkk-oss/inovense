import Link from "next/link";
import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { OperatorAvatar } from "@/components/operators/avatar";
import { OPERATORS, GLYPHS } from "@/data/operators";
import { Icon } from "./icons";

const LINE = "rgba(255,255,255,0.055)";
const LINE_2 = "rgba(255,255,255,0.085)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const CYAN = "#4DE8E1";
const GREEN_SOFT = "rgba(81,216,138,0.10)";
const GREEN = "#51D88A";

function findOperator(name: string) {
  const op = OPERATORS.find((o) => o.name === name);
  if (!op) throw new Error(`Operator not found: ${name}`);
  return op;
}

const AGENTS = [
  {
    op: findOperator("Revenue Operator"),
    tag: "Sales · Pipeline",
    bullets: [
      "Triage inbound, enrich, route by ICP",
      "Draft follow-ups in your brand voice",
      "Surface opportunities & proposal angles",
      "Sync notes back to CRM automatically",
    ],
    stat: { num: "326", unit: "actions / week", delta: "+38%" },
    hint: "Currently drafting 14 follow-ups",
  },
  {
    op: findOperator("Marketing Operator"),
    tag: "Content · SEO · Campaigns",
    bullets: [
      "Generate briefs, drafts and ad angles",
      "Run SEO research against live data",
      "Pause campaigns under reply thresholds",
      "Hand finished work back for approval",
    ],
    stat: { num: "118", unit: "outputs / week", delta: "+24%" },
    hint: "Drafting Q3 campaign brief",
  },
  {
    op: findOperator("Client Flow Operator"),
    tag: "Intake · Onboarding",
    bullets: [
      "Run intake forms and clarifying threads",
      "Prepare onboarding kits & SOWs",
      "Schedule reminders without nagging",
      "Keep clients informed at every step",
    ],
    stat: { num: "42", unit: "intakes / week", delta: "+12%" },
    hint: "Awaiting approval — Northwind kit",
  },
  {
    op: findOperator("Operations Operator"),
    tag: "Reports · Internal",
    bullets: [
      "Compile weekly summaries across tools",
      "Maintain runbooks & SOP clarity",
      "Auto-file recurring internal tasks",
      "Flag drift in metrics & process",
    ],
    stat: { num: "9.2h", unit: "saved / week", delta: "+1.4h" },
    hint: "Building weekly digest",
  },
];

export default function AgentsSection() {
  return (
    <section id="agents" className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
      <Reveal>
        <div className="mb-12 flex flex-col items-center text-center">
          <Eyebrow>Operators</Eyebrow>
          <h2
            className="font-medium"
            style={{ color: TEXT, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.03em" }}
          >
            Operators, not chat threads.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: TEXT_MUTE, maxWidth: "58ch" }}>
            Inovense operators are scoped to a role and trained on the way your business runs. They plan
            multi-step work, act where you&apos;ve allowed it, and hand the rest to a human. These four lead
            the launch — fifteen in all.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-3.5 min-[881px]:grid-cols-2">
        {AGENTS.map((a, i) => (
          <Reveal key={a.op.name} delayMs={(i % 2) * 80}>
            <div
              className="relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 sm:p-6"
              style={{ background: "linear-gradient(180deg, #0E1218, #090C11)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-40"
                style={{ background: `linear-gradient(90deg, transparent, ${a.op.color}, transparent)` }}
              />

              <div className="flex items-center gap-3.5">
                <OperatorAvatar color={a.op.color} glyph={GLYPHS[a.op.glyph]} size={44} />
                <div className="min-w-0">
                  <div className="text-[17px] font-medium" style={{ color: TEXT, letterSpacing: "-0.015em" }}>
                    {a.op.name}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.06em]" style={{ color: TEXT_MUTE }}>
                    {a.tag}
                  </div>
                </div>
                <span
                  className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] font-mono text-[10.5px] uppercase tracking-[0.06em]"
                  style={{ background: "rgba(255,255,255,0.04)", color: TEXT_DIM, boxShadow: `inset 0 0 0 1px ${LINE}` }}
                >
                  <span
                    className="h-1.5 w-1.5 animate-pulse-dot rounded-full"
                    style={{ background: a.op.color, boxShadow: `0 0 8px ${a.op.color}` }}
                  />
                  Running
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {a.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: TEXT_DIM }}>
                    <span
                      className="mt-[3px] grid h-3.5 w-3.5 flex-none place-items-center rounded-[4px]"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <Icon name="check" size={9} style={{ color: CYAN }} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3.5" style={{ borderColor: LINE }}>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] font-medium" style={{ color: TEXT, letterSpacing: "-0.02em" }}>
                    {a.stat.num}
                  </span>
                  <span className="font-mono text-[11.5px]" style={{ color: TEXT_MUTE }}>
                    {a.stat.unit}
                  </span>
                  <span className="rounded px-1.5 py-0.5 font-mono text-[10.5px]" style={{ background: GREEN_SOFT, color: GREEN }}>
                    {a.stat.delta}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px]" style={{ color: TEXT_MUTE }}>
                  <span
                    className="h-1.5 w-1.5 animate-pulse-dot rounded-full"
                    style={{ background: a.op.color, boxShadow: `0 0 6px ${a.op.color}` }}
                  />
                  {a.hint}
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-8 flex justify-center">
          <Link
            href="/operators"
            className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-[14.5px] font-medium transition-colors duration-150"
            style={{ background: "rgba(255,255,255,0.025)", color: TEXT, boxShadow: `inset 0 0 0 1px ${LINE_2}` }}
          >
            Explore all 15 operators
            <Icon name="arrow" size={14} />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
