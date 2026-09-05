-- Make company memory explicitly workspace-scoped. Historical prototype
-- entries remain untouched (workspace_id null); all new Auterim memory is
-- written and read only through the owning workspace.

alter table os_memory_entries
  add column if not exists workspace_id text references os_workspaces(id) on delete cascade;

create index if not exists os_memory_entries_workspace_updated_idx
  on os_memory_entries(workspace_id, updated_at desc);

alter table os_memory_entries enable row level security;

drop policy if exists os_memory_entries_select_members on os_memory_entries;
create policy os_memory_entries_select_members on os_memory_entries
  for select to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id));

-- Browser writes are intentionally not enabled. Memory is created only by
-- trusted onboarding and approved operator flows, preserving provenance.
