-- Durable provider intake plus a minimal, workspace-scoped Realtime invalidation projection.
-- This migration is additive. It is intentionally local only; apply through the normal review process.
create table if not exists public.os_provider_events (
  id text primary key,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  connector_id text not null,
  connector_key text not null,
  provider text not null,
  provider_account_id text not null,
  external_event_id text not null,
  event_type text not null,
  entity_type text,
  entity_id text,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  source_mode text not null check (source_mode in ('push','webhook','manual','scheduled','reconciliation','recovery')),
  payload_reference text,
  metadata jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 4096),
  status text not null default 'received' check (status in ('received','queued','processing','retryable','processed','failed','ignored')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  lease_token text,
  lease_until timestamptz,
  processed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, connector_id, external_event_id)
);
create index if not exists os_provider_events_recovery_idx
  on public.os_provider_events(status, available_at, received_at)
  where status in ('received','queued','retryable');
create index if not exists os_provider_events_expired_lease_idx
  on public.os_provider_events(lease_until, received_at) where status = 'processing';
create index if not exists os_provider_events_workspace_recent_idx
  on public.os_provider_events(workspace_id, received_at desc);
alter table public.os_provider_events enable row level security;
revoke all on public.os_provider_events from anon, authenticated;
grant select, insert, update, delete on public.os_provider_events to service_role;

create or replace function public.claim_os_provider_event(p_event_id text, p_lease_token text, p_lease_seconds integer default 900)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare claimed boolean;
begin
  update public.os_provider_events
     set status = 'processing', attempt_count = attempt_count + 1,
         lease_token = p_lease_token,
         lease_until = now() + make_interval(secs => greatest(1, least(p_lease_seconds, 3600))),
         updated_at = now(), last_error_code = null
   where id = p_event_id
     and ((status in ('received','queued','retryable') and available_at <= now())
       or (status = 'processing' and lease_until < now()))
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

create or replace function public.complete_os_provider_event(p_event_id text, p_lease_token text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare changed boolean;
begin
  update public.os_provider_events
     set status = 'processed', processed_at = now(), lease_token = null,
         lease_until = null, updated_at = now(), last_error_code = null
   where id = p_event_id and status = 'processing' and lease_token = p_lease_token
  returning true into changed;
  return coalesce(changed, false);
end;
$$;

create or replace function public.fail_os_provider_event(
  p_event_id text, p_lease_token text, p_error_code text,
  p_permanent boolean default false, p_retry_after_seconds integer default 30
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare changed boolean;
begin
  update public.os_provider_events
     set status = case when p_permanent then 'failed' else 'retryable' end,
         available_at = case when p_permanent then available_at else now() + make_interval(secs => greatest(1, least(p_retry_after_seconds, 3600))) end,
         lease_token = null, lease_until = null, last_error_code = left(regexp_replace(coalesce(p_error_code, 'provider_event_failed'), '[^a-zA-Z0-9_.-]', '_', 'g'), 80),
         updated_at = now()
   where id = p_event_id and status = 'processing' and lease_token = p_lease_token
  returning true into changed;
  return coalesce(changed, false);
end;
$$;
revoke all on function public.claim_os_provider_event(text,text,integer) from public, anon, authenticated;
revoke all on function public.complete_os_provider_event(text,text) from public, anon, authenticated;
revoke all on function public.fail_os_provider_event(text,text,text,boolean,integer) from public, anon, authenticated;
grant execute on function public.claim_os_provider_event(text,text,integer) to service_role;
grant execute on function public.complete_os_provider_event(text,text) to service_role;
grant execute on function public.fail_os_provider_event(text,text,text,boolean,integer) to service_role;

-- Realtime sends only an opaque surface revision. RLS checks membership on the
-- row itself; clients never subscribe to sensitive source tables.
create table if not exists public.os_workspace_realtime_state (
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  surface text not null check (surface in ('dashboard','approvals','workflows','activity','connectors','operators')),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, surface)
);
alter table public.os_workspace_realtime_state enable row level security;
drop policy if exists os_workspace_realtime_state_select_members on public.os_workspace_realtime_state;
create policy os_workspace_realtime_state_select_members on public.os_workspace_realtime_state
  for select to authenticated using (public.is_workspace_member(workspace_id));
revoke all on public.os_workspace_realtime_state from anon, authenticated;
grant select on public.os_workspace_realtime_state to authenticated;
revoke insert, update, delete on public.os_workspace_realtime_state from anon, authenticated;
grant select, insert, update, delete on public.os_workspace_realtime_state to service_role;

create or replace function public.bump_os_workspace_realtime_surface()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare row_workspace text; target_surface text;
begin
  target_surface := tg_argv[0];
  if tg_op = 'DELETE' then row_workspace := to_jsonb(old)->>'workspace_id';
  else row_workspace := to_jsonb(new)->>'workspace_id'; end if;
  if row_workspace is null or target_surface is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  insert into public.os_workspace_realtime_state(workspace_id, surface, revision, updated_at)
  values (row_workspace, target_surface, 1, now())
  on conflict (workspace_id, surface) do update
    set revision = public.os_workspace_realtime_state.revision + 1, updated_at = now();
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function public.bump_os_workspace_realtime_surface() from public, anon, authenticated;

drop trigger if exists trg_realtime_os_approvals on public.os_approvals;
create trigger trg_realtime_os_approvals after insert or update or delete on public.os_approvals for each row execute function public.bump_os_workspace_realtime_surface('approvals');
drop trigger if exists trg_realtime_os_workflow_runs on public.os_workflow_runs;
create trigger trg_realtime_os_workflow_runs after insert or update or delete on public.os_workflow_runs for each row execute function public.bump_os_workspace_realtime_surface('workflows');
drop trigger if exists trg_realtime_os_workflow_steps on public.os_workflow_steps;
create trigger trg_realtime_os_workflow_steps after insert or update or delete on public.os_workflow_steps for each row execute function public.bump_os_workspace_realtime_surface('workflows');
drop trigger if exists trg_realtime_os_workflow_outcomes on public.os_workflow_outcomes;
create trigger trg_realtime_os_workflow_outcomes after insert or update or delete on public.os_workflow_outcomes for each row execute function public.bump_os_workspace_realtime_surface('dashboard');
drop trigger if exists trg_realtime_os_signal_events on public.os_signal_events;
create trigger trg_realtime_os_signal_events after insert or update or delete on public.os_signal_events for each row execute function public.bump_os_workspace_realtime_surface('operators');
drop trigger if exists trg_realtime_os_signal_candidates on public.os_signal_candidates;
create trigger trg_realtime_os_signal_candidates after insert or update or delete on public.os_signal_candidates for each row execute function public.bump_os_workspace_realtime_surface('operators');
drop trigger if exists trg_realtime_os_signal_sync_state on public.os_signal_sync_state;
create trigger trg_realtime_os_signal_sync_state after insert or update or delete on public.os_signal_sync_state for each row execute function public.bump_os_workspace_realtime_surface('connectors');
drop trigger if exists trg_realtime_os_connector_credentials on public.os_connector_credentials;
create trigger trg_realtime_os_connector_credentials after insert or update or delete on public.os_connector_credentials for each row execute function public.bump_os_workspace_realtime_surface('connectors');

-- Supabase projects usually create this publication. Do not fail installs where
-- Realtime is unavailable; production checks must verify the subscription.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'os_workspace_realtime_state') then
    alter publication supabase_realtime add table public.os_workspace_realtime_state;
  end if;
end $$;
