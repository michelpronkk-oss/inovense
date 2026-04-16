# Inovense — Handoff

Last updated: 2026-04-16
Continue from here. Read CURRENT_STATE.md for the full accepted baseline.

---

## What was just done

**Positioning pass (copy)**
- EN and NL hero subheadlines rewritten for cold-traffic clarity
- Systems and Growth hero headlines made concrete (removed "infrastructure", "leverage", "internal")
- Footer tagline updated on EN and NL
- Services section subtext simplified to plain lane descriptions
- Trust section eyebrow fixed ("Trusted signal" to "Verified client reviews")
- NL Why H2 fixed (removed "operators" language)
- Build card: "e-commerce experiences" to "Shopify stores and e-commerce builds"

**Mobile hero fix**
H1 on all 8 hero components (EN + NL): `text-5xl` to `text-4xl sm:text-5xl lg:text-6xl`
Subheadline on all 8: `text-lg` to `text-base sm:text-lg`
Line-height: `1.08` to `1.1`

**Clarity Layer tightened**
- Section eyebrow, right col intro, lane card copy, FAQ answers, proof notes, sub-headers all shortened
- geo.ts FAQ answers rewritten to 1-2 sentences

**Docs layer created**
`/docs/claude/` — CLAUDE.md, CURRENT_STATE.md, MEMORY_LOG.md, HANDOFF.md

---

## What still needs work

**NL lane pages (body copy)**
The NL build, systems, and growth page offerings and difference sections have not been updated with the new copy from the EN pass. Hero headlines are fixed but deeper copy still uses older phrasing in places.

**Intake form**
Review form fields for misleading preselected values. Any dropdown or radio group that defaults to a specific option rather than a true placeholder should be corrected.

**Clarity Layer NL equivalent**
The NL homepage does not have a Clarity Layer section. If one is added, it should follow the same shortened, direct format.

**Process page CTAs**
Process page CTA section may still use older, weaker CTA language. Review and align with the new direct CTA standard: "Tell us what you're building. We respond within 24 hours."

**Work section**
St. Regis and The Nude Bottle cases are listed as "coming soon". When these go live, work section copy will need updating.

---

## Do not undo

- The new mobile hero sizing (`text-4xl sm:text-5xl lg:text-6xl`)
- The shortened Clarity Layer FAQ answers in `src/lib/geo.ts`
- The Systems and Growth hero headline changes (both EN and NL)
- The footer tagline on both EN and NL
- The "Service clarity" eyebrow on geo-answers
- The admin CRM refinements (SectionGroup labels, flat Status card, merged Client panel)
- The reminder snooze system (`reminder_snooze` column, `snoozeReminder` action)

---

## Known rough edges

- NL hero subheadline is slightly long on very small screens (320px). Not critical but could tighten further.
- "Inovense Clarity Layer" still appears in schema/JSON-LD in `src/app/page.tsx` homePageSchema description. Low priority but could be cleaned up if schema copy is ever audited.
- The `/answers` page linked from the Clarity Layer has not been audited for copy alignment with the new shorter FAQ answers.

---

## Likely next tasks

1. NL lane page body copy alignment (offerings and difference sections)
2. Intake form field review (preselected values vs. true placeholders)
3. Process page CTA review
4. `/answers` page copy review and alignment with shortened FAQ format
5. Any new case study copy for St. Regis or The Nude Bottle when ready
