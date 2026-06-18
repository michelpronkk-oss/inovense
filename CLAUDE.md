# Claude instructions

Primary project docs live in:

- /docs/claude/CLAUDE.md
- /docs/claude/CURRENT_STATE.md
- /docs/claude/MEMORY_LOG.md
- /docs/claude/HANDOFF.md

Use those files as the source of truth.


# Inovense — project rules for Claude

Persistent guidance for any Claude session in this project. Follow these unless the user explicitly overrides them.

## Product
Inovense is "the operating layer for AI-native work": connect your tools, deploy AI **operators**, approve actions before they run, keep every workflow in memory. We say **operators**, not "agents/bots".

## Copy rules (hard)
- Primary CTA is **"Start preview"** everywhere. **Never "Start free"** — there is no normal free plan.
- Secondary CTA: **"View platform"**.
- Hero supporting line: **"Preview the workspace. Connect real tools when ready."**
- Approved hero headline: **"AI operators that execute real business work."**
- Approved hero subcopy: **"Connect your tools, set approvals and let operators prepare, route and execute work safely."**
- **No fake live metrics or fake run numbers.** Product visuals use honest "preview" framing: **"WORKFLOW PREVIEW"**, status **"AWAITING APPROVAL"**, audit panel **"AUDIT LOG / policy + approvals"**. Never reintroduce "LIVE · run #4,812", "8,412 events / day", or live elapsed timers.
- Aggregate marketing stats (e.g. 1.2M actions/mo, 94% approval) are fine — they are not the banned live-run counters.
- No emojis. No em dashes. No fake logos or fake claims. No "revolutionary", "game-changing", "supercharge", or generic AI hype.

## The operator model
Every operator runs the same loop: **Detect → Prepare → Approve → Execute → Log**. The **Approve** step is the human gate (styled amber). There are **15 operators**; the homepage features four (Revenue, Marketing, Client Flow, Operations) and links to the full Operators page. Operator data lives in `operators-data.js` (`OPERATORS` + `GLYPHS`) — single source of truth.

### Operator avatars
Profile avatar = circle with a role-colored gradient (`linear-gradient(135deg, ${color}26, ${color}08)`, inset ring `${color}55`), a **person silhouette** filled in the role color, and a **badge** bottom-right (dark bg `#0A0E12`, role-colored line glyph, `0 0 0 2px var(--bg)` ring). **No letter monograms.**

## Design tokens
- Surfaces: `--bg:#06070A`, cards `#0E1117` / `#0E1218→#090C11`. Text: `--text:#ECEFF3`, `--text-dim:#9AA1AA`, `--text-mute:#646A72`, `--text-faint:#454A51`. Lines: `rgba(255,255,255,0.055 / 0.085 / 0.14)`.
- Accents: cyan `#4DE8E1` (primary) / bright `#7EF6F0`; amber `#F5C26B` (approval gate); green `#51D88A`; blue `#5B8DEF`; rose `#F2767C`.
- Operator role colors (1–15): `#4DE8E1, #5B8DEF, #51D88A, #A78BFA, #E0A35E, #6EC7F2, #F5C26B, #8B9DF7, #E8836B, #5FD3A8, #66D0E0, #C58BF0, #7AA8FF, #5ED6C0, #9B8CFF`.
- Type: **Geist** (sans, headings weight 500, tight tracking) + **Geist Mono** (labels, tags, metrics). Containers: 1240/1360px, padding `0 32px` (`0 20px` mobile).
- Header bar is intentionally **slim** (`.header` padding `9px 0`, compact nav pill). Keep it tight.

## Scope guardrails
Do not change dashboard/app logic, auth, billing, connectors, Gmail, HubSpot, Nango, Supabase, or the operator runtime when doing marketing-site/design work. Preserve the dark premium mint/cyan identity. Premium whitespace; restraint over density.
