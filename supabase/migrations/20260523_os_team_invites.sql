-- Inovense OS team invites + profile/settings persistence

alter table if exists os_policies
  add column if not exists category text not null default 'general',
  add column if not exists applies_to text not null default 'All operators',
  add column if not exists reviewer_role text,
  add column if not exists limit_value text;

create table if not exists os_workspaces (
  id text primary key,
  name text not null,
  environment text not null default 'production',
  region text not null default 'eu-west-1',
  plan text not null default 'Inovense OS - Growth',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists os_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  full_name text not null,
  role_label text not null default 'Operator - Viewer',
  initials text not null default 'OP',
  notification_approvals boolean not null default true,
  notification_digest boolean not null default true,
  notification_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists os_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references os_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text,
  role text not null check (role in ('Operator - Admin','Operator - Reviewer','Operator - Viewer')),
  access jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('online','offline','pending')),
  active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table if not exists os_workspace_settings (
  workspace_id text primary key references os_workspaces(id) on delete cascade,
  approval_policy jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists os_dashboard_preferences (
  workspace_id text not null references os_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  time_range text not null default '7d' check (time_range in ('24h','7d','30d','quarter')),
  view_mode text not null default 'operator' check (view_mode in ('operator','workflow')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists os_member_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references os_workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('Operator - Admin','Operator - Reviewer','Operator - Viewer')),
  permissions jsonb not null default '[]'::jsonb,
  invited_by uuid references auth.users(id) on delete set null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending','sent','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists os_email_templates (
  key text primary key,
  subject text not null,
  html_body text not null,
  text_body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists os_email_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id text references os_workspaces(id) on delete cascade,
  invite_id uuid references os_member_invites(id) on delete cascade,
  template_key text not null references os_email_templates(key),
  to_email text not null,
  subject text not null,
  html_body text not null,
  text_body text not null,
  provider text not null default 'resend',
  status text not null default 'queued' check (status in ('queued','sending','sent','failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_workspaces_updated_at') then
    create trigger trg_os_workspaces_updated_at before update on os_workspaces for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_user_profiles_updated_at') then
    create trigger trg_os_user_profiles_updated_at before update on os_user_profiles for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_workspace_members_updated_at') then
    create trigger trg_os_workspace_members_updated_at before update on os_workspace_members for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_workspace_settings_updated_at') then
    create trigger trg_os_workspace_settings_updated_at before update on os_workspace_settings for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_dashboard_preferences_updated_at') then
    create trigger trg_os_dashboard_preferences_updated_at before update on os_dashboard_preferences for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_member_invites_updated_at') then
    create trigger trg_os_member_invites_updated_at before update on os_member_invites for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_email_templates_updated_at') then
    create trigger trg_os_email_templates_updated_at before update on os_email_templates for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_email_outbox_updated_at') then
    create trigger trg_os_email_outbox_updated_at before update on os_email_outbox for each row execute function set_updated_at();
  end if;
end $$;

create index if not exists os_workspace_members_workspace_idx on os_workspace_members(workspace_id);
create index if not exists os_workspace_members_user_idx on os_workspace_members(user_id);
create index if not exists os_member_invites_workspace_status_idx on os_member_invites(workspace_id, status);
create index if not exists os_member_invites_email_idx on os_member_invites(lower(email));
create index if not exists os_email_outbox_status_idx on os_email_outbox(status, created_at);

alter table os_workspaces enable row level security;
alter table os_user_profiles enable row level security;
alter table os_workspace_members enable row level security;
alter table os_workspace_settings enable row level security;
alter table os_dashboard_preferences enable row level security;
alter table os_member_invites enable row level security;
alter table os_email_templates enable row level security;
alter table os_email_outbox enable row level security;

insert into os_email_templates (key, subject, html_body, text_body)
values (
  'team_invite_v1',
  'You are invited to Inovense OS',
  '<html><body><p>Invite template managed by app action.</p></body></html>',
  'You are invited to Inovense OS.'
)
on conflict (key) do update
set subject = excluded.subject,
    html_body = excluded.html_body,
    text_body = excluded.text_body,
    updated_at = now();
