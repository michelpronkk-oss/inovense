-- Preserve the canonical role selected in an invite. The legacy `role` label
-- cannot distinguish Member from Viewer because both pre-migration rows use
-- `Operator - Viewer` for compatibility.
alter table os_member_invites
  add column if not exists role_key text;

update os_member_invites
set role_key = case role
  when 'Operator - Admin' then 'admin'
  when 'Operator - Reviewer' then 'reviewer'
  when 'Operator - Viewer' then 'viewer'
  else 'viewer'
end
where role_key is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'os_member_invites_role_key_chk') then
    alter table os_member_invites
      add constraint os_member_invites_role_key_chk
      check (role_key in ('admin', 'reviewer', 'member', 'viewer'));
  end if;
end $$;

alter table os_member_invites
  alter column role_key set default 'viewer',
  alter column role_key set not null;

comment on column os_member_invites.role_key is
  'Canonical workspace role granted when this invite is accepted. The legacy role label remains for compatibility.';

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

  v_role_key := coalesce(v_invite.role_key, case v_invite.role
    when 'Operator - Admin' then 'admin'
    when 'Operator - Reviewer' then 'reviewer'
    when 'Operator - Viewer' then 'viewer'
    else 'viewer'
  end);

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
