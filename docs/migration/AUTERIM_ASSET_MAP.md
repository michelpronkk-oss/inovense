# Auterim asset map

Old assets are retained until runtime references and external distribution are verified.

| Old asset/path | Replacement | Current references | Status | Safe to delete? |
| --- | --- | --- | --- | --- |
| `src/app/icon.svg` | Same active icon file with Auterim accessible label | Root metadata icon | Updated in place | No deletion needed. |
| `favicon.ico`, `src/app/favicon.ico` | Requires confirmed Auterim favicon source | Manifest and browser favicon handling | Existing binary cannot be identity-verified from source | No; requires design asset review. |
| `public/brand/inovense-app-icon-1024.svg` | Requires Auterim app icon asset | Apple touch icon in `src/app/layout.tsx` | Legacy asset retained intentionally | No; replace after design asset approval. |
| `public/brand/inovense-*.svg` | `public/brand/auterim-*.svg` | Mostly handoffs/manual exports; no broad active runtime dependency found | Historical/legacy exports | No; archive after external-reference check. |
| `public/brand/inovense-og-image.svg` | Requires approved Auterim OG artwork | Downloadable/manual asset | Legacy export | No; requires design asset. |
| `public/design/inovense-os-claude/` | `public/design/auterim-os-claude/` | Static design handoff references | Historical handoff | No; do not rename until handoff consumers are audited. |
| `design_handoff_inovense/` | `design_handoff_auterim/` | Handoff documentation and source references | External/historical handoff | No; archive or rename only with owner approval. |
| `videos-ino/` and `Inovense*.tsx` | Requires coordinated Remotion composition rename | Root video scripts and render IDs | Active source plus historical output | No; composition IDs may be external. |

## Regeneration

Active video source branding/CTAs were updated where safe. Regenerate exports with the existing Remotion commands documented in `videos-ino/README.md` after design approval. Generated bundles and cached output are intentionally excluded from lint.
