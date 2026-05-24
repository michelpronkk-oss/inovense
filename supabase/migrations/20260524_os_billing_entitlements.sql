-- Inovense OS billing entitlements + Dodo webhook idempotency

alter table if exists os_workspaces
  add column if not exists plan_tier text not null default 'preview',
  add column if not exists billing_status text not null default 'preview',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists operators_limit integer not null default 1,
  add column if not exists connectors_limit text not null default '0',
  add column if not exists actions_limit integer not null default 0,
  add column if not exists log_retention_days integer not null default 0,
  add column if not exists can_use_real_connectors boolean not null default false,
  add column if not exists can_run_real_actions boolean not null default false,
  add column if not exists support_level text not null default 'none',
  add column if not exists billing_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_workspaces_plan_tier_chk'
  ) then
    alter table os_workspaces
      add constraint os_workspaces_plan_tier_chk
      check (plan_tier in ('preview', 'starter', 'growth', 'operator', 'enterprise'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_workspaces_billing_status_chk'
  ) then
    alter table os_workspaces
      add constraint os_workspaces_billing_status_chk
      check (billing_status in ('preview', 'trialing', 'active', 'past_due', 'canceled'));
  end if;
end $$;

create table if not exists os_billing_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  workspace_id text references os_workspaces(id) on delete set null,
  user_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'received',
  warning_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists os_billing_events_workspace_idx on os_billing_events(workspace_id);
create index if not exists os_billing_events_event_type_idx on os_billing_events(event_type);
create index if not exists os_billing_events_processing_status_idx on os_billing_events(processing_status);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_billing_events_updated_at') then
    create trigger trg_os_billing_events_updated_at before update on os_billing_events for each row execute function set_updated_at();
  end if;
end $$;

alter table if exists os_billing_events enable row level security;

