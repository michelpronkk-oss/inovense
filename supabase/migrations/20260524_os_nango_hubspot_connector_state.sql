-- Nango-backed connector state for workspace-scoped production connectors.
-- This does not store provider OAuth tokens; Nango stores credentials.

alter table if exists os_connectors
  add column if not exists workspace_id text references os_workspaces(id) on delete cascade,
  add column if not exists connector_key text,
  add column if not exists provider_config_key text,
  add column if not exists nango_connection_id text,
  add column if not exists provider_account_id text,
  add column if not exists provider_email text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists connected_at timestamptz,
  add column if not exists last_sync_at timestamptz;

create unique index if not exists os_connectors_workspace_connector_key_uidx
  on os_connectors(workspace_id, connector_key)
  where workspace_id is not null and connector_key is not null;

create index if not exists os_connectors_workspace_idx on os_connectors(workspace_id);
create index if not exists os_connectors_nango_connection_idx on os_connectors(nango_connection_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_connectors_updated_at') then
    create trigger trg_os_connectors_updated_at
      before update on os_connectors
      for each row
      execute function set_updated_at();
  end if;
end $$;

