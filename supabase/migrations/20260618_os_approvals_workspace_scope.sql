-- Scope approval records to workspaces so approval inboxes can use DB truth.

alter table if exists os_approvals
  add column if not exists workspace_id text references os_workspaces(id) on delete cascade,
  add column if not exists resolved_by text,
  add column if not exists policy_reason text,
  add column if not exists continuation_payload jsonb;

update os_approvals
set workspace_id = continuation_payload->>'workspaceId'
where workspace_id is null
  and continuation_payload ? 'workspaceId';

create index if not exists os_approvals_workspace_idx on os_approvals(workspace_id);
create index if not exists os_approvals_workspace_status_idx on os_approvals(workspace_id, status);
create index if not exists os_approvals_created_at_idx on os_approvals(created_at desc);
create index if not exists os_approvals_resolved_at_idx on os_approvals(resolved_at desc);
