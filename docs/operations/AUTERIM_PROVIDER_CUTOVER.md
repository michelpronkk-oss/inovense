# Auterim provider cutover checklist

This is a manual checklist. No provider dashboard changes were performed.

| Provider | OLD value | NEW value | Action | Validation | Rollback |
| --- | --- | --- | --- | --- | --- |
| Hostinger/DNS apex | Existing Inovense DNS target — VERIFY IN DASHBOARD | `auterim.com` pointing to the approved production target | Add/verify apex DNS. | Resolve DNS and load HTTPS apex. | Restore previous DNS records. |
| Hostinger/DNS www | Existing Inovense www target — VERIFY IN DASHBOARD | `www.auterim.com` → canonical apex or approved Vercel target | Configure explicit www behavior. | Verify one canonical redirect. | Restore old www target. |
| Hostinger/DNS app/admin | Existing subdomain targets — VERIFY IN DASHBOARD | `app.auterim.com`, `admin.auterim.com` | Add records to approved deployment target. Do not create `portal.auterim.com`. | Verify TLS and representative routes. | Restore old subdomain records. |
| Vercel | Existing project linkage | Add Auterim domains; preserve project | Add domains and production/preview env values. | Verify deployment and TLS. | Revert domain assignment or promote previous deployment. |
| Google OAuth | `https://app.inovense.com/api/connectors/gmail/callback` | `https://app.auterim.com/api/connectors/gmail/callback` | Replace authorized origin/callback after DNS is live. | Complete connect/reconnect flow. | Keep old callback temporarily and restore old env override. |
| Supabase Auth | Existing Site URL/allowlist — VERIFY IN DASHBOARD | Site URL `https://app.auterim.com`; invite `https://app.auterim.com/app?invite=*` | Update Site URL and allowlist; preserve localhost. | Send and accept an invite. | Restore prior Site URL/allowlist. |
| Nango | Existing webhook/config — VERIFY IN DASHBOARD | `https://app.auterim.com/api/connectors/nango/webhook` | Update webhook and any callback configured in Nango. Preserve IDs. | Send signed test webhook. | Restore old webhook URL. |
| Slack | Existing callback — VERIFY IN DASHBOARD | Auterim app callback if configured; otherwise no code change | Update only if Slack is configured directly. | OAuth/install and notification test. | Restore old callback. |
| Dodo | Existing webhook/return URLs — VERIFY IN DASHBOARD | Webhook `https://app.auterim.com/api/billing/dodo/webhook`; success/cancel URLs on Auterim hosts | Update URLs only. Do not change product IDs. | Test checkout, cancellation, webhook replay. | Restore old URLs and previous deployment. |
| Resend | Existing domain/senders — VERIFY IN DASHBOARD | Verify `auterim.com`; `hello@`, `support@`, `noreply@auterim.com` | Configure SPF, DKIM, DMARC and sender identities. | Send test emails and inspect delivery logs. | Restore verified sender only while DNS is repaired. |
| Trigger | Existing project/env — VERIFY IN DASHBOARD | Auterim public URL and production env values | Update notification/callback URLs where configured. | Run a test job. | Restore old env values. |

Do not place credentials in this document. Unknown targets must be verified in the relevant dashboard before change.
