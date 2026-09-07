-- Enforce at most one active pending invite per (workspace, email).
--
-- Application logic in src/app/app/team/actions.ts already reuses an
-- existing pending/expired invite instead of inserting a new one, but this
-- partial unique index is the hard guarantee against a race (two concurrent
-- "Invite member" submissions for the same email) ever leaving two active
-- pending invites for the same person. Accepted/revoked/expired history
-- rows are unrestricted since the predicate only covers status = 'pending'.
create unique index if not exists os_member_invites_pending_email_uidx
  on os_member_invites (workspace_id, lower(email))
  where status = 'pending';
