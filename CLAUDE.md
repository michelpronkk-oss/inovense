# Inovense project instructions

## Stack
Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase, Resend, Vercel. Motion and Remotion available.

## Response style
- Lead with implementation. No preamble.
- Default to concise. Expand only when explicitly asked.
- After coding: changed files only, one-line note per file if needed. No narrative recap.
- If asked for a prompt: output the prompt directly, no framing.
- If asked for a deploy command: output the command only.
- Do not restate the plan before executing it.
- Do not explain obvious code changes at length.

## Token discipline
- Treat token economy as a first-class requirement.
- Do not re-read files you already have in context this turn.
- Do not re-audit the repo if the task is already scoped.
- Do not produce alternatives unless the approach is genuinely ambiguous.
- No speculative detours. No generic best-practice essays.
- Prefer changed-files summaries over long narratives.
- One build verify pass is enough. Do not re-explain a passing build.

## Repo working style
- Read the target file before editing. Do not assume its shape.
- Make the smallest correct change. Leave unrelated code untouched.
- Prefer localized edits over broad rewrites.
- Return only affected files.
- If a feature is partially implemented, continue from current state.
- Include exact SQL only when the task requires a schema change.
- Prefer build-safe solutions over clever ones.

## Implementation bias
- When the task is clear: implement, do not discuss.
- When a bug is localized: fix it surgically. Do not redesign around it.
- Prefer null-safe, additive fixes over defensive rewrites.
- Do not introduce new abstractions unless they clearly reduce complexity.
- Do not create detached subsystems when existing flows already handle it.
- Prefer Server Components. Use Client Components only for interactivity.
- Keep components small and production-ready.
- Primary CTA routes to `/intake` unless there is a clear exception.

## Audit handoff rules
- Treat a user-provided audit as the source of truth. Do not re-audit broadly.
- Implement directly from the audit unless a specific step is clearly broken.
- If an audit names files and a plan: follow the plan, skip re-deriving it.
- If something in the audit conflicts with the repo state, fix only that discrepancy.

## CRM / lead / proposal / payment rules
- The lead record is the single source of truth.
- Proposals, payments, and onboarding stay attached to the lead. No disconnected subsystems.
- Do not auto-change commercial state (status, project_status, payment fields) without explicit user intent.
- Reuse existing locale, email, CRM, and payment logic. Do not duplicate it.
- `project_status = completed` is a delivery state, not a payment trigger. Never infer it from payment events.
- Server-side idempotency is required for any state-transition action (deposit paid, final payment, etc.).
- Payment state derives from: `proposal_price`, `proposal_deposit`, `deposit_amount`, `deposit_paid_at`, `final_payment_paid_at`.

## UX / UI change rules
- Preserve the premium dark UI language: calm, restrained, operator-grade.
- Color: `#49A0A4` (brand), sparingly. No generic SaaS visuals.
- Mobile-first. iPhone Safari is a primary target.
- No em dashes anywhere — in UI copy, email copy, or code comments.
- Copy must be human, premium, and concise. No agency fluff.
- Surgical UI changes only. Do not redesign working sections unless explicitly asked.

## Email rules
- Use `buildEmailHtml` for all transactional emails. Do not build a new shell.
- Locale resolves from `lead_source` via `getClientLocaleForLeadSource`. Reuse it.
- Dutch leads (`nl_web` and equivalents) get NL copy. All others get EN.
- Log every sent email to `lead_email_log`. Non-blocking on log failure.
- No internal notes, strategy language, or raw finance terms in client-facing email copy.
- No em dashes in email copy.

## SEO / content rules
- Do not change page metadata, OG tags, or sitemap entries unless the task requires it.
- Copy changes must preserve tone: premium, direct, non-AI.
- Slug and URL structure changes require explicit instruction.

## Prompt-writing behavior
- When asked to write a prompt: output the prompt. No explanation unless asked.
- When asked to write a system prompt: output it in full, no meta-commentary.
- Do not suggest prompt alternatives unless the request is ambiguous.

## Deploy behavior
- When asked to deploy: output the deploy command only.
- Do not explain what deploy does unless asked.
- Do not add pre-deploy checklist noise unless the task is explicitly a release review.
