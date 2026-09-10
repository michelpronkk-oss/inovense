-- Extends the existing workflow graph with one authoritative workforce
-- ownership and return-path contract. No parallel workflow system is created.
alter table public.os_workflow_runs
  add column if not exists parent_primary_owner text,
  add column if not exists supporting_operator text,
  add column if not exists supporting_operators jsonb not null default '[]'::jsonb,
  add column if not exists requested_outcome text,
  add column if not exists relevant_context jsonb not null default '{}'::jsonb,
  add column if not exists customer_impact text,
  add column if not exists deadline timestamptz,
  add column if not exists external_communication_allowed boolean not null default false,
  add column if not exists external_communication_owner text,
  add column if not exists return_condition text,
  add column if not exists dependency_state text not null default 'none',
  add column if not exists handoff_status text not null default 'none',
  add column if not exists result_evidence jsonb not null default '{}'::jsonb,
  add column if not exists ownership_transfers jsonb not null default '[]'::jsonb,
  add column if not exists source_problem_key text;

create index if not exists os_workflow_runs_problem_idx
  on public.os_workflow_runs (workspace_id, source_problem_key)
  where source_problem_key is not null;

create index if not exists os_workflow_runs_supporting_idx
  on public.os_workflow_runs (workspace_id, supporting_operator, dependency_state)
  where supporting_operator is not null;
