/**
 * Safe, dependency-free migration telemetry.
 * Only event categories are recorded; no cookie, token, or user data is logged.
 */
const emitted = new Set<string>();

export type LegacyMigrationEvent =
  | "legacy_admin_cookie_used"
  | "legacy_app_cookie_used"
  | "legacy_storage_migrated"
  | "legacy_dev_user_migrated"
  | "legacy_host_redirect_used"
  | "migration_fallback_failed";

export function reportLegacyMigrationEvent(event: LegacyMigrationEvent): void {
  if (emitted.has(event)) return;
  emitted.add(event);
  console.info(`[auterim-migration] ${event}`);
}
