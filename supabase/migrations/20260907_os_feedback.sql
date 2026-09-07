create table if not exists public.os_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  user_id uuid,
  user_email text,
  feedback_type text not null check (feedback_type in ('general', 'connector_request', 'operator_request', 'feature_request', 'bug')),
  message text not null check (char_length(message) between 1 and 5000),
  requested_system text,
  requested_work text,
  page_path text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'planned', 'resolved', 'closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists os_feedback_workspace_created_idx on public.os_feedback(workspace_id, created_at desc);
create index if not exists os_feedback_type_created_idx on public.os_feedback(feedback_type, created_at desc);

alter table public.os_feedback enable row level security;
-- Feedback is created through the authenticated server route. There are no
-- browser policies: workspace members must not be able to browse feedback.

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_feedback_updated_at') then
    create trigger trg_os_feedback_updated_at before update on public.os_feedback for each row execute function set_updated_at();
  end if;
end $$;
