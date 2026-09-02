# Auterim production launch checklist

## PRE-LAUNCH

- Code — validate TypeScript and production build; stop on failure.
- Tests — run `pnpm run test:rebrand` and review warnings.
- Domains — verify apex, www, app, admin, and portal DNS/TLS.
- Environment — update production URLs; never copy secrets into documentation.
- Providers — complete the provider cutover checklist manually.
- Assets — install approved Auterim assets or keep documented design blockers.
- Legal — obtain approval for entity, contracts, privacy, terms, and Trustpilot.
- Email — verify Resend domain and sender delivery.
- Billing — test Dodo checkout, return URLs, and webhook replay.
- Integrations — test Google, Supabase invite, Nango, Slack, and connectors.
- Observability — configure `/api/health` monitoring and provider alerts.

## CUTOVER

- DNS — apply approved records and validate resolution.
- Vercel — add domains, environment values, and TLS.
- Provider URLs — update callbacks/webhooks in each dashboard.
- Environment variables — redeploy with canonical public URLs.
- Redeploy — promote only after build and smoke checks pass.
- Health check — require `GET /api/health` to return 200.

## POST-LAUNCH

Validate homepage, login, invites, OAuth, connectors, billing, webhook delivery, email delivery, admin, app, legacy redirects, analytics, and migration logs. Confirm `portal.auterim.com` is not configured as an active surface. On failure, stop rollout and follow rollback.

## ROLLBACK

- DNS — restore prior records or route to the last known-good deployment.
- Vercel — promote the previous deployment and restore domain assignment if needed.
- Environment — restore the last known-good non-secret configuration values.
- OAuth/provider — retain or restore old callbacks until traffic is stable.
- Legacy recovery — keep legacy host redirects and compatibility cookies/storage enabled.

Every failed validation requires pausing the rollout, recording the provider/error category, and avoiding destructive cleanup.
