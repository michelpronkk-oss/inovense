-- Workflow steps use the canonical approval record. The approval keeps the
-- immutable prepared action/continuation; this table only links its lifecycle.
alter table public.os_workflow_steps add column if not exists approval_id text references public.os_approvals(id) on delete set null;
alter table public.os_workflow_steps add column if not exists block_reason text;
create unique index if not exists os_workflow_steps_approval_unique_idx on public.os_workflow_steps (approval_id) where approval_id is not null;
create index if not exists os_workflow_steps_approval_idx on public.os_workflow_steps (workspace_id, approval_id) where approval_id is not null;

-- The original approvals migration predates workspace-aware dedupe. This
-- index preserves one unresolved action approval per workflow step without
-- modifying any existing approval continuation or role policy.
create unique index if not exists os_approvals_workflow_step_pending_unique_idx
  on public.os_approvals (workspace_id, ((continuation_payload->>'workflowStepId')))
  where status = 'pending' and continuation_payload ? 'workflowStepId';
