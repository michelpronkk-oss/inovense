# Inovense — Claude Working Rules

Apply these in every session without being asked.

---

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase, Resend, Vercel. Motion and Remotion available.

---

## Response style

- Lead with implementation. No preamble.
- Default to concise. Expand only when explicitly asked.
- After coding: changed files only, one-line note per file. No narrative recap.
- If asked for a prompt: output the prompt only, no framing.
- If asked for a deploy command: output the command only.
- Do not restate the plan before executing it.
- Treat token economy as a first-class requirement. No speculative detours, no generic best-practice essays.
- Do not re-read files already in context. Do not re-audit if the task is scoped.
- One build verify pass is enough.

---

## Implementation behavior

- Read the target file before editing. Never assume its shape.
- Smallest correct change. Leave unrelated code untouched.
- Prefer localized edits over broad rewrites.
- No speculative abstractions. No new utilities for one-off tasks.
- No defensive rewrites. Fix the specific issue.
- When a bug is localized: fix surgically. Do not redesign around it.
- Prefer Server Components. Use Client Components only for interactivity.
- Keep components small and production-ready.
- Primary CTA routes to `/intake` unless there is a clear exception.
- If a feature is partially implemented, continue from current state.
- Include exact SQL only when a schema change is required.
- Prefer build-safe solutions over clever ones.

---

## Audit handoff rules

- Treat a user-provided audit as the source of truth. Do not re-audit broadly.
- Implement directly from the audit unless a specific step is clearly broken.
- If an audit names files and a plan: follow the plan, skip re-deriving it.
- If something in the audit conflicts with the repo state, fix only that discrepancy.

---

## Positioning and copy

**Model: simple entry, sharp depth.**
Top-layer copy (hero, lane intro, CTA) must be commercially legible to a cold visitor.
Lead with what is built: websites, Shopify stores, AI automation, SEO programs.
Layer differentiation underneath: no templates, direct builders, scoped outcomes.

**Banned phrases at hero/card positions:**
- "digital infrastructure"
- "operators who compete on execution"
- "compounding execution"
- "experience layer"
- "signal, structure, and compounding execution"

**Lane definitions (use these, not variations):**
- Build = websites, landing pages, Shopify stores, digital products
- Systems = AI automation, workflows, internal tooling
- Growth = SEO, content, paid media

**Tone:** Premium, calm, controlled. No hype, no agency swagger. Clear before clever. No em dashes anywhere. No overlong paragraphs. No filler negatives unless the contrast earns it.

**EN anchors:**
- Trust strip: `Custom-built, not templated · 24h response · No pitch decks`
- CTA: "Start a project" + "We respond within 24 hours with a clear plan, not a pitch deck."
- Footer: "Websites, systems, and growth programs for businesses that compete online."

**NL rules:**
- Dutch is a conversion layer, not a translation layer. Write natural Dutch, not translated English.
- NL trust strip: `Op maat gebouwd · Reactie binnen 24 uur · Geen pitch decks`
- NL footer: "Websites, systemen en groeiprogramma's voor bedrijven die online willen groeien."
- Avoid overly formal Dutch. Directe, zakelijke taal.
- Do not use "operator" as client-facing language in either language.

**SEO / content:** Do not change page metadata, OG tags, or sitemap entries unless the task requires it. Slug and URL changes require explicit instruction.

---

## UX and design

- Preserve the premium dark UI: zinc-900 base, brand `#49A0A4` sparingly. No generic SaaS visuals.
- Mobile-first. iPhone Safari is a primary target.
- Do not redesign working sections unless explicitly asked. Surgical changes only.
- Keep hero structure intact. Adjust copy and sizing, not layout.
- Do not add feature flags, backwards-compatibility shims, or extra abstractions.

---

## CRM / lead / proposal / payment

- Lead record is the single source of truth.
- Proposals, payments, and onboarding stay attached to the lead. No disconnected subsystems.
- Do not auto-change commercial state without explicit user intent.
- Reuse existing locale, email, CRM, and payment logic. Do not duplicate it.
- `project_status = completed` is a delivery state. Never infer it from payment events.
- Server-side idempotency required for all state-transition actions.
- Payment state derives from: `proposal_price`, `proposal_deposit`, `deposit_amount`, `deposit_paid_at`, `final_payment_paid_at`.

---

## Email

- Use `buildEmailHtml` for all transactional emails. Do not build a new shell.
- Locale resolves from `lead_source` via `getClientLocaleForLeadSource`. Reuse it.
- Dutch leads (`nl_web` and equivalents) get NL copy. All others get EN.
- Log every sent email to `lead_email_log`. Non-blocking on failure.
- No internal notes, strategy language, or raw finance terms in client-facing copy.

---

## Prompt and deploy output

- Prompt request: output the prompt only.
- System prompt request: output in full, no meta-commentary.
- Deploy request: output the command only. No pre-deploy checklist unless explicitly a release review.
