import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { Icon } from "./icons";

const LINE = "rgba(255,255,255,0.055)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const CYAN = "#4DE8E1";
const CYAN_SOFT = "rgba(77,232,225,0.10)";
const CYAN_LINE = "rgba(77,232,225,0.28)";

const BULLETS = [
  { h: "Triggers", b: "Forms, emails, CRM events, schedules, webhooks." },
  { h: "Operator steps", b: "Multi-step planning, tool use, structured output." },
  { h: "Approvals", b: "Insert a human at any step, in any channel." },
  { h: "Branching", b: "Conditional logic, retries, fan-out, fan-in." },
];

const STEPS: { icon: Parameters<typeof Icon>[0]["name"]; label: string; sub: string; color: string; editing?: boolean }[] = [
  { icon: "bolt", label: "Trigger", sub: "New form submission", color: "#A4ABB4" },
  { icon: "spark", label: "Enrich record", sub: "Clearbit + memory", color: "#A78BFA" },
  { icon: "target", label: "Qualify lead", sub: "Revenue operator", color: "#4DE8E1" },
  { icon: "branch", label: "If ICP score ≥ 70", sub: "Branch", color: "#F5C26B" },
  { icon: "doc", label: "Draft personalized reply", sub: "Model · brand voice", color: "#4DE8E1", editing: true },
  { icon: "check2", label: "Human approval", sub: "Slack #revops", color: "#F5C26B" },
  { icon: "arrowUR", label: "Send & log", sub: "Gmail → HubSpot", color: "#51D88A" },
];

function WorkflowBuilderMock() {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: "linear-gradient(180deg, #0C0F14, #07090C)", boxShadow: `inset 0 0 0 1px ${LINE}, 0 30px 60px -30px rgba(0,0,0,0.6)` }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-2">
          <Icon name="flow" size={14} style={{ color: CYAN }} />
          <strong className="text-[13px] font-medium" style={{ color: TEXT }}>
            Inbound · Revenue
          </strong>
          <span
            className="rounded-full px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.06em]"
            style={{ background: CYAN_SOFT, color: CYAN, boxShadow: `inset 0 0 0 1px ${CYAN_LINE}` }}
          >
            v8 · live
          </span>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[11px] sm:flex" style={{ color: TEXT_MUTE }}>
          <span>auto-saved 2s ago</span>
          <span className="rounded px-1.5 py-0.5" style={{ background: "rgba(255,255,255,0.04)", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
            Run
          </span>
        </div>
      </div>

      <div
        className="relative p-4 sm:p-5"
        style={{
          background:
            "radial-gradient(600px 300px at 50% 0%, rgba(77,232,225,0.05), transparent 70%), #08090C",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        <div className="relative flex flex-col gap-2">
          <div
            aria-hidden
            className="absolute bottom-3 left-[15px] top-3 w-px border-l"
            style={{ borderColor: "rgba(77,232,225,0.18)", borderStyle: "dashed" }}
          />
          {STEPS.map((s) => (
            <div
              key={s.label}
              className="relative flex items-center gap-2.5 rounded-[10px] p-2.5"
              style={{ background: "linear-gradient(180deg, #11151B, #0B0E13)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
            >
              <span
                className="grid h-6 w-6 flex-none place-items-center rounded-md"
                style={{ background: `${s.color}10`, color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}55` }}
              >
                <Icon name={s.icon} size={12} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium" style={{ color: TEXT }}>
                  {s.label}
                </div>
                <div className="truncate font-mono text-[11px]" style={{ color: TEXT_MUTE }}>
                  {s.sub}
                </div>
              </div>
              {s.editing && (
                <span
                  className="ml-auto rounded-full px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.06em]"
                  style={{ background: CYAN_SOFT, color: CYAN, boxShadow: `inset 0 0 0 1px ${CYAN_LINE}` }}
                >
                  Editing
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-center">
          <span
            className="rounded-full px-3 py-1.5 font-mono text-[11px]"
            style={{ background: "rgba(255,255,255,0.02)", color: TEXT_MUTE, boxShadow: `inset 0 0 0 1px ${LINE}` }}
          >
            + Add step
          </span>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsSection() {
  return (
    <section id="workflows" className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="grid items-center gap-10 min-[1001px]:grid-cols-[1fr_1.05fr] min-[1001px]:gap-14">
        <Reveal>
          <div>
            <Eyebrow>Workflows</Eyebrow>
            <h2
              className="font-medium"
              style={{ color: TEXT, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.03em" }}
            >
              Compose work the way
              <br />
              your business actually runs.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: TEXT_MUTE, maxWidth: "48ch" }}>
              Drag steps together — triggers, operator actions, tool calls, approvals — and Inovense OS runs
              them like a production system. Every run is observable, retriable and idempotent.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-5 min-[481px]:grid-cols-2">
              {BULLETS.map((item) => (
                <div key={item.h}>
                  <div className="flex items-center gap-2 text-[14px]">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
                    <strong className="font-medium" style={{ color: TEXT }}>
                      {item.h}
                    </strong>
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-[1.5]" style={{ color: TEXT_MUTE }}>
                    {item.b}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <WorkflowBuilderMock />
        </Reveal>
      </div>
    </section>
  );
}
