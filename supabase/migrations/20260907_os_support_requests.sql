create table if not exists public.os_support_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  user_id uuid,
  user_email text,
  topic text not null check (topic in ('account', 'connector', 'operator', 'billing', 'bug', 'other')),
  message text not null check (char_length(message) between 1 and 5000),
  page_path text not null,
  status text not null default 'open' check (status in ('open', 'in_review', 'waiting', 'resolved', 'closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists os_support_requests_workspace_created_idx on public.os_support_requests(workspace_id, created_at desc);
create index if not exists os_support_requests_status_created_idx on public.os_support_requests(status, created_at desc);

alter table public.os_support_requests enable row level security;
-- Requests are created and reviewed through authenticated server paths. No
-- browser policy exposes support submissions to workspace members.

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_support_requests_updated_at') then
    create trigger trg_os_support_requests_updated_at before update on public.os_support_requests for each row execute function set_updated_at();
  end if;
end $$;
