# Inovense project instructions

Always build for the current stack in this repository.

Core stack:
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase
- Vercel

Project goals:
- Build a premium, high-conviction agency site and internal operating layer for Inovense.
- Prioritize clarity, premium UI, speed, and future extensibility.
- Keep v1 lean. Do not add unnecessary abstractions or features.

Rules:
- Prefer Server Components by default.
- Use Client Components only when needed for interactivity.
- Keep components small, reusable, and production-ready.
- Mobile-first always.
- Avoid overdesigned agency fluff.
- Focus on conversion, trust, hierarchy, and polish.
- Do not rewrite large files unless necessary.
- Make localized, low-risk changes.
- Keep code copy-paste ready.
- Use up-to-date Next.js patterns from the local AGENTS.md guidance.

Current product direction:
- 3 service lanes: Build, Systems, Growth
- Guided intake flow
- CRM basics for leads and clients
- Strong homepage positioning
- Premium but calm visual language

When asked to build:
1. Inspect current files first
2. Explain the smallest correct implementation path
3. Then generate exact code

Writing rule:
- Never use em dashes in copy or UI text
- Prefer periods, commas, colons, or clean sentence breaks
- Writing must feel human, premium, and non-AI

Responsive rules:
- Mobile-first always
- Every page must feel premium on desktop, tablet, and mobile
- iPhone Safari must be treated as a first-class target
- No overflow, clipped effects, broken sticky behavior, or awkward spacing on smaller screens
- Touch targets must be comfortable on mobile
- Headline wrapping must be intentional across breakpoints
- Visual polish must hold up on iOS Safari, not just desktop Chrome

Writing rules:
- Never use em dashes in copy or UI text
- Do not use —
- Use periods, commas, colons, or standard hyphens only
- Copy must feel human, premium, and non-AI

Form and conversion rules:
- Primary CTA buttons should route to /intake unless there is a clear exception
- Email is a secondary fallback, not the main conversion path
- Forms must be production-ready, validated, and easy to extend into CRM storage
- All user submissions should be handled server-side where appropriate

Email rules:
- Transactional emails must feel branded, premium, and intentional
- Avoid plain unstyled text emails unless absolutely necessary
- Keep email layouts compatible with Gmail and iPhone Mail
- Use restrained branding, clear hierarchy, and concise copy
- Never use em dashes in email copy