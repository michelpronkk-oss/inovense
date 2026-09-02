# Auterim legacy deprecation plan

Compatibility remains enabled. No item in this document is approved for immediate removal.

## Migration telemetry taxonomy

Events are emitted by `src/lib/migration-telemetry.ts` and contain only a stable event name. Cookie contents, tokens, personal data, secrets, and payloads are never logged.

| Event | Source | Fires when | Production-safe | Zero-usage meaning |
| --- | --- | --- | --- | --- |
| `legacy_admin_cookie_used` | `src/middleware.ts`, `src/lib/os/workspace.ts` | A valid legacy admin cookie is used. | Yes | No observed admin request requires the legacy cookie during the measurement window. |
| `legacy_app_cookie_used` | `src/lib/os/workspace.ts` | A valid legacy app cookie is used. | Yes | No app request requires the legacy cookie. |
| `legacy_storage_migrated` | `src/lib/os/app-provider.tsx` | Valid legacy browser state is copied to the canonical key. | Yes | No supported client migrates legacy state. |
| `legacy_host_redirect_used` | `src/middleware.ts` | A legacy Inovense host is redirected. | Yes | No requests reach legacy hosts during the measurement window. |
| `migration_fallback_failed` | middleware and state hydration | A legacy fallback is present but invalid or unreadable. | Yes | No failed fallback events; investigate before removal. |

Telemetry is currently application log telemetry, not a historical production dataset. Until deployed logs show a complete grace period, every fallback is `NOT ENOUGH DATA TO REMOVE`.

| Legacy item | Why it exists | Category | Removal condition | Grace period | Procedure / rollback | Long-term status |
| --- | --- | --- | --- | --- | --- | --- |
| `inovense_admin_session` | Existing admins may still have valid cookies. | Auth/session | No legacy-cookie telemetry for at least 30 days and all active sessions have naturally expired. | 30–90 days | Remove fallback read after a staged release; rollback by restoring the fallback and canonical write. | Temporary. |
| `inovense_app_session` | Existing application sessions must not be invalidated. | Auth/session | No legacy app-cookie telemetry for 30 days and client releases are current. | 30–90 days | Remove fallback in workspace identity resolution; rollback by restoring the legacy branch. | Temporary. |
| `inovense-os-state-*` | Browser state belongs to existing users and previews. | Persisted client state | Migration telemetry is zero for 30 days and support confirms no old client deployments remain. | 90 days minimum | Stop fallback reads only after export/support plan; rollback by restoring reads. | Temporary, with long tail. |
| Legacy Inovense hosts | Existing links, bookmarks, and provider callbacks may still arrive. | Provider/routing compatibility | Redirect telemetry is zero for 60 days and provider settings are confirmed migrated. | 60–180 days | Remove host recognition/redirects in a staged deploy; rollback by restoring host map. | Temporary. |
| Legacy HubSpot properties | Existing CRM workflows and records depend on names. | External integration contract | Dual-read/write replacement exists and all workflows are migrated and tested. | Indefinite unless CRM owner approves. | Migrate property-by-property; rollback by continuing legacy writes. | May remain indefinitely. |
| `inovense_*` Slack/Nango identifiers | External consumers may match exact event/config identifiers. | External integration contract | Every consumer accepts Auterim aliases or contracts are formally retired. | Indefinite. | Add dual support before changing; rollback by restoring legacy-only emission. | May remain indefinitely. |
| Existing plan/database values | Historical entitlements and billing records use these values. | Database/historical value | Explicit data migration, billing reconciliation, and rollback plan exist. | Indefinite. | Map display labels only; never rewrite values in place without backup. | May remain indefinitely. |
| Dodo product mappings | Dodo products and webhooks match opaque IDs. | Billing contract | Dodo confirms replacement products and webhook replay tests pass. | Indefinite. | Add mapping first, migrate one plan at a time, retain old mapping for rollback. | May remain indefinitely. |

## Safe removal checklist

1. Confirm provider configuration is canonical and production traffic is stable.
2. Review migration telemetry without exposing personal or credential data.
3. Announce the deprecation window and support impact.
4. Release a feature-flagged removal with rollback available.
5. Validate auth, storage, billing, and integration smoke tests.
6. Remove only the specific fallback whose usage is zero.

## Rollback

Rollback is a code release that restores the legacy read/redirect branch. Do not delete old cookies, browser keys, CRM properties, database values, or provider mappings as part of rollback.
