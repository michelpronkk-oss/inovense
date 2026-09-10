-- Durable ownership and handoff metadata for the existing cross-connector
-- workflow model. This does not create a second workflow subsystem and does
-- not authorize any provider action by itself.
alter table public.os_workflow_runs
  add column if not exists primary_owner text,
  add column if not exists supporting_owner text,
  add column if not exists parent_workflow_id text references public.os_workflow_runs(id) on delete set null,
  add column if not exists handoff_reason text,
  add column if not exists return_path jsonb not null default '[]'::jsonb;

create index if not exists os_workflow_runs_parent_idx
  on public.os_workflow_runs (workspace_id, parent_workflow_id)
  where parent_workflow_id is not null;

create index if not exists os_workflow_runs_owner_idx
  on public.os_workflow_runs (workspace_id, primary_owner, supporting_owner);
