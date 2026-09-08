-- Central, derived signal-processing state. Source connectors remain the
-- authority. This deliberately stores bounded previews and references, never
-- complete email, chat, ticket, or document bodies.
create table if not exists public.os_signal_events (
  id text primary key,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  connector_key text not null,
  provider text not null,
  source_type text not null,
  source_id text not null,
  source_parent_id text,
  event_type text not null,
  occurred_at timestamptz,
  observed_at timestamptz not null default now(),
  actor text,
  entity_type text,
  entity_id text,
  category text not null,
  content_preview text,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  trust_level text not null default 'untrusted_provider_content',
  created_at timestamptz not null default now(),
  unique (workspace_id, dedupe_key)
);

create index if not exists os_signal_events_workspace_observed_idx on public.os_signal_events (workspace_id, observed_at desc);
create index if not exists os_signal_events_workspace_connector_occurred_idx on public.os_signal_events (workspace_id, connector_key, occurred_at desc);

create table if not exists public.os_signal_candidates (
  id text primary key,
  signal_id text not null references public.os_signal_events(id) on delete cascade,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  operator_key text not null,
  signal_type text not null,
  priority integer not null check (priority between 0 and 100),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  urgency text not null check (urgency in ('low', 'medium', 'high', 'critical')),
  reason_codes jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  recommended_action_types text[] not null default '{}',
  dedupe_key text not null,
  status text not null default 'new' check (status in ('new', 'routed', 'processing', 'surfaced', 'action_proposed', 'suppressed', 'resolved', 'expired')),
  resolved_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, dedupe_key)
);

create index if not exists os_signal_candidates_workspace_status_priority_idx on public.os_signal_candidates (workspace_id, status, priority desc, updated_at desc);
create index if not exists os_signal_candidates_signal_idx on public.os_signal_candidates (signal_id);

-- One state row per workspace + connector. The lease protects cursor writes;
-- the event uniqueness constraint remains the final at-least-once guard.
create table if not exists public.os_signal_sync_state (
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  connector_key text not null,
  cursor jsonb not null default '{}'::jsonb,
  last_success_at timestamptz,
  last_failure_code text,
  lease_token text,
  lease_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, connector_key)
);

create index if not exists os_signal_sync_state_lease_idx on public.os_signal_sync_state (lease_until);

create or replace function public.claim_os_signal_sync_lease(
  p_workspace_id text,
  p_connector_key text,
  p_lease_token text,
  p_lease_seconds integer default 120
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare claimed boolean;
begin
  insert into public.os_signal_sync_state (workspace_id, connector_key, lease_token, lease_until)
  values (p_workspace_id, p_connector_key, p_lease_token, now() + make_interval(secs => greatest(1, least(p_lease_seconds, 900))))
  on conflict (workspace_id, connector_key) do update
    set lease_token = excluded.lease_token,
        lease_until = excluded.lease_until,
        updated_at = now()
    where os_signal_sync_state.lease_until is null or os_signal_sync_state.lease_until < now()
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

alter table public.os_signal_events enable row level security;
alter table public.os_signal_candidates enable row level security;
alter table public.os_signal_sync_state enable row level security;

create policy os_signal_events_select_members on public.os_signal_events
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy os_signal_candidates_select_members on public.os_signal_candidates
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy os_signal_sync_state_select_members on public.os_signal_sync_state
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- There are intentionally no browser mutation policies. Server-side services
-- own ingestion, candidate state, and cursor changes.
grant execute on function public.claim_os_signal_sync_lease(text, text, text, integer) to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_signal_candidates_updated_at') then
    create trigger trg_os_signal_candidates_updated_at before update on public.os_signal_candidates for each row execute function set_updated_at();
  end if;
end $$;
