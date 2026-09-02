# Auterim Phase 2 legacy identifier map

This map records identifiers intentionally retained during the Inovense → Auterim runtime migration. Legacy values are compatibility contracts, not incomplete copy replacements.

| Identifier / reference | Location | Category | Migration strategy | Removal timeline | Manual provider work |
| --- | --- | --- | --- | --- | --- |
| `inovense_admin_session` | `src/lib/session.ts`, middleware, public-user state | C — Auth/session | Read after `auterim_admin_session`; valid legacy tokens are refreshed into the canonical cookie. | After all active admin sessions have expired and a measured grace period has elapsed. | No, unless cookie/domain policy changes. |
| `inovense_app_session` | `src/lib/session.ts`, workspace identity resolution | C — Auth/session | Read after `auterim_app_session`; app bootstrap writes the canonical cookie. | After active sessions and client versions are retired. | No. |
| `inovense-os-state-v1`, `inovense-os-state-v7` | `src/lib/os/app-provider.tsx`, pricing flow | B — Persisted client state | Read only as fallback, copy valid JSON into `auterim-os-state-v7`, preserve the old key temporarily. | After telemetry confirms migration and the old client is no longer supported. | No. |
| `inovense-os-dev-user-v1` | `src/lib/os/app-provider.tsx` | B — Persisted client state | Read as fallback and copy to `auterim-os-dev-user-v1`. | With the legacy preview client. | No. |
| `inovense_*` HubSpot properties | `src/lib/operators/executors/hubspot.ts` | D — External integration contract | Preserve existing property names and workspace/source markers. Add aliases only with an explicit CRM migration. | Only after dual-read/dual-write and workflow migration. | Yes, for any new properties or workflow changes. |
| `inovense_*` Slack event types | `src/lib/operators/executors/slack.ts` | D — External integration contract | Preserve event names; visible Slack messages use Auterim. | After all consumers support replacement events. | Yes, if Slack app subscriptions/actions change. |
| Nango connection/config IDs | `src/lib/connectors/registry.ts`, `src/lib/integrations/nango.ts` | D — External integration contract | Preserve provider and connection identifiers. Change only dashboard URLs/configuration. | Only after a tested dual-connection migration. | Yes. |
| Gmail redirect override | `.env.local`, `src/lib/connectors/gmail.ts` | F — Provider-side config | Code uses `GOOGLE_OAUTH_REDIRECT_URI` when set and otherwise derives the canonical app callback. | After Google accepts the Auterim callback and production env is updated. | Yes — Google Cloud Console. |
| Database plan values | `src/lib/pricing.ts`, Supabase migrations | E — Database/historical value | Preserve `preview`, `starter`, `growth`, `operator`, and `enterprise`; update display labels only. | Never by rename alone; migrate with an explicit data plan. | Possibly, if billing catalog changes. |
| Dodo product IDs | `.env.local`, pricing/billing code | D/E — External and database contract | Preserve IDs and webhook matching. | Never without a tested Dodo migration. | Yes — Dodo dashboard. |
| Legal entity and contract branding | `src/lib/contract-pdf.tsx`, design handoffs | E — Historical/legal value | Human legal review required before changing. | Legal approval dependent. | Yes, legal/provider review as applicable. |
| Legacy assets and handoff paths | `public/brand/inovense-*`, `design_handoff_inovense/`, `videos-ino/` | A/F — Brand asset/provider reference | Keep files and paths; update only safe rendered text/CTAs. | After all references are replaced and assets are archived. | No, except external social distribution. |
| Trustpilot profile URL | `src/components/trustpilot-signal.tsx` | F — Provider-side config | Do not substitute without confirming Auterim’s profile URL. | After profile ownership/domain is verified. | Yes — Trustpilot. |

## Canonical runtime values

- Marketing: `https://auterim.com`
- Public www host: `www.auterim.com`
- Application: `https://app.auterim.com`
- Admin: `https://admin.auterim.com`
- Client portal: retired; no `portal.auterim.com` canonical surface. Legacy portal links redirect to `https://app.auterim.com`.
- Gmail callback: `https://app.auterim.com/api/connectors/gmail/callback`

Remaining legacy references should be classified as `LEGACY_REQUIRED`, `MIGRATION_COMPATIBILITY`, `HISTORICAL_ONLY`, `PROVIDER_CHANGE_REQUIRED`, or `STILL_NEEDS_REVIEW` before removal.
