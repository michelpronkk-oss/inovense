-- Coordinated response plans. These rows reference the existing policy and
-- execution-intent systems; they never replace approvals or provider writes.
create table if not exists public.os_workflow_runs (
  id text primary key,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  operator_key text not null,
  originating_signal_id text references public.os_signal_events(id) on delete set null,
  objective text not null,
  entity_refs jsonb not null default '[]'::jsonb,
  context_refs jsonb not null default '[]'::jsonb,
  priority integer not null check (priority between 0 and 100),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  status text not null check (status in ('planned', 'awaiting_approval', 'partially_approved', 'executing', 'completed', 'partially_completed', 'blocked', 'failed', 'cancelled')),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, dedupe_key)
);
create index if not exists os_workflow_runs_workspace_status_created_idx on public.os_workflow_runs (workspace_id, status, created_at desc);
create index if not exists os_workflow_runs_signal_idx on public.os_workflow_runs (originating_signal_id);

create table if not exists public.os_workflow_steps (
  id text primary key,
  workflow_id text not null references public.os_workflow_runs(id) on delete cascade,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  action_type text not null,
  connector_key text not null,
  target_ref text,
  payload_ref text,
  dependency_step_ids jsonb not null default '[]'::jsonb,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  approval_required boolean not null default true,
  status text not null check (status in ('proposed', 'awaiting_approval', 'approved', 'executing', 'completed', 'blocked', 'rejected', 'failed', 'skipped')),
  execution_intent_id text references public.os_execution_intents(id) on delete set null,
  result_ref text,
  safe_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_id, step_order)
);
create index if not exists os_workflow_steps_workspace_status_idx on public.os_workflow_steps (workspace_id, status, updated_at desc);
create index if not exists os_workflow_steps_intent_idx on public.os_workflow_steps (execution_intent_id) where execution_intent_id is not null;

create table if not exists public.os_workflow_outcomes (
  id text primary key,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  operator_key text not null,
  workflow_id text references public.os_workflow_runs(id) on delete set null,
  signal_id text references public.os_signal_events(id) on delete set null,
  execution_intent_id text references public.os_execution_intents(id) on delete set null,
  outcome_type text not null,
  value numeric,
  unit text,
  attribution_level text not null check (attribution_level in ('observed', 'influenced', 'direct')),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  evidence_refs jsonb not null default '[]'::jsonb,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists os_workflow_outcomes_workspace_observed_idx on public.os_workflow_outcomes (workspace_id, observed_at desc);
create index if not exists os_workflow_outcomes_workflow_idx on public.os_workflow_outcomes (workflow_id);

alter table public.os_workflow_runs enable row level security;
alter table public.os_workflow_steps enable row level security;
alter table public.os_workflow_outcomes enable row level security;
create policy os_workflow_runs_select_members on public.os_workflow_runs for select to authenticated using (public.is_workspace_member(workspace_id));
create policy os_workflow_steps_select_members on public.os_workflow_steps for select to authenticated using (public.is_workspace_member(workspace_id));
create policy os_workflow_outcomes_select_members on public.os_workflow_outcomes for select to authenticated using (public.is_workspace_member(workspace_id));

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_workflow_runs_updated_at') then
    create trigger trg_os_workflow_runs_updated_at before update on public.os_workflow_runs for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_workflow_steps_updated_at') then
    create trigger trg_os_workflow_steps_updated_at before update on public.os_workflow_steps for each row execute function set_updated_at();
  end if;
end $$;
