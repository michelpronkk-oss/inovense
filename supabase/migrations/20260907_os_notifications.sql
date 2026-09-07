-- High-signal, workspace-scoped notification state. Source systems remain
-- authoritative; this table only tracks presentation/read/dismissal state.
create table if not exists public.os_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('approval_required', 'connector_attention', 'billing_attention', 'trial_ending', 'trial_expired')),
  source_type text not null,
  source_id text not null,
  title text not null,
  description text not null,
  severity text not null check (severity in ('info', 'attention', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  related_route text,
  dedupe_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  dismissed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, dedupe_key)
);

create index if not exists os_notifications_workspace_status_created_idx on public.os_notifications (workspace_id, status, created_at desc);
create index if not exists os_notifications_workspace_unread_idx on public.os_notifications (workspace_id, read_at) where status = 'open' and dismissed_at is null;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_notifications_updated_at') then
    create trigger trg_os_notifications_updated_at before update on public.os_notifications for each row execute function set_updated_at();
  end if;
end $$;

alter table public.os_notifications enable row level security;
-- Browser clients receive no direct write policy. Authenticated server routes
-- verify workspace membership before returning or changing notification state.
