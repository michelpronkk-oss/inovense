type TrialStateRow = { trial_status?: unknown; trial_ends_at?: unknown };

function endTime(row: TrialStateRow): number | null {
  if (typeof row.trial_ends_at !== "string" || !row.trial_ends_at) return null;
  const value = Date.parse(row.trial_ends_at);
  return Number.isFinite(value) ? value : null;
}

/** A stored active marker is current only until its recorded end time. */
export function isAdminTrialActive(row: TrialStateRow, now = Date.now()): boolean {
  if (row.trial_status !== "active") return false;
  const endsAt = endTime(row);
  return endsAt === null || endsAt > now;
}

/** Lifecycle jobs can lag, so the end timestamp also closes an active row. */
export function isAdminTrialExpired(row: TrialStateRow, now = Date.now()): boolean {
  if (row.trial_status === "expired") return true;
  const endsAt = endTime(row);
  return row.trial_status === "active" && endsAt !== null && endsAt <= now;
}

export function isAdminTrialEndingSoon(row: TrialStateRow, now = Date.now(), withinMs = 24 * 60 * 60 * 1000): boolean {
  const endsAt = endTime(row);
  return isAdminTrialActive(row, now) && endsAt !== null && endsAt - now <= withinMs && endsAt > now;
}
