# Auterim production observability

## Monitored signals

- Migration events under the `[auterim-migration]` prefix.
- Authentication failures and redirects through application logs.
- Google OAuth, Nango, Slack, connector, billing, email, and operator errors already emitted by their route/job boundaries.
- Webhook signature failures and persistence failures.
- `/api/health` availability and HTTP status.
- Supabase persistence errors and Trigger job failures.

Logs must contain event/category, provider or system, route/job, status, error class, and timestamp where available. Do not add tokens, OAuth codes, cookie values, full customer payloads, or sensitive business data.

## Not monitored by the repository

- Provider dashboard delivery metrics.
- DNS, TLS, Vercel, Resend, Dodo, Nango, Google, Slack, or Supabase control-plane health.
- Business KPI correctness or customer data quality.

## Critical failure signals

- `/api/health` returning non-200 for two consecutive checks.
- Any invalid webhook signature spike.
- Repeated OAuth callback failures.
- Billing webhook persistence failures.
- Resend delivery failures.
- `migration_fallback_failed` events.
- Operator runs stuck or failing repeatedly.

## Suggested thresholds

- Page on health failure for 2 minutes.
- Page on more than 3 billing/webhook signature failures in 5 minutes.
- Alert on any sustained OAuth or email failure over 10 minutes.
- Review migration fallback usage weekly; do not remove compatibility based on a single quiet deployment.

## Provider observability

Configure alerts and delivery logs manually in Vercel, Supabase, Google Cloud, Nango, Slack, Dodo, Resend, and Trigger. The repository does not add a paid observability dependency.
