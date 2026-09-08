-- Controlled-beta operational hardening.
--
-- Three concerns, all deliberately additive:
--   1. Distributed OAuth refresh coordination for rotating-token providers.
--   2. One shared operational provider-failure record (no per-connector counters).
--   3. The indexes the pipeline/queue lag metrics actually read.
--
-- Nothing here stores token material, provider URLs, customer content, or any
-- secret. The refresh lease stores only an opaque random token and an expiry.

-- ── 1. Distributed refresh lease + optimistic credential version ─────────
--
-- The lease makes concurrent refreshes across serverless workers cooperate.
-- credential_version is the compare-and-swap guard that makes a lost race
-- SAFE rather than merely wasteful: a worker holding stale state can never
-- overwrite a newer rotated refresh token, it simply fails its write.

alter table public.os_connector_credentials
  add column if not exists credential_version integer not null default 1,
  add column if not exists refresh_lock_token text,
  add column if not exists refresh_lock_until timestamptz;

create index if not exists os_connector_credentials_refresh_lock_idx
  on public.os_connector_credentials (refresh_lock_until)
  where refresh_lock_until is not null;

-- Acquire a time-bounded refresh lease for exactly one workspace+connector
-- credential. Returns true only if this caller now owns the lease.
--
-- Crash recovery is structural: an expired lease is always reclaimable, so a
-- worker that dies mid-refresh cannot hold the credential forever. The lease
-- length is hard-capped server-side so a caller cannot request a long hold.
create or replace function public.claim_os_connector_refresh_lock(
  p_workspace_id text,
  p_connector_key text,
  p_lock_token text,
  p_lock_seconds integer default 30
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare claimed boolean;
begin
  update public.os_connector_credentials
     set refresh_lock_token = p_lock_token,
         refresh_lock_until = now() + make_interval(secs => greatest(5, least(coalesce(p_lock_seconds, 30), 120)))
   where workspace_id = p_workspace_id
     and connector_key = p_connector_key
     and (refresh_lock_until is null or refresh_lock_until < now())
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

-- Release a lease this caller still owns. A lease already reclaimed by
-- another worker (because this one overran) is left untouched.
create or replace function public.release_os_connector_refresh_lock(
  p_workspace_id text,
  p_connector_key text,
  p_lock_token text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare released boolean;
begin
  update public.os_connector_credentials
     set refresh_lock_token = null,
         refresh_lock_until = null
   where workspace_id = p_workspace_id
     and connector_key = p_connector_key
     and refresh_lock_token = p_lock_token
  returning true into released;
  return coalesce(released, false);
end;
$$;

revoke all on function public.claim_os_connector_refresh_lock(text, text, text, integer) from public;
revoke all on function public.release_os_connector_refresh_lock(text, text, text) from public;
grant execute on function public.claim_os_connector_refresh_lock(text, text, text, integer) to service_role;
grant execute on function public.release_os_connector_refresh_lock(text, text, text) to service_role;

-- ── 2. One shared operational provider-failure record ────────────────────
--
-- One row per workspace + connector + normalized operation category. This is
-- operational telemetry only: it never holds endpoint URLs, request bodies,
-- provider payloads, customer content, or credentials. `last_error_code` is a
-- short normalized safe code (for example "http_429" or "invalid_grant").

create table if not exists public.os_provider_operations (
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  connector_key text not null,
  operation text not null check (operation in ('oauth_refresh', 'read', 'write', 'sync', 'webhook', 'poll', 'outcome_observation')),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error_code text,
  last_failure_kind text,
  consecutive_failures integer not null default 0,
  recent_failure_count integer not null default 0,
  last_429_at timestamptz,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, connector_key, operation)
);

create index if not exists os_provider_operations_workspace_updated_idx
  on public.os_provider_operations (workspace_id, updated_at desc);
create index if not exists os_provider_operations_failing_idx
  on public.os_provider_operations (updated_at desc)
  where consecutive_failures > 0;

-- Atomic failure accounting. Doing this in one statement is what keeps
-- consecutive_failures truthful when several workers fail at the same time.
-- recent_failure_count decays: it only keeps counting inside a rolling
-- window, so an old incident never makes a healthy connector look degraded.
create or replace function public.record_os_provider_failure(
  p_workspace_id text,
  p_connector_key text,
  p_operation text,
  p_error_code text,
  p_failure_kind text,
  p_rate_limited boolean default false,
  p_next_retry_at timestamptz default null,
  p_window_minutes integer default 60
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.os_provider_operations as target (
    workspace_id, connector_key, operation, last_failure_at, last_error_code, last_failure_kind,
    consecutive_failures, recent_failure_count, last_429_at, retry_count, next_retry_at, updated_at
  ) values (
    p_workspace_id, p_connector_key, p_operation, now(), left(coalesce(p_error_code, 'unknown'), 64), left(coalesce(p_failure_kind, 'permanent'), 32),
    1, 1, case when p_rate_limited then now() else null end, 1, p_next_retry_at, now()
  )
  on conflict (workspace_id, connector_key, operation) do update
    set last_failure_at = now(),
        last_error_code = left(coalesce(p_error_code, 'unknown'), 64),
        last_failure_kind = left(coalesce(p_failure_kind, 'permanent'), 32),
        consecutive_failures = target.consecutive_failures + 1,
        recent_failure_count = case
          when target.last_failure_at is null or target.last_failure_at < now() - make_interval(mins => greatest(5, least(coalesce(p_window_minutes, 60), 1440)))
          then 1 else target.recent_failure_count + 1 end,
        last_429_at = case when p_rate_limited then now() else target.last_429_at end,
        retry_count = target.retry_count + 1,
        next_retry_at = p_next_retry_at,
        updated_at = now();
end;
$$;

-- A successful provider call is the only thing that clears failure state.
-- Health therefore recovers on its own after a temporary provider outage; no
-- human has to reset a counter and no reconnect is forced.
create or replace function public.record_os_provider_success(
  p_workspace_id text,
  p_connector_key text,
  p_operation text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.os_provider_operations as target (
    workspace_id, connector_key, operation, last_success_at, consecutive_failures, recent_failure_count, retry_count, next_retry_at, last_error_code, last_failure_kind, updated_at
  ) values (
    p_workspace_id, p_connector_key, p_operation, now(), 0, 0, 0, null, null, null, now()
  )
  on conflict (workspace_id, connector_key, operation) do update
    set last_success_at = now(),
        consecutive_failures = 0,
        recent_failure_count = 0,
        retry_count = 0,
        next_retry_at = null,
        last_error_code = null,
        last_failure_kind = null,
        updated_at = now();
end;
$$;

-- Bounded retention for ephemeral operational rows. Anything healthy and
-- untouched for the retention window is disposable; approvals, execution
-- intents, outcomes and Activity history are never touched here.
create or replace function public.prune_os_provider_operations(
  p_retain_days integer default 30
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare removed integer;
begin
  delete from public.os_provider_operations
   where consecutive_failures = 0
     and updated_at < now() - make_interval(days => greatest(7, least(coalesce(p_retain_days, 30), 365)));
  get diagnostics removed = row_count;
  return removed;
end;
$$;

alter table public.os_provider_operations enable row level security;

create policy os_provider_operations_select_members on public.os_provider_operations
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- There are intentionally no browser mutation policies. Only server-side
-- service-role code records provider operation outcomes.
revoke all on function public.record_os_provider_failure(text, text, text, text, text, boolean, timestamptz, integer) from public;
revoke all on function public.record_os_provider_success(text, text, text) from public;
revoke all on function public.prune_os_provider_operations(integer) from public;
grant execute on function public.record_os_provider_failure(text, text, text, text, text, boolean, timestamptz, integer) to service_role;
grant execute on function public.record_os_provider_success(text, text, text) to service_role;
grant execute on function public.prune_os_provider_operations(integer) to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_provider_operations_updated_at') then
    create trigger trg_os_provider_operations_updated_at before update on public.os_provider_operations for each row execute function set_updated_at();
  end if;
end $$;

-- ── 3. Indexes the lag metrics and the recovery scheduler read ───────────
--
-- Each one backs a query added in this pass. No speculative indexes.

-- Oldest pending approval age, per workspace.
create index if not exists os_approvals_workspace_pending_created_idx
  on public.os_approvals (workspace_id, created_at)
  where status = 'pending';

-- The recovery scheduler's cross-workspace scan for stale executing steps.
create index if not exists os_workflow_steps_executing_updated_idx
  on public.os_workflow_steps (updated_at)
  where status = 'executing';

-- Oldest unprocessed signal candidate age, per workspace.
create index if not exists os_signal_candidates_workspace_created_idx
  on public.os_signal_candidates (workspace_id, created_at)
  where status in ('new', 'routed', 'processing');
