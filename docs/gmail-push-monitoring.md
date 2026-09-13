# Gmail near-real-time monitoring setup

Gmail Push is an event trigger, not a second Revenue implementation. The webhook authenticates Pub/Sub and queues identifiers; the Trigger task reads Gmail history, fetches current Inbox messages, and sends those messages through `scanRevenueOpportunities`. The same Revenue filters, dedupe, workflow resolution, approval policy, and prepared-action path continue to apply. Nothing in this path sends customer email automatically.

The hourly `revenue-operator-daily-scan` remains the reconciliation fallback, and **Check now** remains the user-triggered force-refresh. Gmail push notifications can be delayed or dropped, so both remain necessary. The app currently polls Revenue status every 15 seconds to surface approvals and monitoring health without adding a new realtime channel.

## Before deployment

1. In the Google Cloud project associated with the `GOOGLE_CLIENT_ID`, enable the Gmail API and Pub/Sub API.
2. Create a Pub/Sub topic, for example `auterim-gmail-inbox`. Use the same project as `GOOGLE_CLOUD_PROJECT_ID`; Gmail requires the topic project and the project used by `users.watch` to match.
3. Grant `gmail-api-push@system.gserviceaccount.com` the **Pub/Sub Publisher** role on that topic. Gmail does not publish until this grant exists.
4. Create a push-auth service account in that project, for example `gmail-pubsub-push@PROJECT_ID.iam.gserviceaccount.com`. Do not create or commit a key for it; Pub/Sub mints the signed OIDC token.
5. Grant the project's Pub/Sub service agent `roles/iam.serviceAccountTokenCreator` on the push-auth service account. The identity creating the subscription also needs permission to attach/use that service account (typically `roles/iam.serviceAccountUser`).
For a new Cloud project, these are the corresponding setup commands (PowerShell; replace the all-caps placeholders):

```powershell
gcloud services enable gmail.googleapis.com pubsub.googleapis.com --project=PROJECT_ID
gcloud pubsub topics create auterim-gmail-inbox --project=PROJECT_ID
gcloud pubsub topics add-iam-policy-binding auterim-gmail-inbox `
  --project=PROJECT_ID `
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com `
  --role=roles/pubsub.publisher
gcloud iam service-accounts create gmail-pubsub-push `
  --project=PROJECT_ID `
  --display-name="Auterim Gmail Pub/Sub push authentication"
gcloud projects describe PROJECT_ID --format="value(projectNumber)"
gcloud iam service-accounts add-iam-policy-binding `
  gmail-pubsub-push@PROJECT_ID.iam.gserviceaccount.com `
  --project=PROJECT_ID `
  --member=serviceAccount:service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com `
  --role=roles/iam.serviceAccountTokenCreator
gcloud iam service-accounts add-iam-policy-binding `
  gmail-pubsub-push@PROJECT_ID.iam.gserviceaccount.com `
  --project=PROJECT_ID `
  --member=user:DEPLOYER_EMAIL `
  --role=roles/iam.serviceAccountUser
```

The account running `gcloud pubsub subscriptions create` must be the named `DEPLOYER_EMAIL` or have equivalent `iam.serviceAccounts.actAs` permission. Confirm the Pub/Sub service agent has been provisioned before adding its IAM binding; if needed, create the service identity with `gcloud beta services identity create --service=pubsub.googleapis.com --project=PROJECT_ID`.

6. Apply the database migration before deploying the app or Trigger tasks:

   ```powershell
   npx supabase@latest db push
   ```

7. Configure the values below in **both Vercel (Production)** and **Trigger.dev (Production)**. Use the exact same `CONNECTOR_TOKEN_ENCRYPTION_KEY` value already used by the running application; this change does not generate or rotate it.

   | Variable | Example / requirement |
   | --- | --- |
   | `GOOGLE_CLOUD_PROJECT_ID` | Project ID of the Google OAuth client |
   | `GMAIL_PUBSUB_TOPIC` | `projects/PROJECT_ID/topics/auterim-gmail-inbox` |
   | `GMAIL_PUBSUB_SUBSCRIPTION` | `projects/PROJECT_ID/subscriptions/auterim-gmail-inbox-push` |
   | `GMAIL_PUBSUB_PUSH_AUDIENCE` | `https://app.auterim.com/api/connectors/gmail/push` |
   | `GMAIL_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL` | The push-auth service account email |
   | `CONNECTOR_TOKEN_ENCRYPTION_KEY` | The same current production key in Vercel and Trigger.dev |
   | Existing Gmail/Supabase values | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
   | Trigger runtime values | Existing `TRIGGER_SECRET_KEY` and the production Trigger project configuration |

   Do not set a different token-encryption key in Trigger. Gmail tokens already stored by the web app must decrypt in the Trigger task.

8. Create the authenticated push subscription after the service-account bindings and environment variables are in place:

   ```powershell
   gcloud pubsub subscriptions create auterim-gmail-inbox-push `
     --project=PROJECT_ID `
     --topic=auterim-gmail-inbox `
     --push-endpoint=https://app.auterim.com/api/connectors/gmail/push `
     --push-auth-service-account=gmail-pubsub-push@PROJECT_ID.iam.gserviceaccount.com `
     --push-auth-token-audience=https://app.auterim.com/api/connectors/gmail/push
   ```

   Set `GMAIL_PUBSUB_SUBSCRIPTION` to the full resource name returned by the command. The endpoint accepts only this exact subscription resource and rejects resources from another project.
9. Deploy the Next.js app and Trigger.dev tasks only after the migration and matching production environment variables are in place. Newly connected Gmail accounts register their watch automatically. Existing Gmail accounts are picked up by the daily renewal task after deployment; for immediate setup, reconnect/reauthorize the Gmail integration or use a one-off invocation of `gmail-watch-renewal`.

   ```powershell
   pnpm build
   npx trigger.dev@latest deploy
   ```

   Deploy the web app through its normal Vercel production flow; do not treat a local build as proof that Pub/Sub production IAM is configured.

## Push authentication and delivery

The webhook requires Pub/Sub's authenticated-push bearer token. It verifies Google's OIDC signature against Google's JWKS and checks issuer, audience, expiry, verified email, and the exact configured service-account email. It also checks the exact subscription resource in the Pub/Sub envelope. It never accepts a sender-provided workspace ID. The account address is matched to stored connector credentials on the server; missing or ambiguous mappings are acknowledged without enqueueing.

The endpoint only queues the account email, history ID, Pub/Sub message ID, and subscription resource. It does not accept or enqueue email bodies, access tokens, or refresh tokens. Trigger task idempotency is keyed to the Pub/Sub message ID, and a per-mailbox lease serializes renewal and history sync.

## History safety

`os_signal_sync_state.cursor` stores `historyId`, watch status/expiration, last event, and last sync time. Migration `20260913_gmail_push_monitoring.sql` adds a lease-extension operation and a service-role-only compare-and-set checkpoint operation. The checkpoint advances only while the task owns the unexpired mailbox lease, only when the saved checkpoint still matches, and never to a numerically lower Gmail history ID.

History pages are fully collected before candidate messages are processed. A message is fetched only if the history entry adds it or explicitly adds the `INBOX` label, and its current Gmail labels are checked again. Revenue processing uses batches of at most 20 and only then advances the checkpoint. If Gmail returns 404 because the checkpoint expired, the task captures a current profile history boundary, runs the same canonical recent Revenue reconciliation, then advances to that boundary; subsequent changes remain above it. A failed scan never advances the checkpoint.

This is at-least-once processing. The existing Revenue message/thread dedupe and database workflow/approval uniqueness remain the final guards when push races a scheduled or manual scan.

## Local verification

Run migrations against a disposable/local Supabase project and configure local OAuth, Supabase, connector encryption, Trigger.dev, and the five Gmail push variables. Use:

```powershell
pnpm test:gmail-push
pnpm test:revenue-operator
pnpm test:revenue-lifecycle
npx trigger.dev@latest dev
```

Pub/Sub cannot push to an ordinary localhost address. For an end-to-end local webhook test, use a temporary HTTPS tunnel and configure the exact public URL as the token audience and subscription endpoint; do not expose a development server publicly without authentication. A safer smoke test is to invoke the `gmail-push-process` task from the Trigger.dev dashboard with the documented safe payload shape, using an account and history ID from a non-production test mailbox.

The task payload shape for that test is:

```json
{
  "emailAddress": "founder-test@example.com",
  "historyId": "123456",
  "pubsubMessageId": "manual-test-unique-id",
  "subscription": "projects/PROJECT_ID/subscriptions/auterim-gmail-inbox-push"
}
```

Use the exact connected test Gmail account and a Gmail profile/history ID newer than the saved checkpoint. A stale history ID should be ignored; do not paste tokens, message content, or `workspaceId` into the payload.

## Live verification

1. Confirm the database migration is applied, the task deployment is current, both production environments have matching configuration, and the Pub/Sub subscription shows no delivery/authentication errors.
2. Confirm Revenue status displays **Inbox monitoring · Live**, a watch expiration, and the hourly fallback health.
3. Send a new external test message to the connected mailbox. It should appear in the activity/approval UI on its existing polling refresh without clicking **Check now**.
4. Inspect Trigger task `gmail-push-process`: `gmail_push_received` → `gmail_history_sync_started` → `gmail_history_message_found` when Inbox messages were found → canonical Revenue events → `gmail_history_checkpoint_advanced`.
5. Confirm exactly one logical workflow/approval for the message and confirm it remains pending human review. Do not approve it as part of the push smoke test.
6. Confirm Pub/Sub reports a successful 2xx delivery and that the mailbox checkpoint only moved forward.

## Upstream requirements

- [Gmail API push notifications](https://developers.google.com/workspace/gmail/api/guides/push) — same-project topic, publisher grant, watch expiry/renewal, and delayed/dropped delivery behavior.
- [Gmail `users.watch`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch) and [history list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list) — watch filters, expiration, pagination, and expired history behavior.
- [Authenticated Pub/Sub push](https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions) — OIDC token validation and service-account grants.
- [Create a Pub/Sub push subscription](https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create) — command-line setup flags.
