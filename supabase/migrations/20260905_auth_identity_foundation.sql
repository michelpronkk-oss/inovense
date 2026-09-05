-- Auterim auth foundation: role model, active-workspace tracking, onboarding
-- state, and atomic workspace provisioning.
--
-- Naming note: the task spec assumed a table named `os_team_invites`. The
-- actual existing invite table (created in 20260523_os_team_invites.sql) is
-- named `os_member_invites`. This migration and the invite-acceptance RPC
-- below build on `os_member_invites` as-is rather than introducing a
-- duplicate table.
--
-- This migration is additive and backward compatible:
--   * `os_workspace_members.role` (legacy label) is kept unchanged.
--   * `os_user_profiles.workspace_id` is kept unchanged (still NOT NULL) for
--     compatibility, but is now documented as a legacy/last-known pointer,
--     NOT an authorization source. `last_active_workspace_id` is the new
--     authoritative "current active workspace" preference, validated on
--     every read against real membership (see requireWorkspaceMember /
--     resolveActiveWorkspaceId in src/lib/server/workspace-access.ts).

-- ─── Role model ─────────────────────────────────────────────────────────
alter table os_workspace_members
  add column if not exists role_key text;

update os_workspace_members
set role_key = case role
  when 'Operator - Admin' then 'admin'
  when 'Operator - Reviewer' then 'reviewer'
  when 'Operator - Viewer' then 'viewer'
  else 'member'
end
where role_key is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'os_workspace_members_role_key_chk') then
    alter table os_workspace_members
      add constraint os_workspace_members_role_key_chk
      check (role_key in ('owner', 'admin', 'reviewer', 'member', 'viewer'));
  end if;
end $$;

alter table os_workspace_members
  alter column role_key set default 'member';

alter table os_workspace_members
  alter column role_key set not null;

comment on column os_workspace_members.role_key is
  'Authoritative role for server-side authorization (owner/admin/reviewer/member/viewer). role_key = owner marks the workspace creator/highest authority. The legacy "role" text label is retained for existing UI copy only and must not be used for authorization decisions.';

-- ─── Membership uniqueness ──────────────────────────────────────────────
-- (workspace_id, email) unique constraint already exists. Add
-- (workspace_id, user_id) as well so a verified user can never end up with
-- two membership rows in the same workspace.
create unique index if not exists os_workspace_members_workspace_user_uidx
  on os_workspace_members (workspace_id, user_id)
  where user_id is not null;

-- ─── Case-insensitive email normalization ───────────────────────────────
update os_workspace_members set email = lower(email) where email <> lower(email);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'os_workspace_members_email_lower_chk') then
    alter table os_workspace_members
      add constraint os_workspace_members_email_lower_chk
      check (email = lower(email));
  end if;
end $$;

update os_member_invites set email = lower(email) where email <> lower(email);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'os_member_invites_email_lower_chk') then
    alter table os_member_invites
      add constraint os_member_invites_email_lower_chk
      check (email = lower(email));
  end if;
end $$;

-- ─── Workspace: owner pointer + onboarding state ────────────────────────
alter table os_workspaces
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_version integer not null default 1,
  add column if not exists onboarding_data jsonb not null default '{}'::jsonb;

comment on column os_workspaces.onboarding_completed_at is
  'Authoritative server-side onboarding completion marker for this workspace. Client/local state may cache this value but must never be treated as authoritative - always re-check this column server-side before allowing access past /app/onboarding.';

-- ─── Profile: last active workspace (legacy-compatible) ─────────────────
alter table os_user_profiles
  add column if not exists last_active_workspace_id text references os_workspaces(id) on delete set null;

update os_user_profiles
set last_active_workspace_id = workspace_id
where last_active_workspace_id is null;

comment on column os_user_profiles.workspace_id is
  'LEGACY column, retained for backward compatibility. Do NOT use for authorization or as the source of truth for workspace membership - os_workspace_members is authoritative. Treat this column as an initial/legacy workspace pointer only. Use last_active_workspace_id for the user''s current active-workspace preference (always re-validated against os_workspace_members before use).';

comment on column os_user_profiles.last_active_workspace_id is
  'User''s last active workspace preference. Must always be re-validated against os_workspace_members before being trusted (see resolveActiveWorkspaceId / setActiveWorkspace in src/lib/server/workspace-access.ts). Never accept an arbitrary workspace id here without a membership check.';

-- ─── Atomic workspace provisioning ───────────────────────────────────────
-- Runs as the signed-in user (security definer, but auth.uid() must resolve
-- to a real authenticated caller - see src/lib/server/provisioning.ts for
-- why this must be invoked with a user-scoped Supabase client, not the
-- service-role client). Idempotent: if the caller already owns a
-- provisioned workspace, returns it instead of creating a duplicate.
create or replace function public.provision_initial_workspace(
  p_full_name text default null,
  p_company_name text default null
)
returns table (
  workspace_id text,
  workspace_name text,
  role_key text,
  onboarding_completed_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
  v_email text;
  v_full_name text;
  v_existing_workspace_id text;
  v_workspace_id text;
  v_workspace_name text;
  v_base_slug text;
  v_candidate text;
  v_suffix int := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- Serialize concurrent provisioning attempts for the same user (handles
  -- double-submit / refresh-during-provisioning safely).
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  v_email := lower(v_email);

  v_full_name := coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1));

  select m.workspace_id into v_existing_workspace_id
  from os_workspace_members m
  where m.user_id = v_uid
    and m.role_key = 'owner'
    and m.status <> 'pending'
    and m.active = true
  order by m.created_at asc
  limit 1;

  if v_existing_workspace_id is not null then
    insert into os_user_profiles (user_id, workspace_id, last_active_workspace_id, full_name)
    values (v_uid, v_existing_workspace_id, v_existing_workspace_id, v_full_name)
    on conflict (user_id) do update
      set last_active_workspace_id = coalesce(os_user_profiles.last_active_workspace_id, excluded.last_active_workspace_id);

    return query
      select w.id, w.name, 'owner'::text, w.onboarding_completed_at, false
      from os_workspaces w
      where w.id = v_existing_workspace_id;
    return;
  end if;

  v_base_slug := regexp_replace(lower(coalesce(nullif(trim(p_company_name), ''), split_part(v_email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug = '' then
    v_base_slug := 'workspace';
  end if;
  v_base_slug := left(v_base_slug, 24);

  v_candidate := 'ws-' || v_base_slug;
  while exists (select 1 from os_workspaces where id = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := 'ws-' || v_base_slug || '-' || v_suffix;
  end loop;
  v_workspace_id := v_candidate;
  v_workspace_name := coalesce(nullif(trim(p_company_name), ''), initcap(replace(v_base_slug, '-', ' ')));

  insert into os_workspaces (id, name, environment, owner_user_id)
  values (v_workspace_id, v_workspace_name, 'production', v_uid);

  insert into os_user_profiles (user_id, workspace_id, last_active_workspace_id, full_name, role_label)
  values (v_uid, v_workspace_id, v_workspace_id, v_full_name, 'Operator - Admin')
  on conflict (user_id) do update
    set last_active_workspace_id = excluded.last_active_workspace_id;

  insert into os_workspace_members (workspace_id, user_id, email, full_name, role, role_key, access, status, active, joined_at)
  values (v_workspace_id, v_uid, v_email, v_full_name, 'Operator - Admin', 'owner', '["All operators","Approvals","Settings"]'::jsonb, 'online', true, now())
  -- `workspace_id` is also a RETURNS TABLE output variable. Leaving the
  -- target implicit avoids PL/pgSQL's variable/column ambiguity here.
  on conflict do nothing;

  insert into os_workspace_settings (workspace_id, approval_policy, notifications)
  values (
    v_workspace_id,
    '{"outboundComms":"Always require approval","proposals":"Always require approval","internalReports":"Auto-approve within policy","crmWrites":"Always require approval"}'::jsonb,
    '{"approvalInbox":true,"weeklyDigest":true,"errorAlerts":true,"newAgentDeployed":true}'::jsonb
  )
  on conflict do nothing;

  return query select v_workspace_id, v_workspace_name, 'owner'::text, null::timestamptz, true;
end;
$$;

revoke all on function public.provision_initial_workspace(text, text) from public;
grant execute on function public.provision_initial_workspace(text, text) to authenticated;

-- ─── Invite acceptance ────────────────────────────────────────────────────
-- Validates the token, requires the verified session email to match the
-- invited email, creates/activates membership with the role fixed by the
-- invite record (never client-supplied), marks the invite accepted, and is
-- safe to call twice (second call fails with invite_already_accepted).
create or replace function public.accept_workspace_invite(p_token text)
returns table (workspace_id text, role_key text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
  v_email text;
  v_invite record;
  v_role_key text;
  v_full_name text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  select email into v_email from auth.users where id = v_uid;
  v_email := lower(coalesce(v_email, ''));

  select * into v_invite
  from os_member_invites
  where token = p_token
  for update;

  if v_invite.id is null then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  if v_invite.status = 'accepted' then
    raise exception 'invite_already_accepted' using errcode = 'P0001';
  end if;

  if v_invite.status = 'revoked' then
    raise exception 'invite_revoked' using errcode = 'P0001';
  end if;

  if v_invite.expires_at < now() then
    update os_member_invites set status = 'expired' where id = v_invite.id and status <> 'expired';
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;

  if lower(v_invite.email) <> v_email then
    raise exception 'invite_email_mismatch' using errcode = 'P0001';
  end if;

  v_role_key := case v_invite.role
    when 'Operator - Admin' then 'admin'
    when 'Operator - Reviewer' then 'reviewer'
    when 'Operator - Viewer' then 'viewer'
    else 'member'
  end;

  select full_name into v_full_name from os_user_profiles where user_id = v_uid;
  v_full_name := coalesce(v_full_name, split_part(v_email, '@', 1));

  insert into os_workspace_members (workspace_id, user_id, email, full_name, role, role_key, access, status, active, invited_by, joined_at)
  values (v_invite.workspace_id, v_uid, v_email, v_full_name, v_invite.role, v_role_key, v_invite.permissions, 'online', true, v_invite.invited_by, now())
  on conflict (workspace_id, email) do update
    set user_id = excluded.user_id,
        role = excluded.role,
        role_key = excluded.role_key,
        access = excluded.access,
        status = 'online',
        active = true,
        joined_at = coalesce(os_workspace_members.joined_at, now());

  update os_member_invites set status = 'accepted', accepted_at = now() where id = v_invite.id;

  insert into os_user_profiles (user_id, workspace_id, last_active_workspace_id, full_name)
  values (v_uid, v_invite.workspace_id, v_invite.workspace_id, v_full_name)
  on conflict (user_id) do update
    set last_active_workspace_id = excluded.last_active_workspace_id;

  return query select v_invite.workspace_id, v_role_key;
end;
$$;

revoke all on function public.accept_workspace_invite(text) from public;
grant execute on function public.accept_workspace_invite(text) to authenticated;

-- ─── One-time legacy reconciliation helper (NOT auto-invoked) ───────────
-- Promotes the earliest-joined active admin member to owner for any
-- workspace that has no owner yet. This is a deliberate, auditable,
-- one-time repair step for pre-existing dev/test data. It must be run
-- manually (e.g. via `select * from public.reconcile_legacy_workspace_owners();`
-- in the Supabase SQL editor with a service-role/postgres connection) and
-- reviewed - application code must never call this automatically.
create or replace function public.reconcile_legacy_workspace_owners()
returns table (workspace_id text, promoted_user_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select distinct on (m.workspace_id) m.workspace_id, m.user_id
    from os_workspace_members m
    where m.role_key = 'admin'
      and m.user_id is not null
      and m.status <> 'pending'
      and m.active = true
      and not exists (
        select 1 from os_workspace_members o
        where o.workspace_id = m.workspace_id and o.role_key = 'owner'
      )
    order by m.workspace_id, m.created_at asc
  )
  update os_workspace_members m
  set role_key = 'owner'
  from candidates c
  where m.workspace_id = c.workspace_id and m.user_id = c.user_id
  returning m.workspace_id, m.user_id;
end;
$$;

revoke all on function public.reconcile_legacy_workspace_owners() from public, anon, authenticated;
comment on function public.reconcile_legacy_workspace_owners() is
  'Manual, one-time reconciliation only. Promotes the earliest active admin member to owner for workspaces lacking one. Must be run explicitly by a trusted operator (service role / SQL editor) and reviewed. Never called automatically by application code.';
