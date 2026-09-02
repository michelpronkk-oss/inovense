# Auterim connector testing

## Existing architecture

Auterim uses Trigger.dev for scheduled/background work, not as a second local simulator. Current tasks live in `src/trigger/`:

- `revenue-operator-scan`
- `client-flow-operator-scan`
- `operations-operator-scan`
- `connector-health-check`
- `approval-safety-check`
- `workspace-daily-brief`

The application flow is: Auterim UI/API → operator scan or approval → connector adapter → Nango → provider → Supabase/logs. No separate UI-launched simulator currently exists.

## Run locally

```powershell
cd "C:\Users\miche\Desktop\inovense"
pnpm dev
pnpm trigger:dev
```

`pnpm trigger:dev` runs `npx trigger.dev@latest dev`. Required environment variable names are documented in `.env.example`; do not place secret values in this document. The relevant names are `TRIGGER_SECRET_KEY`, `TRIGGER_PUBLIC_APP_URL`, `NANGO_SECRET_KEY`, `NANGO_HOST`, `NANGO_HUBSPOT_CONFIG_KEY`, `NANGO_WEBHOOK_SECRET`, and the Supabase variables.

## Safe HubSpot read test

Connect HubSpot from `/app/connectors`, then call the read-only diagnostic endpoint with the authenticated workspace context:

```text
GET /api/connectors/nango/test?connectorKey=hubspot&workspaceId=<workspace-id>&userId=<user-id>&userEmail=<user-email>
```

It verifies the stored Auterim connection, Nango credentials, and a read-only HubSpot request for up to three contacts. The response is normalized and never includes tokens or secrets. The connector detail “Test connection” action performs the smaller health check.

## Write testing

HubSpot writes are approval-gated inside `executeHubSpotRevenueActions`, but the generic approval continuation executor currently has no HubSpot write adapter. Do not create contacts with a direct script or curl request. A safe synthetic write test needs to be wired into the existing approval continuation path before it is enabled.

There is currently no delete adapter for HubSpot test records, so no cleanup action is exposed. If a future approved test-write flow is added, it must use a synthetic address, recognizable marker, explicit approval, and a supported cleanup path.

## Troubleshooting

- `disconnected`: verify workspace membership and the database connector row.
- `provider_error`: reconnect HubSpot and check the Nango/HubSpot integration, scopes, and callback configuration.
- Trigger tasks not appearing: verify `TRIGGER_SECRET_KEY`, `TRIGGER_PUBLIC_APP_URL`, and the Trigger project environment.
- Never log OAuth codes, access tokens, refresh tokens, client secrets, or Nango secret keys.
