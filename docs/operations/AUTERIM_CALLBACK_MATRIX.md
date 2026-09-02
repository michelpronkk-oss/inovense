# Auterim Callback Matrix

This is the repository source of truth for production callback and generated-link hosts. Provider dashboards are not changed by repository work.

| System | Purpose | Production URL | Local URL | Provider dashboard change |
| --- | --- | --- | --- | --- |
| Google/Gmail OAuth | Connector authorization and code exchange | `https://app.auterim.com/api/connectors/gmail/callback` | `http://localhost:3000/api/connectors/gmail/callback` | Google Cloud Console → APIs & Services → Credentials: add the production callback and retain the local callback for development. |
| Supabase site URL | Application auth links and redirects | `https://app.auterim.com` | `http://localhost:3000` | Supabase Dashboard → Project → Authentication → URL Configuration: set Site URL and redirect allowlist. |
| Supabase invites | Team invite acceptance | `https://app.auterim.com/app?invite=*` | `http://localhost:3000/app?invite=*` | Add both production and local invite redirect patterns to Supabase Auth allowlist. |
| Nango webhook | Connector lifecycle events | `https://app.auterim.com/api/connectors/nango/webhook` | `http://localhost:3000/api/connectors/nango/webhook` | Nango Dashboard → Environment → Webhooks: update the webhook URL; preserve config and connection IDs. |
| Slack | OAuth and connector event delivery | `https://app.auterim.com/api/connectors/nango/webhook` when routed through Nango | `http://localhost:3000/api/connectors/nango/webhook` | Slack API Dashboard → Your Apps → app → OAuth & Permissions / Event Subscriptions / Interactivity: update only URLs configured directly in Slack. |
| Dodo webhook | Billing event delivery | `https://app.auterim.com/api/billing/dodo/webhook` | `http://localhost:3000/api/billing/dodo/webhook` | Dodo Dashboard → Developers/Webhooks: replace the webhook URL; preserve product IDs and plan mappings. |
| Dodo returns | Checkout success/cancel and billing portal return | `https://app.auterim.com/app` and `https://app.auterim.com/pricing`; portal return `https://app.auterim.com/app/settings?billing=returned` | `http://localhost:3000/app`, `http://localhost:3000/pricing`, and `http://localhost:3000/app/settings?billing=returned` | Configure return URLs only where Dodo requires an allowlist. |
| Resend email links | Product actions in application email | `https://app.auterim.com` | `http://localhost:3000` | Resend Dashboard → Domains: verify `auterim.com` and sender identities. |
| Trigger/background task links | Approval and task-result notifications | `https://app.auterim.com/app/approvals` | `http://localhost:3000/app/approvals` | Trigger Dashboard → project environment variables/configuration: update public app URL if configured. |
| Admin authentication | Internal admin login and redirects | `https://admin.auterim.com` | `http://localhost:3000/admin/login` | Vercel domain/env configuration and any auth allowlists must include the admin host; do not point admin auth at the public or app host. |

## Canonical host rules

- `https://auterim.com` is marketing.
- `https://www.auterim.com` permanently redirects to `https://auterim.com`.
- `https://app.auterim.com` is customer software.
- `https://admin.auterim.com` is internal administration.
- `https://portal.auterim.com` is retired and redirects to the app; it is not a canonical environment value.
- Inovense hosts remain compatibility redirects only.
