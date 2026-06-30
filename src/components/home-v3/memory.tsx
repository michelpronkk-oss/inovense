import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { Icon } from "./icons";

const LINE = "rgba(255,255,255,0.055)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const CYAN = "#4DE8E1";
const CYAN_SOFT = "rgba(77,232,225,0.08)";
const CYAN_LINE = "rgba(77,232,225,0.28)";

const LIST = [
  { h: "Source-of-truth aware", b: "Connects directly to your CRM, docs and warehouse. Memory updates as your business updates." },
  { h: "Scoped retrieval", b: "Each operator only sees the slices of memory it's authorized to read." },
  { h: "Custom entities", b: "Define accounts, projects, deals, contracts â€” the way your team already names them." },
  { h: "Versioned & audit-friendly", b: "Every memory write is logged. Roll back, replay, attribute." },
];

const NODES: { pos: string; icon: Parameters<typeof Icon>[0]["name"]; label: string; val: string }[] = [
  { pos: "left-[4%] top-[8%]", icon: "briefcase", label: "Account", val: "Northwind Co." },
  { pos: "right-[4%] top-[8%]", icon: "user", label: "Contact", val: "Aiko Tanaka" },
  { pos: "left-0 top-1/2 -translate-y-1/2", icon: "doc", label: "Document", val: "MSA-v4.pdf" },
  { pos: "right-0 top-1/2 -translate-y-1/2", icon: "trend", label: "Opportunity", val: "$184k Â· Series B" },
  { pos: "left-[8%] bottom-[6%]", icon: "flow", label: "Workflow", val: "Q3 onboarding" },
  { pos: "right-[8%] bottom-[6%]", icon: "message", label: "Thread", val: "#atlas-pilot" },
];

function MemoryVisual() {
  return (
    <div
      className="relative aspect-[4/3] overflow-hidden rounded-2xl"
      style={{ background: "linear-gradient(180deg, #0B0E13, #07090C)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(77,232,225,0.20), transparent 70%)" }}
      />

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 480 360" preserveAspectRatio="none">
        <g stroke="rgba(77,232,225,0.30)" strokeWidth="1" fill="none">
          <path d="M240 180 L 80 60" />
          <path d="M240 180 L 400 60" />
          <path d="M240 180 L 60 200" />
          <path d="M240 180 L 420 200" />
          <path d="M240 180 L 130 320" />
          <path d="M240 180 L 360 320" />
        </g>
      </svg>

      <div
        className="absolute left-1/2 top-1/2 z-10 flex max-w-[88%] -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-xl px-4 py-3"
        style={{
          background: "linear-gradient(180deg, #11151B, #0A0D12)",
          boxShadow: `inset 0 0 0 1px ${CYAN_LINE}, 0 16px 40px -16px rgba(77,232,225,0.30)`,
        }}
      >
        <Icon name="database" size={16} style={{ color: CYAN, flexShrink: 0 }} />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium" style={{ color: TEXT }}>
            Atlas &amp; Co. â€” business graph
          </div>
          <div className="font-mono text-[11px]" style={{ color: TEXT_MUTE }}>
            14,392 entities Â· synced 1m ago
          </div>
        </div>
      </div>

      {NODES.map((n) => (
        <div
          key={n.label}
          className={`absolute z-[1] hidden min-w-[120px] items-center gap-2 rounded-[9px] px-2.5 py-2 sm:flex ${n.pos}`}
          style={{ background: "linear-gradient(180deg, #0F1218, #0A0D12)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
        >
          <span
            className="grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px]"
            style={{ background: "rgba(255,255,255,0.04)", color: TEXT_DIM, boxShadow: `inset 0 0 0 1px ${LINE}` }}
          >
            <Icon name={n.icon} size={11} />
          </span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.05em]" style={{ color: TEXT_MUTE }}>
              {n.label}
            </div>
            <div className="truncate text-[12px] font-medium" style={{ color: TEXT }}>
              {n.val}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MemorySection() {
  return (
    <section id="memory" className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="grid items-center gap-10 min-[1001px]:grid-cols-[1.05fr_1fr] min-[1001px]:gap-14">
        <Reveal>
          <MemoryVisual />
        </Reveal>

        <Reveal delayMs={100}>
          <div>
            <Eyebrow>Memory &amp; context</Eyebrow>
            <h2
              className="font-medium"
              style={{ color: TEXT, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.03em" }}
            >
              Your business, as
              <br />
              an indexed graph.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: TEXT_MUTE, maxWidth: "50ch" }}>
              Auterim OS continuously builds a structured understanding of your company â€” accounts,
              opportunities, projects, people, documents â€” and makes it queryable by every operator. Nothing
              happens in a context-less chat.
            </p>

            <div className="mt-7 flex flex-col gap-4">
              {LIST.map((item) => (
                <div key={item.h} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 grid h-[22px] w-[22px] flex-none place-items-center rounded-[6px]"
                    style={{ background: CYAN_SOFT, color: CYAN, boxShadow: `inset 0 0 0 1px ${CYAN_LINE}` }}
                  >
                    <Icon name="check" size={11} />
                  </span>
                  <div>
                    <div className="text-[14.5px] font-medium" style={{ color: TEXT }}>
                      {item.h}
                    </div>
                    <div className="mt-1 text-[13.5px] leading-[1.5]" style={{ color: TEXT_MUTE }}>
                      {item.b}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
