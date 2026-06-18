# Handoff: Inovense Homepage + Operators Page

## Overview
This bundle contains two designs for the Inovense marketing site:

1. **Homepage** (`index.html` + `src/*.jsx` + `styles.css`) — the dark, premium "operating layer for AI-native work" landing page: hero, integrations band, operating-layer diagram, operators grid, stats, workflows, memory, approvals, integrations, security, pricing, final CTA, footer.
2. **Operators page** (`Operators.html` + `operators-data.js`) — a dedicated page listing all **15 operators**, each as a premium profile card running the same `Detect → Prepare → Approve → Execute → Log` loop, split into a **Launch wave (1–9)** and **Expanding (10–15)**.

The homepage links to the Operators page from a button under the four featured operators ("Explore all 15 operators").

## About the Design Files
The files in this bundle are **design references created in HTML/JSX**, not production code to copy verbatim. The homepage `.jsx` files run through an **in-browser Babel transform** and use inline `<style>` blocks; they are a faithful visual + structural spec, not Next.js components.

**Task:** recreate these designs in the real **Next.js + Tailwind** codebase using its existing components, conventions and design tokens. Translate the inline styles to Tailwind classes, keep the copy and structure exact, and preserve the responsive behavior (`md` / `lg` breakpoints). Do **not** change dashboard/app logic, auth, billing, connectors, Gmail, HubSpot, Nango, Supabase or the operator runtime.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing and interactions. Recreate pixel-faithfully using the codebase's existing libraries/patterns; only substitute Tailwind equivalents for the inline CSS.

## Brand / Copy Rules (must hold across both pages)
- Primary CTA is **"Start preview"** everywhere. **Never "Start free"** — Inovense has no normal free plan.
- Secondary CTA: **"View platform"**. Hero supporting line: **"Preview the workspace. Connect real tools when ready."**
- Hero headline: **"AI operators that execute real business work."** (cyan period accent).
- Hero subcopy: **"Connect your tools, set approvals and let operators prepare, route and execute work safely."**
- **No fake live metrics or fake run numbers.** The product visuals use honest "preview" framing: header label **"WORKFLOW PREVIEW"**, status **"AWAITING APPROVAL"**, audit panel **"AUDIT LOG / policy + approvals"**. Do not reintroduce things like "LIVE · run #4,812" or "8,412 events / day".
- No emojis, no em dashes, no "revolutionary / game-changing / supercharge", no fake logos/claims.
- Aggregate marketing stats (e.g. 1.2M actions/mo, 94% approval) are allowed — those are not the banned "live run" counters.

## Screens / Views

### 1. Homepage — Header (`src/header.jsx`, `.header` in `styles.css`)
- Fixed top bar, transparent until scrolled (then `rgba(6,7,10,0.55)` + blur).
- Layout: brand left, centered pill `nav`, right cluster `Sign in` + `Start preview` button.
- The bar is intentionally **slim**: `.header` padding `9px 0`; nav pill padding `5px`, nav links `7px 13px`, link size `13.5px`. Keep this compact height.
- Nav items: Platform, Agents, Workflows, Integrations, Security, Pricing, Docs.

### 2. Homepage — Hero (`src/hero-v5.jsx`, `HeroV5`)
- Two-column grid (`minmax(0,560px) minmax(0,560px)`, gap 56px, max-width 1200px), collapses to one column at `880px`.
- Left column order: pill ("New · Workflow approvals 2.0"), `h1` (clamp 48–88px, weight 500, letter-spacing -0.04em, cyan period), subcopy (17px, `--text-dim`, max-width 520px), CTA row (`Start preview` primary + `View platform` ghost), then the mono note "Preview the workspace. Connect real tools when ready." **There is no "trust logos" strip** — it was removed; do not add one.
- Right column: `LayeredStack` — three stacked glass cards (audit log, memory graph, approval). All "preview"-framed (see copy rules). Front card shows Revenue Operator drafting a reply to Aiko Tanaka with Approve / Edit / Skip.

### 3. Homepage — Operators section (`src/sections-product.jsx`, `AgentsSection` + `AgentCard`)
- Eyebrow "Operators", h2 "Operators, not chat threads.", lede ending "These four lead the launch — fifteen in all."
- 2-col grid of four cards: Revenue, Marketing, Client Flow, Operations.
- **Profile avatar** (this is the key recent change): a 44px circle with a role-colored gradient background (`linear-gradient(135deg, ${color}26, ${color}08)`, inset ring `${color}55`), a **person silhouette** SVG filled in the role color, and a **badge** bottom-right (19px circle, bg `#0A0E12`, role-colored 11px line icon, `0 0 0 2px var(--bg)` outer ring). **No letter monograms** (RV/MK/CF/OP were removed).
  - Revenue → cyan `#4DE8E1`, trend-up glyph. Marketing → violet `#A78BFA`, megaphone. Client Flow → blue `#5B8DEF`, user-check. Operations → green `#51D88A`, bar chart.
- Card body: 4 check bullets, footer with a stat (num + unit + green delta) and a status hint with a pulsing dot. A "RUNNING" pill sits top-right.
- Below the grid, centered ghost button **"Explore all 15 operators →"** → links to the Operators page.

### 4. Operators page (`Operators.html` + `operators-data.js`)
- Self-contained page (its own tokens, header, footer — mirrors the site).
- Intro: eyebrow "Operators", h1 "Fifteen operators. One operating layer." subcopy, then a **loop legend** strip: `Detect → Prepare → Approve → Execute → Log` with the **Approve** step styled as the amber human gate.
- Two waves, each with eyebrow pill + h2 + intro line:
  - **Launch wave** — operators 1–9.
  - **Expanding** — operators 10–15.
- **Operator card** (`.op`): role color set via `--c`. Header = profile avatar (same person+badge pattern as homepage, 48px) + name + mono tag + phase number (01–15). Mission line. Then the 5-step loop as a vertical list with a connecting rail: each step has a role-colored node + mono label (`DETECT`/`PREPARE`/`APPROVE`/`EXECUTE`/`LOG`) + a short phrase. The **APPROVE** step is amber. Hover lifts the card with a role-colored glow.
- All 15 operators (name, tag, color, glyph key, mission, 5 loop steps) live in `operators-data.js` as the `OPERATORS` array; role glyphs are in the `GLYPHS` map. This is the single source of truth — port it as structured data.

## Interactions & Behavior
- Header: toggles a scrolled style after `scrollY > 8–12`.
- Hover: nav links tint, buttons lift `translateY(-1px)`, cards lift with shadow/glow.
- Homepage entrance: elements use a `fadeUp .6s ease both` (`.fade-in`) with staggered `animation-delay`. Make the visible state the base and animate from hidden so SSR/no-JS/reduced-motion still show content.
- Operators page uses `scroll-behavior: smooth` for in-page anchors.
- Responsive: homepage hero → 1 col at 880px; operator grids → 1 col at 880px; nav hides under 900px (provide a mobile menu in the real build if the codebase has one).

## State Management
- Minimal. Header scroll boolean. The homepage hero's `LayeredStack`/`ApprovalHero` had decorative timers — in the real build prefer static "preview" content (no live counters) per the copy rules.
- Operators page is static, rendered from the `OPERATORS` data array.

## Design Tokens (from `styles.css` :root and the Operators page)
**Surfaces / text**
- `--bg: #06070A`, `--bg-1: #0A0C10`, card surfaces `#0E1117` / gradients `#0E1218 → #090C11`
- `--text: #ECEFF3`, `--text-dim: #9AA1AA`, `--text-mute: #646A72`, `--text-faint: #454A51`
- `--line: rgba(255,255,255,0.055)`, `--line-2: rgba(255,255,255,0.085)`, `--line-strong: rgba(255,255,255,0.14)`

**Accents**
- Cyan (primary): `--cyan: #4DE8E1`, `--cyan-bright: #7EF6F0`, soft `rgba(77,232,225,0.10)`, line `rgba(77,232,225,0.26)`
- `--amber: #F5C26B` (approval gate), `--green: #51D88A`, `--blue: #5B8DEF`, `--rose: #F2767C`

**Operator role colors (Operators page, in order 1–15)**
`#4DE8E1, #5B8DEF, #51D88A, #A78BFA, #E0A35E, #6EC7F2, #F5C26B, #8B9DF7, #E8836B, #5FD3A8, #66D0E0, #C58BF0, #7AA8FF, #5ED6C0, #9B8CFF`

**Type**
- Sans: **Geist** (300–700). Mono: **Geist Mono** (labels, tags, metrics). Headings weight 500, tight letter-spacing (-0.025 to -0.04em).

**Containers**: `--container: 1240px`, `--container-wide: 1360px`, page padding `0 32px` (`0 20px` on mobile).

## Assets
- Inovense wordmark/logo is a simple 4-rect SVG (inline in the files) — reuse your codebase's brand component if one exists.
- Integration logos (Slack, Notion, Stripe, HubSpot, Gmail, Linear, Salesforce, Intercom, etc.) are inline brand SVGs in the section files — replace with your existing logo assets where available.
- All operator/role glyphs are simple inline line SVGs (in `operators-data.js` `GLYPHS` and the JSX). No external icon files.

## Files
**Homepage**
- `index.html` — shell + App composition (renders Header, HeroV5, sections, Footer)
- `styles.css` — global tokens, header, hero scaffold, sections, responsive
- `styles-layered-stack.css` — hero `LayeredStack` visual
- `src/header.jsx` — `Header`, `Brand`, `InovenseMark`
- `src/hero-v5.jsx` — `HeroV5` + `LayeredStack`
- `src/sections-product.jsx` — `OperatingLayerSection`, `AgentsSection` (+ `AgentCard`), `WorkflowsSection`, `MemorySection`, `ApprovalsSection`
- `src/sections-trust.jsx` — `IntegrationsSection`, `SecuritySection`, `PricingSection`, `FinalCTA`, etc.
- `src/icons.jsx` — shared `I.*` icon set
- `src/dashboard.jsx` — dashboard component (reference only; not required for the marketing pages)

**Operators page**
- `Operators.html` — page structure, styles, render script
- `operators-data.js` — `OPERATORS` array (all 15) + `GLYPHS` map (single source of truth)

## How to use in Cursor (Claude)
Open this folder as context and ask Claude to port one page at a time into the Next.js app: start with the Operators page (cleanest, data-driven), then the homepage Operators section, then the hero/header. Keep all copy and tokens exact, convert inline CSS to Tailwind, and verify `pnpm run build` passes. Open the `.html` files in a browser to see the intended result.
