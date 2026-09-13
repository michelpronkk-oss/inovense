-- Accept canonical plan slugs for new workspace, trial, and subscription writes.
-- Historical starter/growth values remain valid and are normalized in application code.
alter table public.os_workspaces
  drop constraint if exists os_workspaces_plan_tier_chk;

alter table public.os_workspaces
  add constraint os_workspaces_plan_tier_chk
  check (plan_tier in ('preview', 'foundation', 'workforce', 'scale', 'starter', 'growth', 'operator', 'enterprise'));

alter table public.os_trial_entitlements
  drop constraint if exists os_trial_entitlements_trial_plan_check;

alter table public.os_trial_entitlements
  add constraint os_trial_entitlements_trial_plan_check
  check (trial_plan in ('foundation', 'workforce', 'scale', 'starter', 'growth'));

alter table public.os_trial_entitlements
  drop constraint if exists os_trial_entitlements_converted_plan_check;

alter table public.os_trial_entitlements
  add constraint os_trial_entitlements_converted_plan_check
  check (converted_plan is null or converted_plan in ('foundation', 'workforce', 'scale', 'starter', 'growth', 'operator', 'enterprise'));

alter table public.os_billing_subscriptions
  add column if not exists plan_slug text;

alter table public.os_billing_subscriptions
  drop constraint if exists os_billing_subscriptions_plan_slug_check;

alter table public.os_billing_subscriptions
  add constraint os_billing_subscriptions_plan_slug_check
  check (plan_slug is null or plan_slug in ('foundation', 'workforce', 'scale'));

comment on column public.os_workspaces.plan_tier is
  'Canonical values are foundation, workforce, and scale; legacy starter/growth rows remain readable during compatibility normalization.';
comment on column public.os_trial_entitlements.trial_plan is
  'New trial rows use foundation, workforce, or scale. Historical starter/growth rows remain valid.';
comment on column public.os_billing_subscriptions.plan_slug is
  'Canonical plan slug resolved from a configured Dodo product ID. Historical rows may remain null.';
