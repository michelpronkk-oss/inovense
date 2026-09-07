-- Keep the legacy `role` column and broad admin RLS policy compatible, while
-- making owner/self protection true for direct authenticated SQL updates too.
create or replace function public.guard_workspace_member_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role_key = 'owner' and (new.role_key <> 'owner' or new.active = false) then
    raise exception 'owner_protected' using errcode = '42501';
  end if;

  if auth.uid() is not null and old.user_id = auth.uid()
    and (new.role_key is distinct from old.role_key or new.active is distinct from old.active) then
    raise exception 'self_membership_protected' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_workspace_member_role_changes on os_workspace_members;
create trigger trg_guard_workspace_member_role_changes
before update on os_workspace_members
for each row execute function public.guard_workspace_member_role_changes();

revoke all on function public.guard_workspace_member_role_changes() from public;
