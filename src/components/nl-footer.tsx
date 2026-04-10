import Link from "next/link";
import Image from "next/image";

const serviceLinks = [
  { label: "Bouwen", href: "/nl/build" },
  { label: "Systemen", href: "/nl/systems" },
  { label: "Groei", href: "/nl/growth" },
];

const companyLinks = [
  { label: "Project starten", href: "/nl/intake" },
  { label: "Proces", href: "/nl/process" },
  { label: "Privacybeleid", href: "/privacy-policy" },
  { label: "Gebruiksvoorwaarden", href: "/terms-of-use" },
];

export default function NlFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-zinc-950">

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

      <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_auto_auto]">

          {/* Brand column */}
          <div className="flex flex-col items-start">
            <Link href="/nl" className="mb-5 self-start transition-opacity hover:opacity-75">
              <Image
                src="/logo.png"
                alt="Inovense"
                width={110}
                height={26}
                className="block h-[26px] w-auto"
              />
            </Link>
            <p className="max-w-[240px] text-sm leading-relaxed text-zinc-500">
              Digitale infrastructuur voor operators die op kwaliteit concurreren.
            </p>
            <a
              href="mailto:hello@inovense.com"
              className="mt-5 text-sm text-zinc-600 transition-colors hover:text-zinc-300"
            >
              hello@inovense.com
            </a>
          </div>

          {/* Services */}
          <div>
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-700">
              Lanes
            </p>
            <ul className="space-y-3.5">
              {serviceLinks.map(({ label, href }) => (
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

          {/* Company */}
          <div>
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-700">
              Bedrijf
            </p>
            <ul className="space-y-3.5">
              {companyLinks.map(({ label, href }) => (
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

        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/[0.05] pt-7 sm:flex-row sm:items-center">
          <p className="text-xs text-zinc-700">
            &copy; 2026 Inovense. Alle rechten voorbehouden.
          </p>
        </div>

      </div>
    </footer>
  );
}
