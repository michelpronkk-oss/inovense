import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { Icon } from "./icons";

const LINE = "rgba(255,255,255,0.055)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const TEXT_FAINT = "#454A51";
const CYAN = "#4DE8E1";
const CYAN_SOFT = "rgba(77,232,225,0.08)";
const CYAN_LINE = "rgba(77,232,225,0.28)";

const BUSINESS: { icon: Parameters<typeof Icon>[0]["name"]; name: string; sub: string }[] = [
  { icon: "briefcase", name: "CRM", sub: "Salesforce / HubSpot" },
  { icon: "inbox", name: "Inbox & calendar", sub: "Gmail · Outlook" },
  { icon: "doc", name: "Docs", sub: "Notion · Drive · Confluence" },
  { icon: "database", name: "Data", sub: "Warehouse · Postgres · Stripe" },
  { icon: "message", name: "Comms", sub: "Slack · Teams · Intercom" },
];

const AI_TOOLS: { icon: Parameters<typeof Icon>[0]["name"]; name: string; sub: string; cyan?: boolean }[] = [
  { icon: "spark", name: "Frontier models", sub: "GPT · Claude · Gemini", cyan: true },
  { icon: "layers", name: "Embeddings", sub: "Voyage · OpenAI · Cohere" },
  { icon: "globe", name: "Browser & search", sub: "Web · Crawl · Retrieve" },
  { icon: "cube", name: "Code execution", sub: "Sandboxed runtime" },
  { icon: "cpu", name: "Custom tools", sub: "Internal APIs · webhooks" },
];

const PILLARS = [
  { num: "01", name: "Connectors", sub: "Auth + sync layer" },
  { num: "02", name: "Operator runtime", sub: "Plans · acts · escalates" },
  { num: "03", name: "Memory & context", sub: "Indexed business graph" },
  { num: "04", name: "Policy & boundaries", sub: "Allow-lists, approvals" },
  { num: "05", name: "Execution & audit", sub: "Logs, retries, replay" },
];

const ROW = [
  { num: "01", title: "Operators that operate", body: "Specialized AI workers — Revenue, Marketing, Client Flow, Operations — each scoped to real outcomes, not chat." },
  { num: "02", title: "Connected to systems", body: "Bi-directional connectors to CRM, inbox, calendar, billing, docs and data warehouses. Reads, writes, observes." },
  { num: "03", title: "Inside your boundaries", body: "Policies, approval gates, allow-lists and audit logs. Operators act only where you've explicitly said yes." },
];

function Tile({ icon, name, sub, cyan }: { icon: Parameters<typeof Icon>[0]["name"]; name: string; sub: string; cyan?: boolean }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[10px] p-3"
      style={{ background: "linear-gradient(180deg, #11151B, #0B0E13)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
    >
      <span
        className="grid h-7 w-7 flex-none place-items-center rounded-[7px]"
        style={
          cyan
            ? { background: CYAN_SOFT, color: CYAN, boxShadow: `inset 0 0 0 1px ${CYAN_LINE}` }
            : { background: "rgba(255,255,255,0.04)", color: TEXT_DIM, boxShadow: `inset 0 0 0 1px ${LINE}` }
        }
      >
        <Icon name={icon} size={14} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-medium" style={{ color: TEXT }}>
          {name}
        </div>
        <div className="truncate font-mono text-[11px]" style={{ color: TEXT_MUTE }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function Connector({ reverse }: { reverse?: boolean }) {
  const rows = reverse ? [40, 130, 230, 330] : [40, 110, 180, 250, 320];
  return (
    <div className="relative hidden min-[901px]:block" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 60 480" preserveAspectRatio="none">
        {rows.map((y, i) => (
          <line
            key={i}
            x1="0"
            x2="60"
            y1={y}
            y2={y}
            stroke="rgba(77,232,225,0.35)"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            className={reverse ? "animate-flow-dash-reverse" : "animate-flow-dash"}
            style={{ animationDuration: `${(reverse ? 1.6 : 1.5) + i * 0.1}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

function OperatingLayerDiagram() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 sm:p-6"
      style={{ background: "linear-gradient(180deg, #0B0E13, #07090C)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 80%)",
        }}
      />

      <div className="relative grid grid-cols-1 gap-3 min-[901px]:grid-cols-[1fr_48px_1fr_48px_1fr] min-[901px]:gap-0">
        {/* Left: business systems */}
        <div className="flex flex-col gap-2 p-1 min-[901px]:p-2">
          <div className="mb-1 px-2 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: TEXT_MUTE }}>
            Your business
          </div>
          {BUSINESS.map((t) => (
            <Tile key={t.name} {...t} />
          ))}
        </div>

        <Connector />

        {/* Center: Inovense OS */}
        <div className="p-1 min-[901px]:p-2">
          <div
            className="relative flex h-full min-h-[280px] flex-col gap-1.5 overflow-hidden rounded-[14px] p-4"
            style={{
              background: "radial-gradient(ellipse at center, rgba(77,232,225,0.10), transparent 70%), linear-gradient(180deg, #0E1218, #090C11)",
              boxShadow: `inset 0 0 0 1px ${CYAN_LINE}, 0 0 0 1px rgba(77,232,225,0.04), 0 20px 60px -20px rgba(77,232,225,0.18)`,
            }}
          >
            <div
              className="mb-1.5 inline-flex items-center gap-1.5 border-b pb-2 font-mono text-[11px]"
              style={{ borderColor: LINE, color: CYAN }}
            >
              <svg width="16" height="16" viewBox="0 0 64 64" fill="none" aria-hidden>
                <g fill={CYAN}>
                  <rect x="10" y="10" width="44" height="9" />
                  <rect x="26" y="19" width="12" height="12" />
                  <rect x="26" y="33" width="12" height="12" />
                  <rect x="10" y="45" width="44" height="9" />
                </g>
              </svg>
              <span className="font-medium" style={{ color: TEXT, letterSpacing: "0.12em", fontSize: 11 }}>
                INOVENSE&nbsp;OS
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              {PILLARS.map((p) => (
                <div
                  key={p.num}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                  style={{ background: "rgba(255,255,255,0.025)", boxShadow: `inset 0 0 0 1px ${LINE}`, color: TEXT }}
                >
                  <span className="font-mono text-[10px]" style={{ color: CYAN, width: 18 }}>
                    {p.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium">{p.name}</div>
                    <div className="font-mono text-[10.5px]" style={{ color: TEXT_MUTE }}>
                      {p.sub}
                    </div>
                  </div>
                  <span
                    className="ml-auto h-1.5 w-1.5 flex-none animate-pulse-dot rounded-full"
                    style={{ background: CYAN, boxShadow: `0 0 6px ${CYAN}` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Connector reverse />

        {/* Right: AI models & tools */}
        <div className="flex flex-col gap-2 p-1 min-[901px]:p-2">
          <div className="mb-1 px-2 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: TEXT_MUTE }}>
            AI models &amp; tools
          </div>
          {AI_TOOLS.map((t) => (
            <Tile key={t.name} {...t} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OperatingLayerSection() {
  return (
    <section id="platform" className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
      <Reveal>
        <div className="mb-10 flex flex-col items-center text-center">
          <Eyebrow>The operating layer</Eyebrow>
          <h2
            className="font-medium"
            style={{ color: TEXT, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.03em" }}
          >
            The missing layer between your
            <br />
            business systems and AI.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: TEXT_MUTE, maxWidth: "60ch" }}>
            Inovense OS sits in the middle: it gives AI operators structured access to your tools, memory of
            your business, the right to act inside policy, and a queue when humans need to weigh in. Models
            don&apos;t run in chat windows. They run as operators.
          </p>
        </div>
      </Reveal>

      <Reveal delayMs={80}>
        <OperatingLayerDiagram />
      </Reveal>

      <div className="mt-7 grid gap-3.5 min-[901px]:grid-cols-3">
        {ROW.map((c, i) => (
          <Reveal key={c.num} delayMs={i * 70}>
            <div
              className="h-full rounded-2xl p-5"
              style={{ background: "linear-gradient(180deg, #0D1015, #08090D)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.10em]" style={{ color: TEXT_FAINT }}>
                {c.num}
              </span>
              <h4 className="mt-2.5 mb-1.5 text-[15px] font-medium" style={{ color: TEXT, letterSpacing: "-0.01em" }}>
                {c.title}
              </h4>
              <p className="text-[13.5px] leading-[1.55]" style={{ color: TEXT_MUTE }}>
                {c.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
