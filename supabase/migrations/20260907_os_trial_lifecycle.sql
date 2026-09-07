-- One immutable Auterim trial per workspace, account owner, or Dodo customer.
-- This is product entitlement history, not a replacement for Dodo subscription truth.
create table if not exists public.os_trial_entitlements (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete restrict,
  owner_user_id uuid references auth.users(id) on delete set null,
  billing_customer_id text,
  trial_plan text not null check (trial_plan in ('starter', 'growth', 'scale')),
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz,
  trial_consumed_at timestamptz not null default now(),
  trial_status text not null check (trial_status in ('active', 'consumed', 'converted', 'expired')),
  converted_plan text check (converted_plan in ('starter', 'growth', 'scale', 'operator', 'enterprise')),
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

-- A verified owner and a known Dodo customer are the strongest existing
-- cross-workspace identities. Partial unique indexes deliberately allow old
-- records that predate either identity to remain safe and readable.
create unique index if not exists os_trial_entitlements_owner_user_uidx
  on public.os_trial_entitlements (owner_user_id)
  where owner_user_id is not null;
create unique index if not exists os_trial_entitlements_billing_customer_uidx
  on public.os_trial_entitlements (billing_customer_id)
  where billing_customer_id is not null;
create index if not exists os_trial_entitlements_status_ends_idx
  on public.os_trial_entitlements (trial_status, trial_ends_at);

create table if not exists public.os_billing_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  notification_type text not null check (notification_type in ('trial_started', 'trial_ending', 'trial_expired', 'trial_converted', 'payment_failed', 'subscription_canceled')),
  event_key text not null unique,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at timestamptz,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists os_billing_notifications_workspace_idx
  on public.os_billing_notifications (workspace_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_trial_entitlements_updated_at') then
    create trigger trg_os_trial_entitlements_updated_at before update on public.os_trial_entitlements for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_billing_notifications_updated_at') then
    create trigger trg_os_billing_notifications_updated_at before update on public.os_billing_notifications for each row execute function set_updated_at();
  end if;
end $$;

alter table public.os_trial_entitlements enable row level security;
alter table public.os_billing_notifications enable row level security;

-- No browser-facing policies: trial history and lifecycle delivery are owned
-- exclusively by verified server routes, Dodo webhooks, and scheduled jobs.
