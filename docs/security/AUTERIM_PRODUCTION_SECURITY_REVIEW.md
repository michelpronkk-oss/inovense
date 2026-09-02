# Auterim production security review

This is a focused launch review, not a security certification.

## Findings

### HIGH — production provider configuration must be cut over manually

The repository still contains legacy provider URL values in local environment configuration. `.env.local` was not modified. Before launch, update production environment values and provider allowlists; do not commit or print credentials.

### MEDIUM — legacy host redirects expand the temporary attack surface

Legacy hosts are recognized only to redirect to canonical Auterim hosts. Keep this until traffic and provider callbacks are verified, then retire according to the deprecation plan.

### MEDIUM — legacy cookies remain accepted

Canonical cookies are preferred and valid legacy cookies are migrated. This preserves users but extends the lifetime of legacy session identifiers. Retire only after telemetry shows zero usage for the documented grace period.

### MEDIUM — external redirects require provider configuration review

OAuth and billing return URLs use configured application URLs. Provider allowlists must be updated before launch to prevent failed callbacks and unsafe misconfiguration.

### LOW — lint warnings remain

Lint passes with 19 warnings, primarily unused values and one image optimization suggestion. No migration-specific security error remains.

## Controls verified

- Secrets are excluded by `.gitignore`; no secret values were added to `.env.example` or migration documents.
- OAuth state is signed and provider tokens are not logged by the migration instrumentation.
- Nango and Dodo webhook signature verification remains in place.
- Session cookies are `httpOnly`, `sameSite: lax`, secure in production, and path-scoped.
- Admin routes remain protected by middleware session verification.
- Migration telemetry records event categories only, never cookie contents, tokens, payloads, or personal data.
- Health endpoint exposes status, environment category, version indicator, and timestamp only.

## Launch checks still required

Verify CSRF behavior for every state-changing browser action, provider redirect allowlists, production secret management, rate limiting, and external dashboard audit logs before launch. These require deployment/provider context not available in the repository.
