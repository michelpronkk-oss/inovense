# Inovense — Current State

Last updated: 2026-04-16

---

## Positioning direction (accepted)

Model: simple entry, sharp depth.

- Top layer: service-legible. Websites, AI automation, SEO. Cold visitor understands within 5 seconds.
- Mid layer: differentiation. No templates, direct builders, scoped outcomes.
- Deep layer: trust, process, proof. Why section, process steps, case work.

Rejected direction: leading with "digital infrastructure", "operators", or "commercial infrastructure" at hero positions.

---

## Homepage (EN) — current accepted state

- H1: "Web, systems, and growth built to perform."
- Sub: "We build websites that convert, AI systems that save time, and growth programs that compound. For businesses that want results, not reports."
- Trust strip: `Custom-built, not templated · 24h response · No pitch decks`
- Services subtext: "Build covers websites, landing pages, and e-commerce. Systems covers AI automation and internal tooling. Growth covers SEO, content, and paid media."
- Systems card tagline: "AI automation and internal tools that save time and scale."
- Growth card tagline: "SEO, content, and paid media built to compound."
- Footer brand line: "Websites, systems, and growth programs for businesses that compete online."
- Trust section eyebrow: "Verified client reviews" (was "Trusted signal")
- Clarity Layer eyebrow: "Service clarity" (was "Inovense clarity layer")
- Clarity Layer right col: "Clear lane definitions, fit signals, and proof. So you know what to expect before we talk."
- FAQ answers: shortened to 1-2 sentences each.

---

## Homepage (NL) — current accepted state

- H1: "Websites, webshops en systemen die echt presteren."
- Sub: "Wij bouwen websites die converteren, AI-systemen die tijd besparen en groeiprogramma's die doorwerken. Voor bedrijven die resultaten willen, geen rapporten."
- Trust strip: `Op maat gebouwd · Reactie binnen 24 uur · Geen pitch decks`
- Footer brand line: "Websites, systemen en groeiprogramma's voor bedrijven die online willen groeien."
- Why H2: "Gebouwd voor bedrijven die online willen groeien." (was "operators die op uitvoering concurreren")

---

## Lane pages (EN)

**Build**
- H1: "Websites and products engineered to perform."
- Sub: "We design and build conversion-focused websites, landing pages, Shopify stores, and full-stack digital products. No templates. No shortcuts."
- "E-commerce experiences" replaced with "Shopify stores and e-commerce builds" for specificity.

**Systems**
- H1: "AI automation and workflows, built to scale." (was "Internal leverage, built to last")
- Sub: "We build AI workflows, automations, and internal tools that cut manual work, reduce errors, and help your team do more with less."

**Growth**
- H1: "SEO, content, and paid media, built to compound." (was "Growth infrastructure, built to compound")
- Sub: "We build SEO programs, content systems, and paid media setups that bring in more qualified leads over time. Not random activity. Structured programs with measurable outcomes."

---

## Lane pages (NL)

- Build H1: "Websites en producten gebouwd om te presteren." (unchanged, strong)
- Systems H1: "AI-automatisering en workflows, gebouwd om te schalen." (was "Interne hefboom, gebouwd om te blijven")
- Growth H1: "SEO, content en betaalde kanalen, gebouwd om door te werken." (was "Groei-infrastructuur, gebouwd om te stapelen")

---

## Mobile hero (all pages)

- H1 changed from `text-5xl lg:text-6xl` to `text-4xl sm:text-5xl lg:text-6xl`
- Line-height tightened from `1.08` to `1.1`
- Subheadline changed from `text-lg` to `text-base sm:text-lg`
- Applied to: EN hero, EN build/systems/growth heroes, NL hero, NL build/systems/growth heroes

---

## Clarity Layer (geo-answers.tsx)

- Section eyebrow: "Service clarity"
- Right col intro: shortened to one sentence
- Lane card focus and signal lines: shortened and made more direct
- FAQ answers in geo.ts: shortened to 1-2 sentences each
- Proof surface notes: reduced to 5-8 words each
- Sub-headers: "Questions answered" and "Proof and work"

---

## Admin / CRM

- Lead detail page: SectionGroup labels (Commercial / Delivery / Notes), flat Status card, merged Client panel
- Reminder snooze: JSONB column `reminder_snooze`, server action, `· 3d · 7d` inline buttons
- Reminder urgency: `due / overdue / stalled` tiers (0 / 1-7 / 8+ days)
- Overview page: two-zone attention section (Act on first + breakdown), live header stats

---

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase, Resend, Vercel.
