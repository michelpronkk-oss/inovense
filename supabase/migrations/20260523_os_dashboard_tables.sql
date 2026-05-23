-- Inovense OS dashboard tables
-- All tables are workspace-scoped. Row-level security is enabled but policies
-- are permissive for now (service role is the only writer).

create table if not exists os_agents (
  id            text primary key,
  name          text not null,
  mark          text not null,
  color         text not null,
  template_id   text not null,
  status        text not null default 'idle',
  workspace_id  text not null default 'ws-atlas',
  current_task  text not null default '',
  deployed_at   timestamptz not null default now(),
  config        jsonb not null default '{}',
  stats         jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists os_agent_runs (
  id            text primary key,
  agent_id      text not null references os_agents(id) on delete cascade,
  agent_mark    text not null,
  agent_color   text not null,
  agent_name    text not null,
  workflow_id   text,
  status        text not null default 'running',
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  steps         jsonb not null default '[]',
  approval_id   text,
  output        jsonb,
  triggered_by  text not null default 'manual',
  created_at    timestamptz not null default now()
);

create table if not exists os_workflows (
  id            text primary key,
  name          text not null,
  trigger       text not null,
  agent_id      text not null references os_agents(id) on delete cascade,
  agent_color   text not null,
  agent_label   text not null,
  status        text not null default 'active',
  total_runs    integer not null default 0,
  success_rate  numeric(5,2) not null default 100,
  avg_duration  text not null default '-',
  last_run      text not null default 'never',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists os_approvals (
  id            text primary key,
  type          text not null,
  title         text not null,
  body          text not null,
  agent_id      text not null,
  agent_mark    text not null,
  agent_color   text not null,
  run_id        text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   text
);

create table if not exists os_execution_logs (
  id            text primary key,
  ts            text not null,
  run_id        text not null,
  agent_id      text not null,
  agent_mark    text not null,
  agent_color   text not null,
  event         text not null,
  message       text not null,
  duration      text not null,
  status        text not null,
  created_at    timestamptz not null default now()
);

create table if not exists os_memory_entries (
  id            text primary key,
  type          text not null,
  label         text not null,
  summary       text not null,
  content       text not null,
  tags          jsonb not null default '[]',
  agent_scope   jsonb not null default '[]',
  field_count   integer not null default 0,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create table if not exists os_connectors (
  id            text primary key,
  name          text not null,
  letter        text not null,
  color         text not null,
  category      text not null,
  status        text not null default 'healthy',
  last_sync     text not null default '-',
  sync_freq     text not null default '-',
  permissions   jsonb not null default '[]',
  records       text not null default '',
  connected     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists os_policies (
  id            text primary key,
  name          text not null,
  scope         jsonb not null default '["all"]',
  action        text not null,
  effect        text not null,
  description   text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists os_agent_runs_agent_id_idx on os_agent_runs(agent_id);
create index if not exists os_agent_runs_status_idx on os_agent_runs(status);
create index if not exists os_approvals_status_idx on os_approvals(status);
create index if not exists os_approvals_agent_id_idx on os_approvals(agent_id);
create index if not exists os_execution_logs_agent_id_idx on os_execution_logs(agent_id);
create index if not exists os_execution_logs_run_id_idx on os_execution_logs(run_id);
create index if not exists os_execution_logs_created_at_idx on os_execution_logs(created_at desc);

-- Enable RLS (service role bypasses all policies)
alter table os_agents enable row level security;
alter table os_agent_runs enable row level security;
alter table os_workflows enable row level security;
alter table os_approvals enable row level security;
alter table os_execution_logs enable row level security;
alter table os_memory_entries enable row level security;
alter table os_connectors enable row level security;
alter table os_policies enable row level security;
