-- Connector disconnect + profile preference hardening.
--
-- Run after 20260905_auth_identity_foundation.sql and
-- 20260905_auth_rls_policies.sql. All statements are additive/idempotent.

-- Repair the small cohort provisioned before role_key was populated. The
-- workspace owner is unambiguously an owner; legacy admin labels map to
-- admin until every historical row has been normalized.
update os_workspace_members m
set role_key = 'owner'
from os_workspaces w
where m.workspace_id = w.id
  and m.user_id = w.owner_user_id
  and coalesce(m.role_key, '') <> 'owner';

update os_workspace_members
set role_key = 'admin'
where role_key is null
  and role = 'Operator - Admin';

-- Replace historical seed identity values with the verified Auth identity.
-- This only touches the known placeholder rows; real user-selected names are
-- never overwritten.
update os_workspace_members m
set email = lower(u.email),
    full_name = coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(u.raw_user_meta_data->>'name', ''),
      initcap(replace(split_part(u.email, '@', 1), '.', ' '))
    )
from auth.users u
where m.user_id = u.id
  and (
    lower(coalesce(m.email, '')) = 'admin@workspace.com'
    or lower(coalesce(m.full_name, '')) in ('workspace admin', 'admin')
  );

update os_user_profiles p
set full_name = coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(u.raw_user_meta_data->>'name', ''),
      initcap(replace(split_part(u.email, '@', 1), '.', ' '))
    ),
    initials = upper(left(split_part(u.email, '@', 1), 2))
from auth.users u
where p.user_id = u.id
  and lower(coalesce(p.full_name, '')) in ('workspace admin', 'admin');

-- Workspace identity is public within a workspace and intentionally separate
-- from user identity. Logo files are stored under workspace-assets/<id>/.
alter table os_workspaces
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-assets',
  'workspace-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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
