-- Fix: "Could not revoke this invitation." on every revoke after the first
-- one for a given person.
--
-- The live database carries a UNIQUE (workspace_id, email, status)
-- constraint (auto-named os_member_invites_workspace_id_email_status_key)
-- that is NOT defined anywhere in this migration history -- it was added
-- directly against the database outside of migrations. It assumes at most
-- one row can ever exist per (workspace, email, status) tuple, which breaks
-- the normal lifecycle of an invite: revoked/accepted/expired are terminal
-- history states that legitimately repeat over time (invite -> revoke ->
-- invite again -> revoke again is two separate 'revoked' rows for the same
-- person). The correct dedup guarantee -- at most one *active* pending
-- invite per (workspace, email) -- is already enforced by the partial
-- unique index os_member_invites_pending_email_uidx (status = 'pending'
-- only), added in 20260907_os_member_invites_pending_dedup.sql. That index
-- is untouched by this migration.
alter table os_member_invites
  drop constraint if exists os_member_invites_workspace_id_email_status_key;
