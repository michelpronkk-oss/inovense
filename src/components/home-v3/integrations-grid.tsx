import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { Icon } from "./icons";

const LINE = "rgba(255,255,255,0.055)";
const LINE_2 = "rgba(255,255,255,0.085)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const GREEN = "#51D88A";

export const LOGOS: Record<string, React.ReactNode> = {
  Trello: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#0079BF" />
      <rect x="4" y="4" width="6.5" height="12" rx="1.3" fill="#fff" />
      <rect x="13.5" y="4" width="6.5" height="8" rx="1.3" fill="#fff" />
    </svg>
  ),
  Salesforce: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 16c-2 0-3.5-1.6-3.5-3.5 0-1.4.8-2.6 2-3.1 0-2.7 2.2-4.9 4.9-4.9 1.5 0 2.9.7 3.8 1.8.7-.6 1.7-1 2.7-1 2.3 0 4.1 1.8 4.1 4.1 0 .4-.1.8-.2 1.2.7.6 1.2 1.5 1.2 2.6 0 1.9-1.5 3.4-3.4 3.4H7z" fill="#00A1E0" />
    </svg>
  ),
  HubSpot: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="10" r="3" stroke="#FF7A59" strokeWidth="1.6" />
      <circle cx="11" cy="18" r="2.5" stroke="#FF7A59" strokeWidth="1.6" />
      <path d="M11 13v2.5M18 4l-3 3.5M22 6h-3M22 6v3" stroke="#FF7A59" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Gmail: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="#EA4335" strokeWidth="1.5" />
      <path d="M4 8l8 6 8-6" stroke="#EA4335" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  ),
  Outlook: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="13" height="14" rx="2" fill="#0078D4" />
      <circle cx="9.5" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M17 9l4 3-4 3v-6z" fill="#0078D4" />
    </svg>
  ),
  Slack: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="10" width="8" height="4" rx="2" fill="#36C5F0" />
      <rect x="13" y="10" width="8" height="4" rx="2" fill="#2EB67D" />
      <rect x="10" y="3" width="4" height="8" rx="2" fill="#ECB22E" />
      <rect x="10" y="13" width="4" height="8" rx="2" fill="#E01E5A" />
    </svg>
  ),
  Notion: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" fill="rgba(236,239,243,0.04)" stroke="#ECEFF3" strokeWidth="1.3" />
      <path d="M9 8.5v8M9 8.5l6 8M15 8.5v8" stroke="#ECEFF3" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  ),
  Linear: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#5E6AD2" />
      <path d="M5 13l6 6M5 9l10 10M6 6l13 13M10 5l9 9M14 5l5 5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.95" />
    </svg>
  ),
  Stripe: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#635BFF" />
      <path d="M10 9c0-.6.5-.9 1.3-.9 1.1 0 2.5.3 3.6.9V6c-1.2-.5-2.4-.7-3.6-.7-3 0-4.9 1.5-4.9 4.1 0 4 5.4 3.4 5.4 5.1 0 .7-.6 1-1.5 1-1.3 0-2.9-.5-4.1-1.2v3.2c1.4.6 2.8.8 4.1.8 3 0 5.1-1.5 5.1-4.1.1-4.3-5.4-3.6-5.4-5.2z" fill="#fff" />
    </svg>
  ),
  Intercom: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#1F8DED" />
      <path d="M7 9v6M10 8v8M13 8v8M16 9v6M7 17.5c2 .9 4 1.5 5 1.5s3-.6 5-1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Drive: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 3h6l6 11h-6l-3 5H6L0 11" transform="translate(2 1)" fill="#FFBA00" />
      <path d="M2 12l5-9h6l-5 9z" fill="#0F9D58" />
      <path d="M11 12l-3 5h12l3-5z" fill="#1A73E8" />
    </svg>
  ),
  Postgres: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="2.4" stroke="#336791" strokeWidth="1.5" />
      <path d="M5 6v6c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4V6" stroke="#336791" strokeWidth="1.5" fill="none" />
      <path d="M5 12v6c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4v-6" stroke="#336791" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  Snowflake: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <g stroke="#29B5E8" strokeWidth="1.4" strokeLinecap="round">
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
        <circle cx="12" cy="12" r="2" fill="#29B5E8" />
      </g>
    </svg>
  ),
  Zapier: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.5" fill="#FF4A00" />
      <g stroke="#FF4A00" strokeWidth="2" strokeLinecap="round">
        <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.3 6.3l2.2 2.2M15.5 15.5l2.2 2.2M6.3 17.7l2.2-2.2M15.5 8.5l2.2-2.2" />
      </g>
    </svg>
  ),
  Calendar: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" fill="#4285F4" />
      <path d="M3 10h18" stroke="#fff" strokeWidth="1.2" opacity="0.5" />
      <text x="12" y="18" textAnchor="middle" fontFamily="Geist, sans-serif" fontSize="9" fontWeight="600" fill="#fff">
        31
      </text>
    </svg>
  ),
  "Custom API": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 6c-2 1.5-3 3.5-3 6s1 4.5 3 6M17 6c2 1.5 3 3.5 3 6s-1 4.5-3 6" stroke="#A78BFA" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M9 14l2-6 1.5 4 1.5-1.5" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
};

const TILES = [
  { name: "Salesforce", kind: "CRM", color: "#00A1E0" },
  { name: "HubSpot", kind: "CRM", color: "#FF7A59" },
  { name: "Gmail", kind: "Inbox", color: "#EA4335" },
  { name: "Outlook", kind: "Inbox", color: "#0078D4" },
  { name: "Slack", kind: "Comms", color: "#4A154B" },
  { name: "Notion", kind: "Docs", color: "#ECEFF3" },
  { name: "Linear", kind: "Work", color: "#5E6AD2" },
  { name: "Stripe", kind: "Payments", color: "#635BFF" },
  { name: "Intercom", kind: "Support", color: "#1F8DED" },
  { name: "Drive", kind: "Files", color: "#FFBA00" },
  { name: "Postgres", kind: "DB", color: "#336791" },
  { name: "Snowflake", kind: "Warehouse", color: "#29B5E8" },
  { name: "Zapier", kind: "Workflows", color: "#FF4A00" },
  { name: "Calendar", kind: "Calendar", color: "#4285F4" },
  { name: "Custom API", kind: "Internal", color: "#A78BFA" },
];

const FOOT = [
  { label: "Auth", val: "OAuth 2.0 · SCIM · Service accounts" },
  { label: "Sync", val: "Realtime, batched, on-demand" },
  { label: "Schema", val: "Mapped to your business graph" },
  { label: "SDK", val: "TypeScript & Python clients" },
];

export default function IntegrationsSection() {
  return (
    <section id="integrations" className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
      <Reveal>
        <div className="mb-12 flex flex-col items-center text-center">
          <Eyebrow>Integrations</Eyebrow>
          <h2
            className="font-medium"
            style={{ color: TEXT, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.03em" }}
          >
            Plug into the stack you
            <br />
            already operate on.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: TEXT_MUTE, maxWidth: "52ch" }}>
            Over 80 first-party connectors with OAuth, scoped permissions, sync windows and field-level
            mapping. Build internal ones in under 20 lines.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-2 gap-2.5 min-[641px]:grid-cols-3 min-[881px]:grid-cols-4">
          {TILES.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-3 rounded-xl p-3.5 transition-all duration-150 hover:-translate-y-px"
              style={{ background: "linear-gradient(180deg, #0E1218, #0A0D12)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
            >
              <div
                className="grid h-9 w-9 flex-none place-items-center rounded-[9px]"
                style={{ background: `${t.color}10`, boxShadow: `inset 0 0 0 1px ${t.color}28` }}
              >
                <span className="block h-[22px] w-[22px]">{LOGOS[t.name]}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium" style={{ color: TEXT }}>
                  {t.name}
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.05em]" style={{ color: TEXT_MUTE }}>
                  {t.kind}
                </div>
              </div>
              <span
                className="ml-auto h-2 w-2 flex-none rounded-full"
                style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }}
              />
            </div>
          ))}
          <div
            className="flex flex-col items-start justify-center gap-1 rounded-xl p-3.5"
            style={{ background: "linear-gradient(180deg, #0E1218, #0A0D12)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
          >
            <div className="text-[13.5px] font-medium" style={{ color: TEXT_DIM }}>
              + 65 more
            </div>
            <div className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.05em]" style={{ color: TEXT_MUTE }}>
              View directory <Icon name="arrow" size={10} />
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div
          className="mt-6 grid grid-cols-2 gap-3 rounded-2xl p-5 min-[881px]:grid-cols-4"
          style={{ background: "linear-gradient(180deg, rgba(77,232,225,0.04), transparent)", boxShadow: `inset 0 0 0 1px ${LINE_2}` }}
        >
          {FOOT.map((f) => (
            <div key={f.label}>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.10em]" style={{ color: TEXT_MUTE }}>
                {f.label}
              </span>
              <div className="mt-1.5 text-[13px]" style={{ color: TEXT }}>
                {f.val}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
