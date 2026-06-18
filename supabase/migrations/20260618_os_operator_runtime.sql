-- Inovense OS scoped operator runtime foundation
-- Real operator execution state must be workspace-scoped and must not depend on
-- legacy unscoped agent runs or snapshot state.

create table if not exists os_operator_runs (
  id text primary key,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  operator_key text not null,
  trigger_type text not null default 'manual',
  status text not null default 'pending' check (status in ('pending', 'running', 'waiting_for_approval', 'completed', 'failed', 'blocked')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  readiness jsonb not null default '{}'::jsonb,
  risk_level text,
  approval_id text,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists os_operator_run_steps (
  id text primary key,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  run_id text not null references os_operator_runs(id) on delete cascade,
  step_key text not null,
  title text not null,
  status text not null default 'pending',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists os_operator_run_logs (
  id text primary key,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  run_id text not null references os_operator_runs(id) on delete cascade,
  level text not null default 'info',
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists os_operator_outputs (
  id text primary key,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  run_id text not null references os_operator_runs(id) on delete cascade,
  operator_key text not null,
  output_type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default false,
  approval_id text,
  created_at timestamptz not null default now()
);

create table if not exists os_operator_usage_events (
  id text primary key,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  run_id text references os_operator_runs(id) on delete set null,
  operator_key text not null,
  event_type text not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists os_operator_triggers (
  id text primary key,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  operator_key text not null,
  trigger_type text not null,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists os_operator_memory (
  id text primary key,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  operator_key text not null,
  memory_type text not null,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  source_run_id text references os_operator_runs(id) on delete set null,
  approval_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists os_operator_runs_workspace_idx on os_operator_runs(workspace_id);
create index if not exists os_operator_runs_operator_key_idx on os_operator_runs(operator_key);
create index if not exists os_operator_runs_status_idx on os_operator_runs(status);
create index if not exists os_operator_runs_created_at_idx on os_operator_runs(created_at desc);
create index if not exists os_operator_runs_workspace_operator_status_idx on os_operator_runs(workspace_id, operator_key, status);

create index if not exists os_operator_run_steps_workspace_idx on os_operator_run_steps(workspace_id);
create index if not exists os_operator_run_steps_run_idx on os_operator_run_steps(run_id);
create index if not exists os_operator_run_steps_status_idx on os_operator_run_steps(status);
create index if not exists os_operator_run_steps_created_at_idx on os_operator_run_steps(created_at desc);

create index if not exists os_operator_run_logs_workspace_idx on os_operator_run_logs(workspace_id);
create index if not exists os_operator_run_logs_run_idx on os_operator_run_logs(run_id);
create index if not exists os_operator_run_logs_event_type_idx on os_operator_run_logs(event_type);
create index if not exists os_operator_run_logs_created_at_idx on os_operator_run_logs(created_at desc);

create index if not exists os_operator_outputs_workspace_idx on os_operator_outputs(workspace_id);
create index if not exists os_operator_outputs_run_idx on os_operator_outputs(run_id);
create index if not exists os_operator_outputs_operator_key_idx on os_operator_outputs(operator_key);
create index if not exists os_operator_outputs_created_at_idx on os_operator_outputs(created_at desc);

create index if not exists os_operator_usage_events_workspace_idx on os_operator_usage_events(workspace_id);
create index if not exists os_operator_usage_events_run_idx on os_operator_usage_events(run_id);
create index if not exists os_operator_usage_events_operator_key_idx on os_operator_usage_events(operator_key);
create index if not exists os_operator_usage_events_created_at_idx on os_operator_usage_events(created_at desc);

create index if not exists os_operator_triggers_workspace_idx on os_operator_triggers(workspace_id);
create index if not exists os_operator_triggers_operator_key_idx on os_operator_triggers(operator_key);
create index if not exists os_operator_triggers_enabled_idx on os_operator_triggers(enabled);
create index if not exists os_operator_triggers_created_at_idx on os_operator_triggers(created_at desc);

create index if not exists os_operator_memory_workspace_idx on os_operator_memory(workspace_id);
create index if not exists os_operator_memory_operator_key_idx on os_operator_memory(operator_key);
create index if not exists os_operator_memory_approval_status_idx on os_operator_memory(approval_status);
create index if not exists os_operator_memory_created_at_idx on os_operator_memory(created_at desc);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_operator_runs_updated_at') then
    create trigger trg_os_operator_runs_updated_at before update on os_operator_runs for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_operator_triggers_updated_at') then
    create trigger trg_os_operator_triggers_updated_at before update on os_operator_triggers for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_operator_memory_updated_at') then
    create trigger trg_os_operator_memory_updated_at before update on os_operator_memory for each row execute function set_updated_at();
  end if;
end $$;

alter table os_operator_runs enable row level security;
alter table os_operator_run_steps enable row level security;
alter table os_operator_run_logs enable row level security;
alter table os_operator_outputs enable row level security;
alter table os_operator_usage_events enable row level security;
alter table os_operator_triggers enable row level security;
alter table os_operator_memory enable row level security;
