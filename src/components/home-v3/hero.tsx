import Link from "next/link";
import { appHref } from "@/lib/urls";
import { Icon } from "./icons";

const LINE = "rgba(255,255,255,0.055)";
const LINE_2 = "rgba(255,255,255,0.085)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const TEXT_FAINT = "#454A51";
const CYAN = "#4DE8E1";
const AMBER = "#F5C26B";
const GREEN = "#51D88A";

const AUDIT_ROWS = [
  { lvl: "ok", t: "14:02", a: "Revenue", m: "approval requested · awaiting review" },
  { lvl: "ok", t: "14:01", a: "Marketing", m: "published Q3 brief · 1,420w" },
  { lvl: "info", t: "13:58", a: "Client", m: "onboarding kit · Northwind" },
  { lvl: "warn", t: "13:54", a: "Revenue", m: "memory.miss · template fallback" },
] as const;

const LVL_STYLE: Record<string, { bg: string; color: string }> = {
  ok: { bg: "rgba(81,216,138,0.10)", color: GREEN },
  info: { bg: "rgba(77,232,225,0.08)", color: CYAN },
  warn: { bg: "rgba(245,194,107,0.10)", color: AMBER },
};

function LayeredStack() {
  return (
    <div
      className="relative ml-auto w-full max-w-[580px] min-h-[420px] sm:min-h-[460px] min-[881px]:min-h-[500px] p-4 sm:p-5 min-[721px]:p-8"
      style={{ perspective: "1600px", isolation: "isolate" }}
    >
      {/* background grid + glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 hidden min-[721px]:block"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 90%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(77,232,225,0.22), transparent 60%)" }}
      />
      {/* cyan beam */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 bottom-0 z-0 w-px -translate-x-1/2"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(77,232,225,0.35) 30%, rgba(77,232,225,0.35) 70%, transparent)",
        }}
      />

      {/* Back layer — audit log */}
      <div
        className="absolute left-1/2 z-[1] w-[88%] min-[721px]:w-[340px] min-[881px]:w-[360px] overflow-hidden rounded-2xl opacity-80"
        style={{
          top: 6,
          transform: "translateX(-58%) rotate(-3deg) scale(0.88)",
          background: "linear-gradient(180deg, rgba(15,18,24,0.94), rgba(8,11,14,0.92))",
          boxShadow: `inset 0 0 0 1px ${LINE_2}, 0 30px 70px -25px rgba(0,0,0,0.7)`,
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          className="flex items-center justify-between gap-2.5 border-b px-3.5 py-2 font-mono text-[10px] tracking-[0.06em]"
          style={{ borderColor: LINE, color: TEXT_MUTE }}
        >
          <span className="uppercase tracking-[0.10em]" style={{ color: TEXT_DIM }}>audit log</span>
          <span>policy + approvals</span>
        </div>
        <div className="flex flex-col gap-1 px-3.5 py-2 pb-3 font-mono text-[10.5px]">
          {AUDIT_ROWS.map((row, i) => (
            <div
              key={i}
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: "34px 34px 56px 1fr", color: TEXT_MUTE }}
            >
              <span style={{ color: TEXT_FAINT }}>{row.t}</span>
              <span
                className="rounded-[3px] px-1 text-center text-[9px] uppercase tracking-[0.06em]"
                style={LVL_STYLE[row.lvl]}
              >
                {row.lvl}
              </span>
              <span style={{ color: TEXT_DIM }}>[{row.a}]</span>
              <span className="truncate" style={{ color: TEXT_DIM }}>{row.m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Middle layer — memory graph */}
      <div
        className="absolute left-1/2 z-[2] w-[88%] min-[721px]:w-[340px] min-[881px]:w-[360px] overflow-hidden rounded-2xl opacity-95"
        style={{
          top: 76,
          transform: "translateX(-50%) scale(0.94)",
          background: "linear-gradient(180deg, rgba(15,18,24,0.94), rgba(8,11,14,0.92))",
          boxShadow: `inset 0 0 0 1px ${LINE_2}, 0 30px 70px -25px rgba(0,0,0,0.7)`,
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          className="flex items-center justify-between gap-2.5 border-b px-3.5 py-2 font-mono text-[10px] tracking-[0.06em]"
          style={{ borderColor: LINE, color: TEXT_MUTE }}
        >
          <span className="uppercase tracking-[0.10em]" style={{ color: TEXT_DIM }}>memory · indexed</span>
          <span>14,392 entities</span>
        </div>
        <div className="relative grid h-[100px] min-[721px]:h-[140px] place-items-center px-3.5 py-5">
          <svg className="pointer-events-none absolute inset-4" viewBox="0 0 100 60" preserveAspectRatio="none">
            <g stroke="rgba(77,232,225,0.35)" strokeWidth="0.4" fill="none">
              <line x1="50" y1="30" x2="14" y2="14" />
              <line x1="50" y1="30" x2="86" y2="14" />
              <line x1="50" y1="30" x2="14" y2="46" />
              <line x1="50" y1="30" x2="86" y2="46" />
            </g>
          </svg>
          <div
            className="relative z-[2] grid h-9 w-9 place-items-center rounded-[9px]"
            style={{ background: "rgba(77,232,225,0.08)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.40), 0 0 30px -5px rgba(77,232,225,0.40)" }}
          >
            <svg width="14" height="14" viewBox="0 0 32 32" fill={CYAN}>
              <rect x="5" y="5" width="22" height="4.5" />
              <rect x="13" y="9.5" width="6" height="6" />
              <rect x="13" y="16.5" width="6" height="6" />
              <rect x="5" y="22.5" width="22" height="4.5" />
            </svg>
          </div>
          {[
            { pos: { top: "16%", left: "6%" }, label: "Northwind Co." },
            { pos: { top: "16%", right: "6%" }, label: "$184k opp" },
            { pos: { bottom: "16%", left: "6%" }, label: "MSA-v4.pdf" },
            { pos: { bottom: "16%", right: "6%" }, label: "Aiko Tanaka" },
          ].map((n) => (
            <span
              key={n.label}
              className="absolute z-[2] rounded-md px-2 py-1 font-mono text-[9px] min-[721px]:text-[9.5px] tracking-[0.02em]"
              style={{ ...n.pos, background: "rgba(13,16,21,0.92)", boxShadow: `inset 0 0 0 1px ${LINE}`, color: TEXT_DIM }}
            >
              {n.label}
            </span>
          ))}
        </div>
      </div>

      {/* Front layer — workflow preview / approval */}
      <div
        className="absolute left-1/2 z-[3] w-[88%] min-[721px]:w-[340px] min-[881px]:w-[360px] overflow-hidden rounded-2xl"
        style={{
          top: 146,
          transform: "translateX(-42%) rotate(2.5deg)",
          background: "linear-gradient(180deg, rgba(15,18,24,0.94), rgba(8,11,14,0.92))",
          boxShadow:
            "inset 0 0 0 1px rgba(77,232,225,0.32), 0 40px 80px -25px rgba(0,0,0,0.8), 0 0 100px -25px rgba(77,232,225,0.30)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          className="flex items-center justify-between gap-2.5 border-b px-3.5 py-2 font-mono text-[10px] tracking-[0.06em]"
          style={{ borderColor: LINE, color: TEXT_MUTE }}
        >
          <span className="inline-flex items-center gap-1.5 uppercase tracking-[0.10em]" style={{ color: CYAN }}>
            <span className="h-[5px] w-[5px] animate-pulse-dot rounded-full" style={{ background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
            workflow preview
          </span>
          <span>awaiting approval</span>
        </div>
        <div className="flex flex-col gap-3 p-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-7 w-7 flex-none place-items-center rounded-lg font-mono text-[11px] font-semibold"
              style={{ background: "linear-gradient(135deg, rgba(77,232,225,0.22), rgba(77,232,225,0.06))", color: CYAN, boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.40)" }}
            >
              RV
            </span>
            <div>
              <div className="text-[13px] font-medium" style={{ color: TEXT }}>Revenue Operator</div>
              <div className="font-mono text-[10.5px]" style={{ color: TEXT_MUTE }}>drafting reply · Aiko Tanaka</div>
            </div>
            <span
              className="ml-auto rounded-full px-2 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.08em]"
              style={{ background: "rgba(245,194,107,0.10)", color: AMBER, boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.30)" }}
            >
              awaiting
            </span>
          </div>
          <div
            className="rounded-lg p-2.5 text-[12px] leading-[1.5]"
            style={{ background: "rgba(255,255,255,0.025)", boxShadow: `inset 0 0 0 1px ${LINE}`, color: TEXT_DIM }}
          >
            &ldquo;Hi Aiko — thanks for the intro. Based on our prior work with{" "}
            <span className="rounded-[3px] px-1" style={{ color: CYAN, background: "rgba(77,232,225,0.08)" }}>Acme Industries</span>{" "}
            (similar Series B), I&apos;d recommend a 30-min discovery.{" "}
            <span className="rounded-[3px] px-1" style={{ color: CYAN, background: "rgba(77,232,225,0.08)" }}>Tuesday 2pm PT</span> work?&rdquo;
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
              style={{ background: CYAN, color: "#04130F", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px -4px rgba(77,232,225,0.55)" }}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
              style={{ background: "rgba(255,255,255,0.04)", color: TEXT_DIM, boxShadow: `inset 0 0 0 1px ${LINE}` }}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
              style={{ background: "rgba(255,255,255,0.04)", color: TEXT_DIM, boxShadow: `inset 0 0 0 1px ${LINE}` }}
            >
              Skip
            </button>
            <span
              className="ml-auto hidden min-[721px]:inline rounded px-1.5 py-1 font-mono text-[9.5px]"
              style={{ background: "rgba(255,255,255,0.04)", boxShadow: `inset 0 0 0 1px ${LINE}`, color: TEXT_MUTE }}
            >
              ⌘ ↵
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-5 pb-16 pt-28 sm:px-6 sm:pt-32 min-[881px]:pt-40 min-[881px]:pb-20 lg:px-8">
      {/* background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 60% at 60% 50%, #000 30%, transparent 95%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 50% 35% at 50% 100%, rgba(8,10,14,0.65), transparent 60%)" }}
      />

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 min-[881px]:grid-cols-2 min-[881px]:gap-14">
        {/* Left: content */}
        <div className="flex min-w-0 max-w-[560px] flex-col items-center text-center min-[881px]:items-start min-[881px]:text-left">
          <a
            href="#changelog"
            className="mb-7 inline-flex max-w-full items-center gap-2.5 overflow-hidden rounded-full py-[5px] pl-[5px] pr-3 text-[12.5px] transition-all duration-150 hover:-translate-y-px"
            style={{ background: "rgba(13,16,21,0.72)", boxShadow: `inset 0 0 0 1px ${LINE}`, color: TEXT_DIM, backdropFilter: "blur(10px)" }}
          >
            <span
              className="inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-[2.5px] font-mono text-[9.5px] uppercase tracking-[0.08em]"
              style={{ background: "rgba(77,232,225,0.10)", color: CYAN, boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.28)" }}
            >
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full" style={{ background: CYAN, boxShadow: `0 0 8px ${CYAN}` }} />
              New
            </span>
            <span className="truncate" style={{ color: TEXT_DIM }}>Workflow approvals 2.0</span>
            <Icon name="arrow" size={11} style={{ color: TEXT_MUTE }} />
          </a>

          <h1
            className="mb-6 font-medium text-pretty"
            style={{
              color: TEXT,
              fontSize: "clamp(40px, 6vw, 88px)",
              lineHeight: 0.98,
              letterSpacing: "-0.04em",
              maxWidth: "16ch",
            }}
          >
            AI operators that execute real business work<span style={{ color: CYAN }}>.</span>
          </h1>

          <p
            className="mb-8 text-base leading-[1.55] sm:text-[17px]"
            style={{ color: TEXT_DIM, maxWidth: "520px" }}
          >
            Connect your tools, set approvals and let operators prepare, route and execute work safely.
          </p>

          <div className="mb-4 flex w-full flex-col gap-2.5 min-[881px]:w-auto min-[481px]:flex-row">
            <Link
              href={appHref("/app/onboarding")}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] px-[18px] py-3 text-[14.5px] font-medium transition-all duration-150 hover:-translate-y-px"
              style={{
                background: CYAN,
                color: "#04130F",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 28px -8px rgba(77,232,225,0.55)",
              }}
            >
              Start preview
              <Icon name="arrow" size={13} />
            </Link>
            <a
              href="#platform"
              className="inline-flex items-center justify-center gap-2 rounded-[10px] px-[18px] py-3 text-[14.5px] font-medium transition-colors duration-150"
              style={{ background: "rgba(255,255,255,0.025)", color: TEXT, boxShadow: `inset 0 0 0 1px ${LINE_2}` }}
            >
              View platform
            </a>
          </div>

          <p className="font-mono text-[12px] leading-[1.5] tracking-[0.01em]" style={{ color: TEXT_MUTE }}>
            Preview the workspace. Connect real tools when ready.
          </p>
        </div>

        {/* Right: layered stack visual */}
        <div className="min-w-0">
          <LayeredStack />
        </div>
      </div>
    </section>
  );
}
