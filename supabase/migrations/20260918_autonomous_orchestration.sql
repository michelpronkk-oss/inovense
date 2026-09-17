-- Autonomous Website Knowledge and Growth orchestration lifecycle.
--
-- This is a forward-only, additive migration. It does not delete or rewrite
-- historical runs. The existing state/status columns remain the worker-facing
-- lifecycle; dispatch_status is the provider-facing lifecycle.
begin;

do $$
begin
  if to_regclass('public.os_workspaces') is null
     or to_regclass('public.os_website_crawl_runs') is null
     or to_regclass('public.os_operator_runs') is null then
    raise exception 'Autonomous orchestration requires the workspace, Website crawl, and operator runtime migrations first';
  end if;
end;
$$;

alter table public.os_website_crawl_runs
  add column if not exists dispatch_status text,
  add column if not exists idempotency_key text,
  add column if not exists provider_run_id text,
  add column if not exists dispatch_attempts integer not null default 0,
  add column if not exists dispatch_started_at timestamptz,
  add column if not exists dispatched_at timestamptz,
  add column if not exists worker_started_at timestamptz,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists dispatch_error text,
  add column if not exists next_retry_at timestamptz;

update public.os_website_crawl_runs
set dispatch_status = case
  when state in ('completed', 'partial', 'review_ready') then 'completed'
  when state = 'failed' then 'failed'
  when state = 'cancelled' then 'cancelled'
  when state in ('claimed', 'verifying', 'discovering', 'fetching', 'extracting') then 'running'
  else 'requested'
end
where dispatch_status is null;

update public.os_website_crawl_runs
set idempotency_key = 'website-run:' || id::text
where idempotency_key is null;

alter table public.os_website_crawl_runs
  alter column dispatch_status set default 'requested',
  alter column dispatch_status set not null,
  alter column idempotency_key set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'os_website_crawl_runs_dispatch_status_check') then
    alter table public.os_website_crawl_runs
      add constraint os_website_crawl_runs_dispatch_status_check
      check (dispatch_status in ('requested','dispatching','dispatched','running','completed','failed','dispatch_failed','recoverable','cancelled','superseded'));
  end if;
end;
$$;

create unique index if not exists os_website_crawl_runs_workspace_idempotency_idx
  on public.os_website_crawl_runs(workspace_id, idempotency_key);
create index if not exists os_website_crawl_runs_dispatch_recovery_idx
  on public.os_website_crawl_runs(dispatch_status, next_retry_at, updated_at);
create index if not exists os_website_crawl_runs_provider_idx
  on public.os_website_crawl_runs(provider_run_id)
  where provider_run_id is not null;

alter table public.os_operator_runs
  add column if not exists dispatch_status text,
  add column if not exists idempotency_key text,
  add column if not exists provider_run_id text,
  add column if not exists dispatch_attempts integer not null default 0,
  add column if not exists dispatch_started_at timestamptz,
  add column if not exists dispatched_at timestamptz,
  add column if not exists worker_started_at timestamptz,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists dispatch_error text,
  add column if not exists next_retry_at timestamptz;

update public.os_operator_runs
set dispatch_status = case
  when status = 'completed' then 'completed'
  when status in ('failed', 'blocked') then 'failed'
  when status = 'running' then 'running'
  else 'requested'
end
where dispatch_status is null;

update public.os_operator_runs
set idempotency_key = 'operator-run:' || id
where idempotency_key is null;

alter table public.os_operator_runs
  alter column dispatch_status set default 'requested',
  alter column dispatch_status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'os_operator_runs_dispatch_status_check') then
    alter table public.os_operator_runs
      add constraint os_operator_runs_dispatch_status_check
      check (dispatch_status in ('requested','dispatching','dispatched','running','completed','failed','dispatch_failed','recoverable','cancelled','superseded'));
  end if;
end;
$$;

create unique index if not exists os_operator_runs_workspace_operator_idempotency_idx
  on public.os_operator_runs(workspace_id, operator_key, idempotency_key);
create index if not exists os_operator_runs_dispatch_recovery_idx
  on public.os_operator_runs(dispatch_status, next_retry_at, updated_at);
create index if not exists os_operator_runs_provider_idx
  on public.os_operator_runs(provider_run_id)
  where provider_run_id is not null;

-- A worker claim is the point at which provider dispatch becomes execution.
create or replace function public.claim_os_website_crawl_run(p_run_id uuid, p_lease_token text, p_lease_seconds integer default 900)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare claimed boolean;
begin
  update public.os_website_crawl_runs
     set state = 'claimed',
         dispatch_status = 'running',
         lease_token = p_lease_token,
         lease_until = now() + make_interval(secs => greatest(1, least(p_lease_seconds, 3600))),
         heartbeat_at = now(),
         last_heartbeat_at = now(),
         worker_started_at = coalesce(worker_started_at, now()),
         started_at = coalesce(started_at, now()),
         updated_at = now()
   where id = p_run_id
     and ((state = 'queued' and dispatch_status in ('requested','dispatching','dispatched','dispatch_failed','recoverable'))
       or (state not in ('completed','partial','failed','cancelled') and lease_until < now()))
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

create or replace function public.release_os_website_crawl_run(p_run_id uuid, p_lease_token text, p_state text, p_error_code text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare released boolean;
declare dispatch_state text;
begin
  dispatch_state := case
    when p_state in ('completed', 'partial', 'review_ready') then 'completed'
    when p_state = 'cancelled' then 'cancelled'
    else 'failed'
  end;
  update public.os_website_crawl_runs
     set state = case when p_state in ('completed','partial','failed','cancelled','review_ready') then p_state else 'partial' end,
         dispatch_status = dispatch_state,
         lease_token = null,
         lease_until = null,
         completed_at = case when p_state in ('completed','partial','failed','cancelled','review_ready') then now() else completed_at end,
         error_code = left(regexp_replace(coalesce(p_error_code, ''), '[^a-zA-Z0-9_.-]', '_', 'g'), 80),
         updated_at = now()
  where id = p_run_id
    and state not in ('completed','partial','failed','cancelled')
    and lease_token = p_lease_token
  returning true into released;
  return coalesce(released, false);
end;
$$;

revoke all on function public.claim_os_website_crawl_run(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.release_os_website_crawl_run(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.claim_os_website_crawl_run(uuid,text,integer) to service_role;
grant execute on function public.release_os_website_crawl_run(uuid,text,text,text) to service_role;

commit;
