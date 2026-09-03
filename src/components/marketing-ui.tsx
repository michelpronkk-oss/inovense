import Link from "next/link";

// ──────────────────────────────────────────────
// PageHero — centered hero with responsive mobile spacing
// ──────────────────────────────────────────────
export function PageHero({
  eyebrow,
  heading,
  description,
  mobileHeading,
  mobileDescription,
  maxWidth = "20ch",
  descMaxWidth = "52ch",
  children,
}: {
  eyebrow: string;
  heading: string;
  description: string;
  mobileHeading?: string;
  mobileDescription?: string;
  maxWidth?: string;
  descMaxWidth?: string;
  children?: React.ReactNode;
}) {
  return (
    <section data-marketing-hero className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-14 pt-24 text-center sm:px-6 sm:pb-20 sm:pt-32 md:pb-28 md:pt-40">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1
        className="mb-4 text-[2.25rem] font-semibold leading-[1.06] sm:mb-5 sm:text-5xl md:text-6xl"
        style={{ color: "#ECEFF3", letterSpacing: "-0.034em", maxWidth }}
      >
        <span className={mobileHeading ? "marketing-copy-desktop" : undefined}>{heading}</span>
        {mobileHeading && <span className="marketing-copy-mobile" aria-hidden="true">{mobileHeading}</span>}
      </h1>
      <p
        className="mb-7 text-base leading-relaxed sm:mb-10 sm:text-lg"
        style={{ color: "#A4ABB4", maxWidth: descMaxWidth }}
      >
        <span className={mobileDescription ? "marketing-copy-desktop" : undefined}>{description}</span>
        {mobileDescription && <span className="marketing-copy-mobile" aria-hidden="true">{mobileDescription}</span>}
      </p>
      {children && (
        <div className="flex w-full flex-col items-center gap-3 xs:flex-row xs:flex-wrap xs:justify-center sm:w-auto">
          {children}
        </div>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────
// PageShell — full-page background matching homepage
// ──────────────────────────────────────────────
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-marketing-shell
      className="relative min-h-screen overflow-hidden"
      style={{
        background: `
          radial-gradient(1100px 600px at 50% -120px, rgba(77,232,225,0.11), transparent 62%),
          radial-gradient(700px 400px at 88% 8%, rgba(91,141,239,0.045), transparent 60%),
          #06070A
        `,
      }}
    >
      {/* Subtle grid pattern fades toward bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 90% 40% at 50% 0%, #000 10%, transparent 65%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Eyebrow — glowing cyan dot + mono uppercase label
// ──────────────────────────────────────────────
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 inline-flex items-center gap-2">
      <span
        className="h-[5px] w-[5px] rounded-full"
        style={{ background: "#4DE8E1", boxShadow: "0 0 8px #4DE8E1" }}
        aria-hidden
      />
      <span
        className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
        style={{ color: "#4DE8E1" }}
      >
        {children}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────
// MktCard — dark gradient card matching homepage card style
// ──────────────────────────────────────────────
export function MktCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-6 transition-all duration-200 hover:-translate-y-px ${className}`}
      style={{
        background: "linear-gradient(180deg, #0D1015, #07090C)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.02), 0 24px 50px -38px rgba(77,232,225,0.35)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(77,232,225,0.38), transparent)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl"
        style={{ background: "rgba(77,232,225,0.14)" }}
      />
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// MktCardHover — card with stronger hover lift
// ──────────────────────────────────────────────
export function MktCardHover({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-6 transition-all duration-250 hover:-translate-y-0.5 ${className}`}
      style={{
        background: "linear-gradient(180deg, #0D1015, #07090C)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.02), 0 26px 55px -40px rgba(91,141,239,0.3)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(91,141,239,0.35), transparent)" }}
      />
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// SectionDivider — horizontal rule with centered cyan gradient
// ──────────────────────────────────────────────
export function SectionDivider() {
  return (
    <div className="pointer-events-none flex justify-center py-6 md:py-8">
      <div
        className="h-px w-[72%] md:w-[46%]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(77,232,225,0.18) 50%, transparent)",
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// PageCTA — bottom CTA strip
// ──────────────────────────────────────────────
export function PageCTA({
  heading,
  sub,
  primary,
  primaryHref,
  secondary,
  secondaryHref,
}: {
  heading: string;
  sub?: string;
  primary: string;
  primaryHref: string;
  secondary?: string;
  secondaryHref?: string;
}) {
  const primaryLabel = primary === "Get Starter" ? "Start preview" : primary;

  return (
    <section className="relative py-12 md:py-20">
      <SectionDivider />
      <div className="mx-auto max-w-4xl px-5 pt-10 text-center sm:px-6 md:pt-16">
        <h2
          className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ color: "#ECEFF3", letterSpacing: "-0.025em" }}
        >
          {heading}
        </h2>
        {sub && (
          <p className="mb-8 text-sm" style={{ color: "#6B7178" }}>
            {sub}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-150 hover:-translate-y-px"
            style={{
              background: "#4DE8E1",
              color: "#04130F",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(77,232,225,0.45), 0 8px 28px -8px rgba(77,232,225,0.5)",
            }}
          >
            {primaryLabel}
          </Link>
          {secondary && secondaryHref && (
            <Link
              href={secondaryHref}
              className="inline-flex rounded-xl px-6 py-3 text-sm font-medium transition-colors duration-150"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#ECEFF3",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              {secondary}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// StepRow — numbered horizontal step flow
// ──────────────────────────────────────────────
export function StepRow({
  steps,
}: {
  steps: { number: string; title: string; description: string }[];
}) {
  return (
    <div className="grid gap-10 md:grid-cols-3">
      {steps.map((step) => (
        <div key={step.number} className="flex flex-col gap-3">
          <span
            className="font-mono text-3xl font-light"
            style={{ color: "rgba(255,255,255,0.10)" }}
          >
            {step.number}
          </span>
          <h3
            className="text-base font-semibold"
            style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}
          >
            {step.title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "#6B7178" }}>
            {step.description}
          </p>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// PropList — 2-column property checklist
// ──────────────────────────────────────────────
export function PropList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-center gap-3 rounded-lg px-5 py-4"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)", background: "rgba(13,16,21,0.6)" }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "#4DE8E1" }}
          />
          <span className="text-sm font-medium" style={{ color: "#A4ABB4" }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MockupWindow({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; meta?: string; status?: "live" | "pending" | "ok" }>;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl p-0"
      style={{
        background: "linear-gradient(180deg, #0D1015, #07090C)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.06), 0 30px 70px -35px rgba(77,232,225,0.25)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-3.5"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "#ECEFF3", letterSpacing: "-0.01em" }}>
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.09em]" style={{ color: "#6B7178" }}>
              {subtitle}
            </p>
          )}
        </div>
        <span className="rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: "#4DE8E1", background: "rgba(77,232,225,0.1)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}>
          live
        </span>
      </div>

      <div className="p-4">
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3"
              style={{
                background: "rgba(255,255,255,0.02)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background:
                    row.status === "pending"
                      ? "#F5C26B"
                      : row.status === "ok"
                        ? "#51D88A"
                        : "#4DE8E1",
                  boxShadow:
                    row.status === "pending"
                      ? "0 0 8px rgba(245,194,107,0.8)"
                      : row.status === "ok"
                        ? "0 0 8px rgba(81,216,138,0.8)"
                        : "0 0 8px rgba(77,232,225,0.8)",
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "#ECEFF3" }}>
                  {row.label}
                </p>
                {row.meta && (
                  <p className="truncate font-mono text-[10.5px]" style={{ color: "#6B7178" }}>
                    {row.meta}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
