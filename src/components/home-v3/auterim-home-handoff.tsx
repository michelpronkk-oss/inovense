import Link from "next/link";
import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { appHref } from "@/lib/urls";
import OperatorsEditorial from "./operators-editorial";

const line = "rgba(255,255,255,0.07)";
const text = "#ECEFF3";
const dim = "#A4ABB4";
const mute = "#747C86";
const cyan = "#4DE8E1";

function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g fill={cyan}>
        <rect x="10" y="10" width="44" height="9" />
        <rect x="26" y="19" width="12" height="12" />
        <rect x="26" y="33" width="12" height="12" />
        <rect x="10" y="45" width="44" height="9" />
      </g>
    </svg>
  );
}

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function Button({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-transform duration-150 hover:-translate-y-px"
      style={
        secondary
          ? { color: text, background: "rgba(255,255,255,0.035)", boxShadow: `inset 0 0 0 1px ${line}` }
          : { color: "#04130F", background: cyan, boxShadow: "0 8px 26px -12px rgba(77,232,225,.7)" }
      }
    >
      {children}
    </Link>
  );
}

function SectionHeading({ label, title, body, centered = false }: { label: string; title: string; body?: string; centered?: boolean }) {
  return (
    <div className={`mb-10 flex flex-col gap-5 ${centered ? "items-center text-center" : "md:grid md:grid-cols-[minmax(130px,.35fr)_1fr] md:gap-10"}`}>
      <Eyebrow>{label}</Eyebrow>
      <div>
        <h2 className="font-medium" style={{ color: text, fontSize: "clamp(29px, 4vw, 54px)", lineHeight: 1.06, letterSpacing: "-0.04em", maxWidth: centered ? "18ch" : "20ch" }}>
          {title}
        </h2>
        {body && <p className="mt-5 text-base leading-[1.6]" style={{ color: dim, maxWidth: "58ch" }}>{body}</p>}
      </div>
    </div>
  );
}

const steps = [
  ["01", "Understand", "Your website, goals, tools, team and approval owner become one structured operating profile."],
  ["02", "Recommend", "Auterim names the operators with the clearest path to value, and explains exactly why each one fits."],
  ["03", "Execute", "Operators prepare work in your real systems, stop at every gate you set, and log what happened."],
];

/* Operator rows are rendered by the exact V3 editorial implementation. */
const unusedOperators = [
  ["Revenue Operator", "Sales · Pipeline", "Makes sure no lead, deal or follow-up slips through. Prepares follow-ups, CRM notes and deal updates from real pipeline signals.", "Best first operator"],
  ["Client Flow Operator", "Intake · Onboarding", "Keeps client communication, onboarding and delivery tight. Builds intake summaries, checklists and handoff notes as work arrives.", "Ready to deploy"],
  ["Operations Operator", "Reports · Internal", "Surfaces blockers, pending approvals and drift before they become delays, giving the company daily oversight.", "Suggested"],
  ["Marketing Operator", "Content · Campaigns", "Prepares angles, copy, briefs and schedules from your own positioning, with publishing and spend behind a gate.", "Suggested"],
];

void unusedOperators;

const faqs = [
  ["What is an operator?", "A role with a defined scope, its own instructions and memory, the connectors its work requires, and a fixed approval boundary. It detects work, prepares it, waits at the gate, executes what you approve and logs the result."],
  ["How does Auterim know which operators I need?", "From your operating profile: website, industry, size, goals, tools and team structure. It looks for work that is delayed, missed or repeated by hand, and states the reason behind every recommendation."],
  ["Do I have to build workflows?", "No. Operators arrive with their role and workflows already defined, adapted to your profile. You adjust boundaries rather than designing anything from scratch."],
  ["Can an operator act without approval?", "Only where you have allowed it, such as reading messages or preparing drafts. Everything on the approval list waits for the named owner, and blocked actions never run."],
  ["Can I explore without connecting real data?", "Yes. Preview builds a profile from public information and shows recommendations and demo runs without touching a single system."],
];

export default function AuterimHomeHandoff() {
  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <section id="top" className="relative px-5 pb-20 pt-32 text-center sm:px-8 sm:pb-28 sm:pt-44">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[min(900px,100vw)] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(77,232,225,.16),transparent_66%)] blur-3xl" aria-hidden />
        <div className="relative">
          <Reveal>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-[11px]" style={{ color: dim, background: "rgba(255,255,255,.025)", boxShadow: `inset 0 0 0 1px ${line}` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: cyan, boxShadow: `0 0 8px ${cyan}` }} />
              Approvals before anything leaves your company
            </div>
            <h1 className="mx-auto max-w-[17ch] font-medium" style={{ color: text, fontSize: "clamp(42px, 6vw, 78px)", lineHeight: 1.01, letterSpacing: "-0.05em" }}>
              The AI workforce built around how your company works.
            </h1>
            <p className="mx-auto mt-7 max-w-[58ch] text-lg leading-[1.6]" style={{ color: dim }}>
              Auterim learns your business, recommends the right operators, and lets them prepare and execute real work across your existing tools.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button href={appHref("/app/onboarding")}>Start preview <Arrow /></Button>
              <a href="#how" className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium" style={{ color: text, background: "rgba(255,255,255,.035)", boxShadow: `inset 0 0 0 1px ${line}` }}>See how it works</a>
            </div>
            <p className="mt-5 font-mono text-[11px]" style={{ color: mute }}>Begins with your website. Connect real tools when ready.</p>
          </Reveal>

          <Reveal delayMs={100} className="mx-auto mt-14 max-w-[700px]">
            <div className="overflow-hidden rounded-2xl text-left" style={{ background: "linear-gradient(180deg,#10151A,#080A0D)", boxShadow: `inset 0 0 0 1px ${line}, 0 30px 70px -40px rgba(77,232,225,.35)` }}>
              <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 font-mono text-[11px]" style={{ borderColor: line }}><span style={{ color: cyan }}>Revenue Operator</span><span style={{ color: mute }}>Run 0142 · 09:44</span><span className="ml-auto rounded-full px-2 py-1" style={{ color: "#F5C26B", background: "rgba(245,194,107,.1)" }}>Approval required</span></div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"><p className="text-sm" style={{ color: dim }}>First reply to Northstar is drafted, qualified and waiting to send.</p><div className="flex gap-2"><button type="button" className="rounded-lg px-3 py-2 text-xs font-medium" style={{ color: "#04130F", background: cyan }}>Approve and send</button><button type="button" className="rounded-lg px-3 py-2 text-xs" style={{ color: dim, background: "rgba(255,255,255,.04)" }}>Edit draft</button></div></div>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${cyan}, transparent)` }} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y px-5 py-8 sm:px-8" style={{ borderColor: line }}><p className="mb-5 text-center font-mono text-[11px] uppercase tracking-[.16em]" style={{ color: mute }}>Runs on the systems you already operate</p><div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm" style={{ color: dim }}>{["Gmail", "HubSpot", "Google Calendar", "Slack", "Notion", "Google Drive", "Stripe"].map((item) => <span key={item}>{item}</span>)}</div></section>

      <section id="how" className="border-b px-5 py-20 sm:px-8 md:py-28" style={{ borderColor: line }}><SectionHeading label="The loop" title="Understand the company first. Recommend second. Execute last." body="Most AI tools hand you an empty canvas and wait for instructions. Auterim starts with your business." /><div className="grid gap-3 md:grid-cols-3">{steps.map(([number, title, body]) => <Reveal key={number}><article className="h-full rounded-2xl p-5" style={{ background: "rgba(255,255,255,.025)", boxShadow: `inset 0 0 0 1px ${line}` }}><span className="font-mono text-xs" style={{ color: cyan }}>{number}</span><h3 className="mt-8 text-lg font-medium" style={{ color: text }}>{title}</h3><p className="mt-3 text-sm leading-[1.6]" style={{ color: mute }}>{body}</p><div className="mt-7 border-t pt-3 font-mono text-[10px] uppercase tracking-[.08em]" style={{ color: dim, borderColor: line }}>{title === "Understand" ? "Company profile" : title === "Recommend" ? "Recommended workforce" : "Runs and approvals"}</div></article></Reveal>)}</div></section>

      <section id="profile" className="border-b px-5 py-20 sm:px-8 md:py-28" style={{ borderColor: line }}><SectionHeading label="Company context" title="Auterim learns your business before it recommends anything." body="Your website, systems, processes, goals and approval structure become a reusable company profile every operator can work from." /><Reveal><div className="grid gap-2 rounded-2xl p-3 md:grid-cols-2" style={{ background: "rgba(255,255,255,.018)", boxShadow: `inset 0 0 0 1px ${line}` }}>{[["Company", "Atlas Studio · professional services · 12 people", "Confirmed"], ["Systems of record", "Gmail and HubSpot carry client communication and pipeline", "Confirmed"], ["Customer journey", "Enquiry · proposal · onboarding · recurring delivery", "Inferred from website"], ["Repeated work", "Onboarding information is collected by hand for every client", "Inferred from tools"], ["Where work waits", "Lead replies queue behind one person’s inbox", "Needs review"], ["Billing", "No billing system named. Left out of scope until you add one.", "Not provided"]].map(([key, value, status]) => <div key={key} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.025)" }}><div className="font-mono text-[10px] uppercase tracking-[.1em]" style={{ color: mute }}>{key}</div><div className="mt-2 text-sm" style={{ color: dim }}>{value}</div><div className="mt-3 text-[11px]" style={{ color: status === "Needs review" ? "#F5C26B" : cyan }}>{status}</div></div>)}</div></Reveal></section>

      <OperatorsEditorial />

      <section id="run" className="border-b px-5 py-20 sm:px-8 md:py-28" style={{ borderColor: line, background: "rgba(255,255,255,.012)" }}><SectionHeading label="One real run" title="One lead. One operator. One controlled run." body="Watch Auterim turn a real inbound signal into prepared work, and stop exactly where human approval is required." /><Reveal><div className="mx-auto max-w-3xl rounded-2xl p-4 sm:p-6" style={{ background: "#090C10", boxShadow: `inset 0 0 0 1px ${line}` }}>{[["01", "Input", "Website enquiry · Northstar · 09:41"], ["02", "Operator work", "Detected signal → qualified it → prepared first reply → updated CRM"], ["03", "Approval gate", "Send the first reply to Sarah at Northstar?"], ["04", "After approval", "Send via Gmail · create follow-up · log outcome"]].map(([number, label, value], index) => <div key={number} className="grid gap-2 border-b py-4 last:border-b-0 sm:grid-cols-[140px_1fr]" style={{ borderColor: line }}><div className="font-mono text-xs" style={{ color: index === 2 ? "#F5C26B" : cyan }}>{number} · {label}</div><div className="text-sm" style={{ color: index === 2 ? text : dim }}>{value}{index === 2 && <span className="ml-3 rounded-full px-2 py-1 font-mono text-[10px]" style={{ color: "#F5C26B", background: "rgba(245,194,107,.1)" }}>Needs approval</span>}</div></div>)}</div></Reveal></section>

      <section id="policy" className="border-b px-5 py-20 sm:px-8 md:py-28" style={{ borderColor: line }}><SectionHeading label="Boundaries" title="Autonomy, with boundaries you control." body="Every operator has a defined scope. Some actions can run automatically, some stop for approval, and some are blocked entirely." /><div className="grid gap-3 md:grid-cols-3">{[["Can act", ["Read inbound messages", "Search the CRM", "Prepare replies", "Add internal notes"], cyan], ["Needs approval", ["Send external messages", "Change deal stages", "Offer discounts", "Contact new domains"], "#F5C26B"], ["Never allowed", ["Delete CRM records", "Export customer databases", "Send bulk campaigns", "Change company policies"], "#F47B8D"]].map(([title, items, color]) => <div key={title as string} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,.025)", boxShadow: `inset 0 0 0 1px ${line}` }}><h3 className="text-sm font-medium" style={{ color: color as string }}>{title as string}</h3><ul className="mt-5 space-y-3 text-sm" style={{ color: dim }}>{(items as string[]).map((item) => <li key={item}>· {item}</li>)}</ul></div>)}</div></section>

      <section id="platform" className="border-b px-5 py-20 sm:px-8 md:py-28" style={{ borderColor: line }}><SectionHeading label="Architecture" title="Auterim is the operating layer between your business and AI." body="Your existing systems remain the source of truth. Auterim adds the context, permissions, memory and controls AI needs to work safely across them." /><Reveal><div className="grid items-center gap-3 rounded-2xl p-4 md:grid-cols-[1fr_180px_1fr] md:p-8" style={{ background: "linear-gradient(180deg,#0D1015,#080A0D)", boxShadow: `inset 0 0 0 1px ${line}` }}><div className="space-y-2"><p className="mb-4 font-mono text-[10px] uppercase tracking-[.12em]" style={{ color: mute }}>Your business · source of truth</p>{["CRM", "Inbox", "Calendar", "Documents", "Support", "Billing"].map((item) => <div key={item} className="rounded-lg px-3 py-2 text-sm" style={{ color: dim, background: "rgba(255,255,255,.035)" }}>{item}</div>)}</div><div className="flex flex-col items-center justify-center gap-3 rounded-xl px-3 py-8 text-center" style={{ color: cyan, background: "rgba(77,232,225,.07)", boxShadow: `inset 0 0 0 1px rgba(77,232,225,.28)` }}><Mark size={30} /><strong className="text-sm" style={{ color: text }}>Auterim</strong><span className="font-mono text-[10px]">Operating layer</span></div><div className="space-y-2"><p className="mb-4 font-mono text-[10px] uppercase tracking-[.12em]" style={{ color: mute }}>Intelligence · connected actions</p>{["AI models", "Search", "Background tasks", "APIs", "Connected actions"].map((item) => <div key={item} className="rounded-lg px-3 py-2 text-sm" style={{ color: dim, background: "rgba(255,255,255,.035)" }}>{item}</div>)}</div></div></Reveal></section>

      <section className="border-b px-5 py-20 sm:px-8 md:py-28" style={{ borderColor: line }}><SectionHeading label="Where it pays" title="Start with the work that keeps getting delayed." /><div className="grid gap-3 md:grid-cols-3">{[["Lead response", "The enquiry waits in an inbox for someone with time.", "Enriched, qualified and drafted in minutes. One click sends it."], ["Client onboarding", "Details are chased by hand across email, docs and calls.", "The onboarding plan is prepared and every next step is coordinated."], ["Weekly operations", "Updates are assembled by hand from several systems.", "A written brief with blockers and next actions, every week."]].map(([title, before, after]) => <article key={title} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,.025)", boxShadow: `inset 0 0 0 1px ${line}` }}><h3 className="text-base font-medium" style={{ color: text }}>{title}</h3><div className="mt-5 space-y-4 text-sm leading-[1.55]"><p style={{ color: mute }}><span className="mb-1 block font-mono text-[10px] uppercase" style={{ color: mute }}>Without Auterim</span>{before}</p><p style={{ color: dim }}><span className="mb-1 block font-mono text-[10px] uppercase" style={{ color: cyan }}>With Auterim</span>{after}</p></div></article>)}</div></section>

      <section id="pricing" className="border-b px-5 py-20 sm:px-8 md:py-28" style={{ borderColor: line }}><SectionHeading label="Getting started" title="Preview costs nothing and connects nothing." body="See your operating profile and recommended workforce first. Deploy against real systems only when you decide to. Pricing is announced at launch." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Preview", "Free to explore", "Operating profile from public information · Recommended operators · Demo runs and approval flows · No connectors"], ["Starter", "At launch", "Two active operators · Real connectors · Company memory · Approvals and activity log"], ["Growth", "At launch", "Six active operators · Advanced policies · Shared approvals · Deeper company context"], ["Enterprise", "Custom", "High operator limits · Custom policies and controls · Dedicated environments · Dedicated support"]].map(([title, amount, body], index) => <article key={title} className="rounded-2xl p-5" style={{ background: index === 0 ? "rgba(77,232,225,.07)" : "rgba(255,255,255,.025)", boxShadow: `inset 0 0 0 1px ${index === 0 ? "rgba(77,232,225,.28)" : line}` }}><h3 className="text-base font-medium" style={{ color: text }}>{title}</h3><p className="mt-2 font-mono text-[11px]" style={{ color: cyan }}>{amount}</p><p className="mt-5 text-sm leading-[1.6]" style={{ color: mute }}>{body}</p>{index === 0 && <div className="mt-5"><Button href={appHref("/app/onboarding")}>Start preview <Arrow /></Button></div>}</article>)}</div></section>

      <section className="border-b px-5 py-20 sm:px-8 md:py-28" style={{ borderColor: line }}><SectionHeading label="Questions" title="Answers, not positioning." centered /><div className="mx-auto max-w-3xl">{faqs.map(([question, answer]) => <details key={question} className="border-b py-5" style={{ borderColor: line }}><summary className="cursor-pointer list-none text-sm font-medium" style={{ color: text }}>{question}</summary><p className="mt-3 max-w-2xl text-sm leading-[1.6]" style={{ color: mute }}>{answer}</p></details>)}</div></section>

      <section className="relative overflow-hidden px-5 py-24 text-center sm:px-8 md:py-36"><div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-[min(800px,100vw)] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(77,232,225,.13),transparent_68%)] blur-3xl" aria-hidden /><div className="relative"><Eyebrow>Start with your company</Eyebrow><h2 className="mx-auto max-w-[18ch] font-medium" style={{ color: text, fontSize: "clamp(36px, 5vw, 68px)", lineHeight: 1.03, letterSpacing: "-0.045em" }}>See where AI can work before you connect anything.</h2><p className="mx-auto mt-6 max-w-[48ch] text-base leading-[1.6]" style={{ color: dim }}>Build your operating profile, read the recommendations, and deploy the first operator when you are ready.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button href={appHref("/app/onboarding")}>Start preview <Arrow /></Button><a href="#operators" className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium" style={{ color: text, background: "rgba(255,255,255,.035)", boxShadow: `inset 0 0 0 1px ${line}` }}>See the operators</a></div></div></section>
    </div>
  );
}
