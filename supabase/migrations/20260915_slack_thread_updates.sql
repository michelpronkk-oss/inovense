-- Durable Slack thread delivery claims. Provider events and canonical signals
-- are intentionally separate: this ledger prevents the app_mention and
-- message.channels pair from producing two replies.
create table if not exists public.os_slack_thread_updates (
  id text primary key,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  connector_id text not null,
  channel_id text not null,
  source_message_ts text not null,
  thread_ts text not null,
  update_type text not null,
  dedupe_key text not null unique,
  status text not null check (status in ('pending', 'processing', 'retryable', 'sent', 'failed', 'ignored')),
  attempt_count integer not null default 0,
  lease_token text,
  lease_until timestamptz,
  reply_ts text,
  last_error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, channel_id, source_message_ts, update_type)
);

create index if not exists os_slack_thread_updates_recovery_idx
  on public.os_slack_thread_updates (status, lease_until, updated_at);
create index if not exists os_slack_thread_updates_source_idx
  on public.os_slack_thread_updates (workspace_id, channel_id, source_message_ts);

alter table public.os_slack_thread_updates enable row level security;
create policy os_slack_thread_updates_select_members on public.os_slack_thread_updates
  for select to authenticated using (public.is_workspace_member(workspace_id));

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_slack_thread_updates_updated_at') then
    create trigger trg_os_slack_thread_updates_updated_at before update on public.os_slack_thread_updates
      for each row execute function set_updated_at();
  end if;
end $$;

create or replace function public.claim_os_slack_thread_update(
  p_id text,
  p_workspace_id text,
  p_connector_id text,
  p_channel_id text,
  p_source_message_ts text,
  p_thread_ts text,
  p_update_type text,
  p_dedupe_key text,
  p_metadata jsonb,
  p_lease_token text,
  p_lease_seconds integer default 300
) returns table(claimed boolean, status text, reply_ts text, attempt_count integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_row public.os_slack_thread_updates%rowtype;
begin
  insert into public.os_slack_thread_updates (
    id, workspace_id, connector_id, channel_id, source_message_ts, thread_ts,
    update_type, dedupe_key, status, metadata
  ) values (
    p_id, p_workspace_id, p_connector_id, p_channel_id, p_source_message_ts, p_thread_ts,
    p_update_type, p_dedupe_key, 'pending', coalesce(p_metadata, '{}'::jsonb)
  ) on conflict (dedupe_key) do nothing;

  select * into current_row from public.os_slack_thread_updates
    where dedupe_key = p_dedupe_key and workspace_id = p_workspace_id for update;
  if not found then return query select false, 'missing', null::text, 0; return; end if;
  if current_row.status = 'sent' then return query select false, current_row.status, current_row.reply_ts, current_row.attempt_count; return; end if;
  if current_row.status = 'processing' and current_row.lease_until is not null and current_row.lease_until > now() then
    return query select false, current_row.status, current_row.reply_ts, current_row.attempt_count; return;
  end if;

  update public.os_slack_thread_updates set
    status = 'processing', attempt_count = current_row.attempt_count + 1,
    lease_token = p_lease_token, lease_until = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 3600))),
    last_error_code = null, metadata = coalesce(p_metadata, metadata), updated_at = now()
  where id = current_row.id;
  return query select true, 'processing'::text, current_row.reply_ts, current_row.attempt_count + 1;
end;
$$;

revoke all on function public.claim_os_slack_thread_update(text, text, text, text, text, text, text, text, jsonb, text, integer) from public;
grant execute on function public.claim_os_slack_thread_update(text, text, text, text, text, text, text, text, jsonb, text, integer) to service_role;
