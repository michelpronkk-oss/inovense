-- Inovense OS state snapshots for preview workspace persistence

create table if not exists os_state_snapshots (
  workspace_id text primary key references os_workspaces(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists os_state_snapshots_updated_at_idx on os_state_snapshots(updated_at desc);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_state_snapshots_updated_at') then
    create trigger trg_os_state_snapshots_updated_at
    before update on os_state_snapshots
    for each row execute function set_updated_at();
  end if;
end $$;

alter table if exists os_state_snapshots enable row level security;

