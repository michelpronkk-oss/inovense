import Link from "next/link";

const platformLinks = [
  { label: "Overview", href: "/" },
  { label: "AI Agents", href: "/agents" },
  { label: "Workflows", href: "/workflows" },
  { label: "Memory & context", href: "/memory" },
  { label: "Approvals", href: "/approvals" },
  { label: "Integrations", href: "/integrations" },
  { label: "Security", href: "/security" },
];

const solutionLinks = [
  { label: "Revenue teams", href: "/solutions/revenue-teams" },
  { label: "Marketing", href: "/solutions/marketing" },
  { label: "Client services", href: "/solutions/client-services" },
  { label: "Operations", href: "/solutions/operations" },
  { label: "Founders & ops", href: "/solutions/founders-ops" },
];

const resourceLinks = [
  { label: "Documentation", href: "/docs" },
  { label: "API reference", href: "/api-reference" },
  { label: "Changelog", href: "/changelog" },
  { label: "Status", href: "/status" },
  { label: "System architecture", href: "/architecture" },
  { label: "Trust center", href: "/trust" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Customers", href: "/customers" },
  { label: "Press", href: "/press" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Security", href: "/security" },
  { label: "Cookies", href: "/cookies" },
];

function FooterCol({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-700">
        {heading}
      </p>
      <ul className="space-y-3.5">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-100"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-zinc-950/95">

      {/* Centered gradient top rule */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      >
        <div
          className="h-px w-[40%]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(73,160,164,0.25) 50%, transparent 100%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-[1360px] px-6 pt-20 pb-12">

        {/* Main grid */}
        <div className="grid grid-cols-2 gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] md:gap-8">

          {/* Brand column — spans full width on mobile */}
          <div className="col-span-2 flex flex-col items-start md:col-span-1">
            <Link href="/" className="mb-5 inline-flex items-center gap-2.5 self-start transition-opacity hover:opacity-75" aria-label="Inovense">
              <svg width="18" height="18" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <g fill="#ECEFF3">
                  <rect x="10" y="10" width="44" height="9"/>
                  <rect x="26" y="19" width="12" height="12"/>
                  <rect x="26" y="33" width="12" height="12"/>
                  <rect x="10" y="45" width="44" height="9"/>
                </g>
              </svg>
              <span className="text-[13px] font-semibold tracking-[0.16em] text-zinc-200">INOVENSE</span>
            </Link>

            <p className="max-w-[220px] text-sm leading-relaxed text-zinc-500">
              The AI operating layer for modern businesses. Built for serious operators.
            </p>

            {/* Status indicator */}
            <Link
              href="/status"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 transition-colors hover:border-zinc-600"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="font-mono text-[11px] text-zinc-500">All systems operational</span>
              <span className="font-mono text-[11px] text-zinc-700">v1.18.2</span>
            </Link>
          </div>

          <FooterCol heading="Platform" links={platformLinks} />
          <FooterCol heading="Solutions" links={solutionLinks} />
          <FooterCol heading="Resources" links={resourceLinks} />
          <FooterCol heading="Company" links={companyLinks} />

        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-white/[0.05] pt-7 sm:flex-row sm:items-center">
          <p className="text-xs text-zinc-700">
            &copy; 2026 Inovense, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {legalLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-xs text-zinc-700 transition-colors hover:text-zinc-400"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
