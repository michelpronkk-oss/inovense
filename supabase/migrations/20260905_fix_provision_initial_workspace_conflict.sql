-- Fix Postgres error 42702 in the initial provisioning RPC.
--
-- `workspace_id` is a RETURNS TABLE output variable. In PL/pgSQL, using it
-- unqualified inside an ON CONFLICT target is ambiguous with the table
-- column. Recreate the function with targetless conflict handling. The
-- advisory lock already serializes provisioning for one user, and any unique
-- conflict here is safely idempotent, so this preserves the atomic model.

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
