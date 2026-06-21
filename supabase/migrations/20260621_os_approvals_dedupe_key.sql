-- Add duplicate protection for approval-gated Revenue Operator actions.
-- Existing rows are preserved. The unique guard is only created when current
-- active approvals do not already contain duplicate dedupe keys.

alter table if exists os_approvals
  add column if not exists dedupe_key text;

update os_approvals
set dedupe_key = continuation_payload->>'dedupeKey'
where dedupe_key is null
  and continuation_payload ? 'dedupeKey';

create index if not exists os_approvals_dedupe_key_idx
  on os_approvals(workspace_id, dedupe_key)
  where dedupe_key is not null;

do $$
begin
  if not exists (
    select 1
    from (
      select workspace_id, dedupe_key, count(*) as duplicate_count
      from os_approvals
      where dedupe_key is not null
        and status in ('pending', 'approved')
      group by workspace_id, dedupe_key
      having count(*) > 1
    ) duplicates
  ) then
    create unique index if not exists os_approvals_active_dedupe_key_uidx
      on os_approvals(workspace_id, dedupe_key)
      where dedupe_key is not null
        and status in ('pending', 'approved');
  end if;
end $$;
