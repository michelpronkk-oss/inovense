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
const AMBER = "#F5C26B";
const AMBER_SOFT = "rgba(245,194,107,0.10)";

const STATS = [
  { k: "Allow-listed actions", v: "162" },
  { k: "Approval rate", v: "94%" },
  { k: "Avg. review time", v: "4m 12s" },
  { k: "Audit events / day", v: "8.4k" },
];

const CHECKS: { ok: boolean; text: string; tail?: string }[] = [
  { ok: true, text: "Recipient inside allow-list", tail: "domain: northwind.com" },
  { ok: true, text: "No PII outside whitelisted fields" },
  { ok: true, text: "Spend per send under $0.40 limit" },
  { ok: false, text: "First contact in 14 days", tail: "requires approval" },
];

function ApprovalsVisual() {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: "linear-gradient(180deg, #0C0F14, #07090C)", boxShadow: `inset 0 0 0 1px ${LINE}, 0 30px 60px -30px rgba(0,0,0,0.6)` }}
    >
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-2">
          <Icon name="inbox" size={13} style={{ color: CYAN }} />
          <strong className="text-[13px] font-medium" style={{ color: TEXT }}>
            Approval · preview
          </strong>
          <span
            className="rounded-full px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.06em]"
            style={{ background: AMBER_SOFT, color: AMBER, boxShadow: "inset 0 0 0 1px rgba(245,194,107,0.30)" }}
          >
            Awaiting review
          </span>
        </div>
        <span className="font-mono text-[11px]" style={{ color: TEXT_MUTE }}>
          Revenue Operator → jordan@atlas.co
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.10em]" style={{ color: TEXT_FAINT }}>
            Proposed action
          </div>
          <div
            className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[13px]"
            style={{ background: CYAN_SOFT, boxShadow: `inset 0 0 0 1px ${CYAN_LINE}`, color: TEXT_DIM }}
          >
            <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
            <span>
              Send personalized reply to <strong style={{ color: TEXT }}>Aiko Tanaka · Northwind Co.</strong>
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.10em]" style={{ color: TEXT_FAINT }}>
            Draft
          </div>
          <div
            className="flex flex-col gap-2 rounded-[9px] p-3.5 text-[13px] leading-[1.55]"
            style={{ background: "rgba(255,255,255,0.02)", boxShadow: `inset 0 0 0 1px ${LINE}`, color: TEXT_DIM }}
          >
            <p className="m-0">Hi Aiko —</p>
            <p className="m-0">
              Thanks for the intro. Based on our previous work with{" "}
              <span className="rounded-[3px] px-1 font-medium" style={{ background: CYAN_SOFT, color: CYAN }}>
                Acme Industries
              </span>{" "}
              (similar Series B operating shape), I&apos;d recommend kicking off with a 30-min discovery and a
              tailored ops audit.
            </p>
            <p className="m-0">
              Could{" "}
              <strong className="rounded-[3px] px-1" style={{ background: CYAN_SOFT, color: CYAN }}>
                Tuesday 2pm PT
              </strong>{" "}
              work? Happy to share two case studies ahead of time.
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.10em]" style={{ color: TEXT_FAINT }}>
            Policy checks
          </div>
          <ul className="flex flex-col gap-1.5">
            {CHECKS.map((c) => (
              <li key={c.text} className="flex items-center gap-2.5 font-mono text-[12.5px]" style={{ color: TEXT_DIM }}>
                <span
                  className="h-1.5 w-1.5 flex-none rounded-full"
                  style={{ background: c.ok ? CYAN : AMBER, boxShadow: `0 0 6px ${c.ok ? CYAN : AMBER}` }}
                />
                {c.text}
                {c.tail && <span style={{ color: TEXT_MUTE }}>{c.tail}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t pt-3" style={{ borderColor: LINE }}>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ background: CYAN, color: "#04130F", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px -4px rgba(77,232,225,0.55)" }}
          >
            Approve &amp; send
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ background: "rgba(255,255,255,0.04)", color: TEXT_DIM, boxShadow: `inset 0 0 0 1px ${LINE}` }}
          >
            Edit draft
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ background: "rgba(255,255,255,0.04)", color: TEXT_DIM, boxShadow: `inset 0 0 0 1px ${LINE}` }}
          >
            Skip
          </button>
          <span className="ml-auto hidden font-mono text-[10.5px] sm:inline" style={{ color: TEXT_MUTE }}>
            ⌘+↵ to approve
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalsSection() {
  return (
    <section id="approvals" className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="grid items-center gap-10 min-[1001px]:grid-cols-[1fr_1.1fr] min-[1001px]:gap-14">
        <Reveal>
          <div>
            <Eyebrow>Boundaries &amp; approvals</Eyebrow>
            <h2
              className="font-medium"
              style={{ color: TEXT, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.03em" }}
            >
              Give AI the keys you
              <br />
              actually want to give.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: TEXT_MUTE, maxWidth: "48ch" }}>
              Inovense OS makes &ldquo;what AI can do&rdquo; explicit. Define allow-lists, dollar limits,
              approval gates and tool scopes, then watch operators stay inside them. Anything risky lands in
              your inbox.
            </p>

            <div className="mt-8 grid max-w-[480px] grid-cols-2 gap-3.5">
              {STATS.map((s) => (
                <div
                  key={s.k}
                  className="rounded-xl p-4"
                  style={{ background: "linear-gradient(180deg, #0D1015, #08090D)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
                >
                  <div className="text-[24px] font-medium" style={{ color: TEXT, letterSpacing: "-0.02em" }}>
                    {s.v}
                  </div>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.05em]" style={{ color: TEXT_MUTE }}>
                    {s.k}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <ApprovalsVisual />
        </Reveal>
      </div>
    </section>
  );
}
