-- Tenant-isolation RLS policies for the core auth/workspace tables.
--
-- All policies are keyed off auth.uid() and validated membership via two
-- SECURITY DEFINER helper functions. Using definer functions (which query
-- os_workspace_members directly, bypassing RLS on that lookup only) avoids
-- the classic recursive-RLS problem where a policy on os_workspace_members
-- would otherwise need to query os_workspace_members again to evaluate
-- itself.
--
-- The service role (used by all existing server-side code paths) bypasses
-- RLS entirely, exactly as before - these policies only constrain access
-- via the anon/authenticated Supabase API roles (i.e. any direct/browser
-- use of the publishable anon key).

create or replace function public.is_workspace_member(p_workspace_id text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from os_workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.status <> 'pending'
      and m.active = true
  );
$$;

create or replace function public.workspace_role_key(p_workspace_id text)
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select m.role_key from os_workspace_members m
  where m.workspace_id = p_workspace_id
    and m.user_id = auth.uid()
    and m.status <> 'pending'
    and m.active = true
  order by case m.role_key
    when 'owner' then 0
    when 'admin' then 1
    when 'reviewer' then 2
    when 'member' then 3
    else 4
  end
  limit 1;
$$;

revoke all on function public.is_workspace_member(text) from public;
revoke all on function public.workspace_role_key(text) from public;
grant execute on function public.is_workspace_member(text) to authenticated;
grant execute on function public.workspace_role_key(text) to authenticated;

-- ─── os_user_profiles ────────────────────────────────────────────────────
drop policy if exists os_user_profiles_select_self on os_user_profiles;
create policy os_user_profiles_select_self on os_user_profiles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists os_user_profiles_insert_self on os_user_profiles;
create policy os_user_profiles_insert_self on os_user_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists os_user_profiles_update_self on os_user_profiles;
create policy os_user_profiles_update_self on os_user_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── os_workspaces ───────────────────────────────────────────────────────
drop policy if exists os_workspaces_select_members on os_workspaces;
create policy os_workspaces_select_members on os_workspaces
  for select to authenticated
  using (public.is_workspace_member(id));

drop policy if exists os_workspaces_update_admins on os_workspaces;
create policy os_workspaces_update_admins on os_workspaces
  for update to authenticated
  using (public.workspace_role_key(id) in ('owner', 'admin'))
  with check (public.workspace_role_key(id) in ('owner', 'admin'));

-- Inserts happen exclusively through provision_initial_workspace()
-- (security definer, bypasses RLS) - no direct insert policy for clients.

-- ─── os_workspace_members ────────────────────────────────────────────────
drop policy if exists os_workspace_members_select on os_workspace_members;
create policy os_workspace_members_select on os_workspace_members
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists os_workspace_members_write_admins on os_workspace_members;
create policy os_workspace_members_write_admins on os_workspace_members
  for all to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_role_key(workspace_id) in ('owner', 'admin'));

-- New membership rows for the caller themself are created exclusively
-- through accept_workspace_invite() / provision_initial_workspace()
-- (security definer, bypasses RLS) - normal clients cannot self-insert a
-- membership row, which is what prevents client-side role escalation.

-- ─── os_workspace_settings ───────────────────────────────────────────────
drop policy if exists os_workspace_settings_select on os_workspace_settings;
create policy os_workspace_settings_select on os_workspace_settings
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists os_workspace_settings_write_admins on os_workspace_settings;
create policy os_workspace_settings_write_admins on os_workspace_settings
  for all to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_role_key(workspace_id) in ('owner', 'admin'));

-- ─── os_member_invites ───────────────────────────────────────────────────
-- Previously RLS-enabled with zero policies (deny-all for anon/authenticated,
-- service role only). Add explicit admin/owner visibility + management on
-- top of that, for defense in depth if this table is ever queried directly
-- with a user-scoped client instead of the service role.
drop policy if exists os_member_invites_select_admins on os_member_invites;
create policy os_member_invites_select_admins on os_member_invites
  for select to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner', 'admin'));

drop policy if exists os_member_invites_write_admins on os_member_invites;
create policy os_member_invites_write_admins on os_member_invites
  for all to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_role_key(workspace_id) in ('owner', 'admin'));
