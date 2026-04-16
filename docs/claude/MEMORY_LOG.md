# Inovense — Memory Log

Chronological log of meaningful decisions and changes. Not every edit, only things worth remembering.

---

## 2026-04-16

**Positioning model finalized**
Adopted "simple entry, sharp depth" as the operative positioning model.
Top layer must be commercially legible to cold traffic. Differentiation layers underneath.
Rejected: leading with "digital infrastructure", "operators who compete on execution", "compounding execution" at hero/card positions.

**Systems hero headline changed**
"Internal leverage, built to last" rejected as too abstract for cold visitors.
Replaced with "AI automation and workflows, built to scale" (EN) and "AI-automatisering en workflows, gebouwd om te schalen" (NL).

**Growth hero headline changed**
"Growth infrastructure, built to compound" rejected because "growth infrastructure" loses cold visitors.
Replaced with "SEO, content, and paid media, built to compound" (EN) and "SEO, content en betaalde kanalen, gebouwd om door te werken" (NL).

**Footer tagline changed**
"Digital infrastructure for operators who compete on execution" retired from footer.
Too internal. Replaced with "Websites, systems, and growth programs for businesses that compete online."

**Trust section eyebrow changed**
"Trusted signal" removed as nonsensical to a visitor. Replaced with "Verified client reviews".

**Services subtext simplified**
The three-sentence description of lanes was too dense.
Replaced with one plain sentence per lane: "Build covers... Systems covers... Growth covers..."

**Hero subheadline rewritten**
Original: "Conversion-focused websites, AI workflows, and growth systems for ambitious companies that compete on execution."
Too abstract on the back half. Replaced with: "We build websites that convert, AI systems that save time, and growth programs that compound. For businesses that want results, not reports."

**NL homepage positioning corrected**
Why H2 was "Gebouwd voor operators die op uitvoering concurreren."
"Operators" is English-insider language. Changed to "Gebouwd voor bedrijven die online willen groeien."

**Mobile hero oversized on all pages**
Hero H1 was `text-5xl` on mobile (48px), too heavy and oversized on iPhone.
Fixed to `text-4xl sm:text-5xl lg:text-6xl` across all 8 hero components (EN + NL).
Subheadline fixed from `text-lg` to `text-base sm:text-lg` across all 8 heroes.

**Clarity Layer shortened**
Section was too text-heavy and explanatory. Key changes:
- Eyebrow: "Inovense clarity layer" to "Service clarity"
- Right col intro: 3-sentence explanation cut to 1 sentence
- Lane card signals rewritten from "Use Build when..." to "Right fit when..."
- FAQ answers in geo.ts: cut from 2-3 sentences to 1-2 sentences each
- Proof surface notes reduced to 5-8 words
- Section sub-headers: "Public questions answered clearly" to "Questions answered", "Proof and citation surfaces" to "Proof and work"

---

## Earlier (pre-2026-04-16, from session history)

**Admin CRM premium refinement**
- Section padding reduced (px-5 py-3 to px-4 py-2.5)
- Column gap reduced (gap-4 to gap-3)
- Contract section flattened to inline link row
- Details section flattened to divide-y metadata block
- Status section flattened (no Section chrome)
- Contact + Project panels merged into single "Client" panel
- SectionGroup component added for Commercial / Delivery / Notes group labels

**Lifecycle reminder snooze + urgency**
- New: `reminder_snooze` JSONB column on leads table
- New: `snoozeReminder` server action (3d and 7d options, inline `· 3d · 7d` buttons)
- New: `urgency` field on LifecycleReminder type (`due / overdue / stalled`)
- Snooze check added to `addReminderIfDue` in lifecycle-reminders.ts

**Overview page restructured**
- Header now shows live Active / New / Total counts
- Weekly summary restructured as two-zone panel: "Act on first" at top, breakdown at bottom
- Attention banner on leads list redesigned as compact divide-y list

**Build hero subheadline**
"e-commerce experiences" changed to "Shopify stores and e-commerce builds" for specificity and searchability.
