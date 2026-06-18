const LINE = "rgba(255,255,255,0.055)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const CYAN = "#4DE8E1";

const TOOLS: { name: string; mark: React.ReactNode }[] = [
  {
    name: "Slack",
    mark: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="10" width="8" height="4" rx="2" fill="#36C5F0" />
        <rect x="13" y="10" width="8" height="4" rx="2" fill="#2EB67D" />
        <rect x="10" y="3" width="4" height="8" rx="2" fill="#ECB22E" />
        <rect x="10" y="13" width="4" height="8" rx="2" fill="#E01E5A" />
      </svg>
    ),
  },
  {
    name: "Notion",
    mark: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 4h10l4 4v12H5V4z" fill="#ECEFF3" fillOpacity="0.05" stroke="#ECEFF3" strokeWidth="1.4" />
        <path d="M8 9v8M8 9l8 8M16 9v8" stroke="#ECEFF3" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Stripe",
    mark: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect width="24" height="24" rx="4" fill="#635BFF" />
        <path d="M10 9c0-.6.5-.9 1.3-.9 1.1 0 2.5.3 3.6.9V6c-1.2-.5-2.4-.7-3.6-.7-3 0-4.9 1.5-4.9 4.1 0 4 5.4 3.4 5.4 5.1 0 .7-.6 1-1.5 1-1.3 0-2.9-.5-4.1-1.2v3.2c1.4.6 2.8.8 4.1.8 3 0 5.1-1.5 5.1-4.1.1-4.3-5.4-3.6-5.4-5.2z" fill="#fff" />
      </svg>
    ),
  },
  {
    name: "HubSpot",
    mark: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="10" r="3" stroke="#FF7A59" strokeWidth="1.6" />
        <circle cx="12" cy="18" r="2.5" stroke="#FF7A59" strokeWidth="1.6" />
        <path d="M12 13v2.5M18 4l-3 3.5M21 6h-3M21 6v3" stroke="#FF7A59" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Linear",
    mark: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect width="24" height="24" rx="5" fill="#5E6AD2" />
        <path d="M5 14l5 5M5 10l9 9M6 6l13 13M10 5l9 9M14 5l5 5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Gmail",
    mark: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="#EA4335" strokeWidth="1.5" />
        <path d="M4 8l8 6 8-6" stroke="#EA4335" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Salesforce",
    mark: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 16c-2 0-3.5-1.6-3.5-3.5 0-1.4.8-2.6 2-3.1 0-2.7 2.2-4.9 4.9-4.9 1.5 0 2.9.7 3.8 1.8.7-.6 1.7-1 2.7-1 2.3 0 4.1 1.8 4.1 4.1 0 .4-.1.8-.2 1.2.7.6 1.2 1.5 1.2 2.6 0 1.9-1.5 3.4-3.4 3.4H7z" fill="#00A1E0" />
      </svg>
    ),
  },
  {
    name: "Intercom",
    mark: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect width="24" height="24" rx="5" fill="#1F8DED" />
        <path d="M7 9v6M10 8v8M13 8v8M16 9v6M7 17.5c2 .8 4 1.5 5 1.5s3-.7 5-1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function IntegrationsBand() {
  return (
    <section className="border-y" style={{ borderColor: LINE }}>
      <div className="mx-auto max-w-[1240px] px-5 py-9 sm:px-6 lg:px-8">
        <p
          className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.16em]"
          style={{ color: TEXT_MUTE }}
        >
          Built to run on the stack you already operate
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-5">
          {TOOLS.map((t) => (
            <span key={t.name} className="inline-flex items-center gap-2.5" title={t.name}>
              {t.mark}
              <span className="text-[13px]" style={{ color: TEXT_DIM }}>
                {t.name}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-7 text-center font-mono text-[12px]" style={{ color: TEXT_MUTE }}>
          <span style={{ color: TEXT }}>80+</span> first-party connectors &middot;{" "}
          <span style={{ color: CYAN }}>custom SDK</span> in TypeScript &amp; Python
        </p>
      </div>
    </section>
  );
}

const STATS = [
  { val: "1.2M", lab: "operator actions per month" },
  { val: "94%", lab: "approval rate" },
  { val: "412h", lab: "saved per workspace / wk" },
  { val: "8.4k", lab: "audit events / day" },
];

export function StatsStrip() {
  return (
    <section className="border-y" style={{ borderColor: LINE }}>
      <div className="mx-auto grid max-w-[1240px] grid-cols-2 divide-x divide-y divide-white/[0.055] sm:grid-cols-4 sm:divide-y-0">
        {STATS.map((s) => (
          <div key={s.lab} className="flex flex-col gap-1.5 px-5 py-9 sm:px-6 lg:px-8">
            <div
              className="font-medium"
              style={{ color: TEXT, fontSize: "clamp(28px, 3vw, 38px)", letterSpacing: "-0.02em" }}
            >
              {s.val}
            </div>
            <div className="text-[12.5px]" style={{ color: TEXT_MUTE }}>
              {s.lab}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
