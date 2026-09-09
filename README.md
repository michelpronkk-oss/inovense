# Auterim

Auterim is an AI workforce platform for businesses. It understands the business first, detects where time, money, and opportunities are being lost, explains why, recommends the right AI workforce, deploys it with controls, and measures business impact.

## Product loop

Connect → Understand → Diagnose → Recommend → Deploy → Measure → Improve

## Applications

- Marketing: https://auterim.com
- Application: https://app.auterim.com
- Admin: https://admin.auterim.com
- Client portal: https://portal.auterim.com

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 locally.

## Validation

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

The controlled beta runtime and browser gates can be run with:

```bash
pnpm run test:beta-runtime-final
pnpm exec playwright install chromium   # once per machine/CI image
pnpm run test:browser-smoke
```

The browser smoke starts an isolated local fixture server (no authenticated
session, provider credentials, or production auth bypass). It uses Chromium,
the `390x844` and `1440x900` viewports, and accepts `PLAYWRIGHT_MODULE` and
`POLISH_BROWSER_EXECUTABLE` for non-default installations. The Playwright
config base URL is configurable with `PLAYWRIGHT_BASE_URL`; the fixture smoke
itself binds to a temporary loopback port and does not require environment
secrets.

## Compatibility

Legacy cookies, localStorage/state keys, HubSpot properties, Slack/Nango event identifiers, database plan values, Dodo product IDs, and historical records are intentionally preserved.
