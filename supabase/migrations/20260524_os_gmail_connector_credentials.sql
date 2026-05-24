-- Gmail connector credential storage and approval payload extensions

create table if not exists os_connector_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references os_workspaces(id) on delete cascade,
  connector_key text not null,
  provider_account_id text,
  provider_email text,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, connector_key)
);

create index if not exists os_connector_credentials_workspace_idx on os_connector_credentials(workspace_id);
create index if not exists os_connector_credentials_subscription_idx on os_connector_credentials(connector_key);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_connector_credentials_updated_at') then
    create trigger trg_os_connector_credentials_updated_at before update on os_connector_credentials for each row execute function set_updated_at();
  end if;
end $$;

alter table if exists os_approvals
  add column if not exists continuation_payload jsonb,
  add column if not exists policy_reason text;

alter table if exists os_connector_credentials enable row level security;
