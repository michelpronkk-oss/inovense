-- Keep one Revenue workflow per provider conversation while retaining a
-- durable, idempotent action step for each newly observed signal.
alter table public.os_workflow_steps
  add column if not exists source_signal_id text references public.os_signal_events(id) on delete set null;

create unique index if not exists os_workflow_steps_signal_action_uidx
  on public.os_workflow_steps (workflow_id, source_signal_id, action_type)
  where source_signal_id is not null;

create index if not exists os_workflow_steps_source_signal_idx
  on public.os_workflow_steps (workspace_id, source_signal_id)
  where source_signal_id is not null;

create index if not exists os_workflow_runs_workspace_activity_idx
  on public.os_workflow_runs (workspace_id, updated_at desc, created_at desc)
  where parent_workflow_id is null;

-- `executing` approvals remain active: a scan racing an in-flight send must
-- reuse that approval rather than opening another pending action for the same
-- provider message.
create unique index if not exists os_approvals_active_execution_dedupe_uidx
  on public.os_approvals (workspace_id, dedupe_key)
  where dedupe_key is not null and status in ('pending', 'executing', 'approved');
