-- Add the Scale tier without changing any persisted legacy plan values.
-- Existing starter, growth, operator, and enterprise workspaces remain valid.
alter table if exists public.os_workspaces
  drop constraint if exists os_workspaces_plan_tier_chk;

alter table if exists public.os_workspaces
  add constraint os_workspaces_plan_tier_chk
  check (plan_tier in ('preview', 'starter', 'growth', 'scale', 'operator', 'enterprise'));
