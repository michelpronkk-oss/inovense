-- Connector disconnect + profile preference hardening.
--
-- Run after 20260905_auth_identity_foundation.sql and
-- 20260905_auth_rls_policies.sql. All statements are additive/idempotent.

-- A preference belongs to exactly one signed-in user in one workspace. The
-- primary key already enforces this; these policies make the intended access
-- model explicit for any future user-scoped Supabase reads.
alter table if exists os_dashboard_preferences enable row level security;

drop policy if exists os_dashboard_preferences_select_self on os_dashboard_preferences;
create policy os_dashboard_preferences_select_self on os_dashboard_preferences
  for select to authenticated
  using (
    user_id = auth.uid()
    and public.is_workspace_member(workspace_id)
  );

drop policy if exists os_dashboard_preferences_insert_self on os_dashboard_preferences;
create policy os_dashboard_preferences_insert_self on os_dashboard_preferences
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_workspace_member(workspace_id)
  );

drop policy if exists os_dashboard_preferences_update_self on os_dashboard_preferences;
create policy os_dashboard_preferences_update_self on os_dashboard_preferences
  for update to authenticated
  using (
    user_id = auth.uid()
    and public.is_workspace_member(workspace_id)
  )
  with check (
    user_id = auth.uid()
    and public.is_workspace_member(workspace_id)
  );

-- Connector credentials are secrets. They remain service-role-only: no
-- authenticated browser policy is intentionally created for this table.
alter table if exists os_connector_credentials enable row level security;

-- Connection status is safe for a workspace member to read, but writes stay
-- server-side so a browser cannot forge a healthy connection.
alter table if exists os_connectors enable row level security;
drop policy if exists os_connectors_select_members on os_connectors;
create policy os_connectors_select_members on os_connectors
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- The existing unique keys on (workspace_id, connector_key) keep one
-- credential / managed connection per integration in each workspace.
