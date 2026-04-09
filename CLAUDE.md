# Inovense project instructions

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- Supabase, Resend, Vercel
- Motion and Remotion available

## Execution rules

- Inspect existing files before writing anything.
- Make the smallest correct change. Do not rewrite unrelated files.
- Do not redesign working sections unless explicitly asked.
- Prefer localized changes over broad refactors.
- Return only affected files.
- If a feature is partially implemented, continue from current state. Do not re-architect.
- Prefer build-safe solutions over clever ones.
- Include exact SQL only when the task requires schema changes.

## Architecture

- Prefer Server Components. Use Client Components only for interactivity.
- Keep components small and production-ready.
- Primary CTA routes to `/intake` unless there is a clear exception.
- Forms must be validated and handled server-side where appropriate.

## CRM and operational flow

- The lead record is the single source of truth.
- Proposals, payments, and onboarding state must stay attached to the lead.
- Do not create disconnected subsystems unless explicitly asked.
- Do not add automation that changes commercial state without explicit intent.
- Operational correctness is more important than speculative features.

## Design

- Premium, dark, calm, expensive, high-trust. Operator-grade feel.
- Restrained use of `#49A0A4`.
- Avoid generic SaaS visuals and startup fluff.
- Mobile-first. iPhone Safari is a first-class target.
- No overflow, broken sticky behavior, or awkward spacing on small screens.
- Touch targets must be comfortable. Headline wrapping must be intentional.

## Writing

- Never use em dashes. Do not use ---.
- Use periods, commas, colons, or standard hyphens only.
- Copy must feel human, premium, and non-AI.
- No generic agency fluff. No overexplaining.

## Email

- Transactional emails must be branded, premium, and intentional.
- Compatible with Gmail and iPhone Mail.
- Restrained branding, clear hierarchy, concise copy.
- Never use em dashes in email copy.

## Response style

- Skip preamble. Lead with the implementation.
- Keep notes short and implementation-focused.
- Do not over-explain working code or decisions that are obvious from context.
