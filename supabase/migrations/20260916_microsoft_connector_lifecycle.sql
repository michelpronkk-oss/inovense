-- Durable Microsoft OAuth replay protection and Graph subscription lifecycle.
-- This migration is intentionally additive and must be reviewed/applied through
-- the normal Supabase deployment process; the application never auto-applies it.

create table if not exists public.os_microsoft_oauth_states (
  state_hash text primary key,
  nonce text not null,
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  user_email text not null,
  scope_profile text not null check (scope_profile in ('base', 'teams')),
  code_challenge text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists os_microsoft_oauth_states_expiry_idx
  on public.os_microsoft_oauth_states (expires_at, consumed_at);
alter table public.os_microsoft_oauth_states enable row level security;
revoke all on public.os_microsoft_oauth_states from anon, authenticated;
grant select, insert, update, delete on public.os_microsoft_oauth_states to service_role;

create table if not exists public.os_microsoft_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  connector_key text not null check (connector_key in ('microsoft', 'microsoft_teams')),
  capability text not null check (capability in ('outlook_mail', 'teams_channel_messages')),
  provider_subscription_id text not null,
  resource text not null,
  change_type text not null check (change_type = 'created'),
  notification_url text not null,
  lifecycle_notification_url text,
  expiration_at timestamptz not null,
  client_state_ref text not null,
  status text not null default 'active' check (status in ('active', 'renewing', 'needs_attention', 'removed', 'expired')),
  last_notification_at timestamptz,
  last_lifecycle_event text,
  last_error_code text,
  failure_count integer not null default 0,
  lease_token text,
  lease_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_subscription_id),
  unique (workspace_id, capability, resource, change_type)
);
create index if not exists os_microsoft_subscriptions_due_idx
  on public.os_microsoft_subscriptions (expiration_at, status);
create index if not exists os_microsoft_subscriptions_workspace_idx
  on public.os_microsoft_subscriptions (workspace_id, connector_key, capability);
alter table public.os_microsoft_subscriptions enable row level security;
revoke all on public.os_microsoft_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.os_microsoft_subscriptions to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_microsoft_subscriptions_updated_at') then
    create trigger trg_os_microsoft_subscriptions_updated_at
      before update on public.os_microsoft_subscriptions
      for each row execute function set_updated_at();
  end if;
end $$;

create or replace function public.claim_os_microsoft_subscription_lease(
  p_subscription_id uuid,
  p_lease_token text,
  p_lease_seconds integer default 120
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare claimed boolean;
begin
  update public.os_microsoft_subscriptions
     set status = case when status = 'active' then 'renewing' else status end,
         lease_token = p_lease_token,
         lease_until = now() + make_interval(secs => greatest(5, least(coalesce(p_lease_seconds, 120), 900))),
         updated_at = now()
   where id = p_subscription_id
     and (lease_until is null or lease_until < now());
  claimed := found;
  return coalesce(claimed, false);
end;
$$;

create or replace function public.release_os_microsoft_subscription_lease(
  p_subscription_id uuid,
  p_lease_token text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare released boolean;
begin
  update public.os_microsoft_subscriptions
     set lease_token = null, lease_until = null,
         status = case when status = 'renewing' then 'active' else status end,
         updated_at = now()
   where id = p_subscription_id and lease_token = p_lease_token;
  released := found;
  return coalesce(released, false);
end;
$$;

revoke all on function public.claim_os_microsoft_subscription_lease(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.release_os_microsoft_subscription_lease(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_os_microsoft_subscription_lease(uuid, text, integer) to service_role;
grant execute on function public.release_os_microsoft_subscription_lease(uuid, text) to service_role;
