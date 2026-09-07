-- Defense-in-depth for the new "Remove member" action: the application
-- layer (removeWorkspaceMember in src/app/app/team/actions.ts) already
-- refuses to remove the workspace owner or the caller themselves, but this
-- mirrors that same owner protection at the database layer -- the same
-- guarantee already made for UPDATEs by guard_workspace_member_role_changes
-- in 20260907_workspace_member_role_guards.sql, extended to DELETEs so a
-- future code path can never delete the owner row either.
create or replace function public.guard_workspace_member_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role_key = 'owner' then
    raise exception 'owner_protected' using errcode = '42501';
  end if;

  return old;
end;
$$;

drop trigger if exists trg_guard_workspace_member_delete on os_workspace_members;
create trigger trg_guard_workspace_member_delete
before delete on os_workspace_members
for each row execute function public.guard_workspace_member_delete();

revoke all on function public.guard_workspace_member_delete() from public;
