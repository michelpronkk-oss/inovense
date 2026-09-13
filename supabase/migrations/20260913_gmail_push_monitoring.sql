-- Gmail Push reuses os_signal_sync_state for mailbox watch metadata and the
-- history checkpoint. The existing lease makes all push/renewal workers for
-- one workspace+connector serialize without adding a second state table.

create or replace function public.extend_os_signal_sync_lease(
  p_workspace_id text,
  p_connector_key text,
  p_lease_token text,
  p_lease_seconds integer default 900
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare extended boolean;
begin
  update public.os_signal_sync_state
     set lease_until = now() + make_interval(secs => greatest(1, least(coalesce(p_lease_seconds, 900), 900))),
         updated_at = now()
   where workspace_id = p_workspace_id
     and connector_key = p_connector_key
     and lease_token = p_lease_token
     and lease_until > now()
  returning true into extended;
  return coalesce(extended, false);
end;
$$;

-- Advance only while the caller still owns the unexpired lease and the
-- checkpoint is exactly the value it read before syncing. A cursor is never
-- allowed to move backward, even if a notification is delivered out of order.
create or replace function public.persist_gmail_history_checkpoint(
  p_workspace_id text,
  p_lease_token text,
  p_expected_history_id text,
  p_next_history_id text,
  p_cursor_patch jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare persisted boolean;
begin
  if p_next_history_id is null or p_next_history_id !~ '^[0-9]{1,30}$' then
    return false;
  end if;
  if p_expected_history_id is not null and p_expected_history_id !~ '^[0-9]{1,30}$' then
    return false;
  end if;

  update public.os_signal_sync_state
     set cursor = coalesce(cursor, '{}'::jsonb)
           || coalesce(p_cursor_patch, '{}'::jsonb)
           || jsonb_build_object('historyId', p_next_history_id),
         last_success_at = now(),
         last_failure_code = null,
         lease_token = null,
         lease_until = null,
         updated_at = now()
   where workspace_id = p_workspace_id
     and connector_key = 'gmail'
     and lease_token = p_lease_token
     and lease_until > now()
     and (
       (p_expected_history_id is null and cursor->>'historyId' is null)
       or cursor->>'historyId' = p_expected_history_id
     )
     and (
       cursor->>'historyId' is null
       or p_next_history_id::numeric >= (cursor->>'historyId')::numeric
     )
  returning true into persisted;
  return coalesce(persisted, false);
end;
$$;

revoke all on function public.extend_os_signal_sync_lease(text, text, text, integer) from public;
revoke all on function public.persist_gmail_history_checkpoint(text, text, text, text, jsonb) from public;
grant execute on function public.extend_os_signal_sync_lease(text, text, text, integer) to service_role;
grant execute on function public.persist_gmail_history_checkpoint(text, text, text, text, jsonb) to service_role;
