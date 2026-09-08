-- Founder/admin annotations for the internal System Map. Notes are scoped to
-- one real workspace and are only read/written through authenticated admin routes.
create table if not exists public.os_admin_system_map_notes (
  id text primary key,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  node_id text,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1000),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists os_admin_system_map_notes_workspace_updated_idx on public.os_admin_system_map_notes (workspace_id, updated_at desc);
create index if not exists os_admin_system_map_notes_workspace_node_idx on public.os_admin_system_map_notes (workspace_id, node_id) where node_id is not null;
alter table public.os_admin_system_map_notes enable row level security;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_admin_system_map_notes_updated_at') then
    create trigger trg_os_admin_system_map_notes_updated_at before update on public.os_admin_system_map_notes for each row execute function set_updated_at();
  end if;
end $$;
