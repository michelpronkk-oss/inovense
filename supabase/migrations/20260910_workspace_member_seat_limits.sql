-- Enforce workspace seat capacity at the database boundary.
-- The application checks before sending an invite, while this trigger protects
-- direct membership activation and concurrent acceptance paths as well.
create or replace function public.enforce_workspace_member_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  workspace_plan text;
  max_members integer;
  active_members integer;
begin
  -- Pending invitations do not consume a seat until accepted.
  if new.active is distinct from true or new.status = 'pending' then
    return new;
  end if;

  -- Serialize seat activation per workspace so two simultaneous accepts cannot
  -- both observe the same free seat.
  perform pg_advisory_xact_lock(hashtext(new.workspace_id));

  select coalesce(plan_tier, plan, 'preview')
    into workspace_plan
    from os_workspaces
   where id = new.workspace_id;

  if lower(workspace_plan) like '%enterprise%' then
    max_members := -1;
  elsif lower(workspace_plan) like '%scale%' or lower(workspace_plan) like '%operator%' then
    max_members := 20;
  elsif lower(workspace_plan) like '%growth%' or lower(workspace_plan) like '%workforce%' then
    max_members := 8;
  else
    max_members := 3;
  end if;

  if max_members = -1 then
    return new;
  end if;

  select count(*)::integer
    into active_members
    from os_workspace_members
   where workspace_id = new.workspace_id
     and active = true
     and status <> 'pending'
     and id is distinct from new.id;

  if active_members >= max_members then
    raise exception 'workspace_member_seat_limit_reached'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_workspace_member_seat_limit on os_workspace_members;
create trigger trg_enforce_workspace_member_seat_limit
before insert or update of active, status on os_workspace_members
for each row execute function public.enforce_workspace_member_seat_limit();

revoke all on function public.enforce_workspace_member_seat_limit() from public;
