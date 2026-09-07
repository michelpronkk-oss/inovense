-- Normalized recurring subscription facts for truthful internal MRR reporting.
-- Raw Dodo payloads stay in os_billing_events; this table intentionally stores
-- only the current non-sensitive commercial subscription snapshot.
create table if not exists public.os_billing_subscriptions (
  dodo_subscription_id text primary key,
  workspace_id text references public.os_workspaces(id) on delete set null,
  dodo_customer_id text,
  dodo_product_id text,
  status text not null check (status in ('pending', 'active', 'on_hold', 'cancelled', 'failed', 'expired')),
  currency text not null,
  recurring_amount_minor bigint not null check (recurring_amount_minor >= 0),
  frequency_count integer not null default 1 check (frequency_count > 0),
  frequency_interval text not null check (frequency_interval in ('day', 'week', 'month', 'year')),
  next_billing_at timestamptz,
  cancelled_at timestamptz,
  source_event_id text unique references public.os_billing_events(event_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists os_billing_subscriptions_active_idx
  on public.os_billing_subscriptions (status, currency);
create index if not exists os_billing_subscriptions_workspace_idx
  on public.os_billing_subscriptions (workspace_id);

-- Backfill from previously signature-verified Dodo webhook events. This avoids
-- reporting a false zero while the webhook begins maintaining the live snapshot.
with raw_subscription_events as (
  select
    event_id,
    created_at,
    coalesce(raw_payload -> 'data' -> 'subscription', raw_payload -> 'data', '{}'::jsonb) as subscription,
    coalesce(raw_payload -> 'data' -> 'metadata', raw_payload -> 'data' -> 'subscription' -> 'metadata', '{}'::jsonb) as metadata
  from public.os_billing_events
), normalized as (
  select
    event_id,
    created_at,
    coalesce(subscription ->> 'subscription_id', subscription ->> 'id') as dodo_subscription_id,
    coalesce(metadata ->> 'workspace_id', subscription ->> 'workspace_id') as workspace_id,
    coalesce(subscription -> 'customer' ->> 'customer_id', subscription -> 'customer' ->> 'id', subscription ->> 'customer_id') as dodo_customer_id,
    subscription ->> 'product_id' as dodo_product_id,
    lower(subscription ->> 'status') as status,
    upper(subscription ->> 'currency') as currency,
    subscription ->> 'recurring_pre_tax_amount' as amount_text,
    subscription ->> 'payment_frequency_count' as frequency_count_text,
    lower(subscription ->> 'payment_frequency_interval') as frequency_interval,
    nullif(subscription ->> 'next_billing_date', '')::timestamptz as next_billing_at,
    nullif(subscription ->> 'cancelled_at', '')::timestamptz as cancelled_at
  from raw_subscription_events
), latest_per_subscription as (
  select distinct on (dodo_subscription_id) *
  from normalized
  where dodo_subscription_id is not null
    and status in ('pending', 'active', 'on_hold', 'cancelled', 'failed', 'expired')
    and currency is not null
    and amount_text ~ '^[0-9]+$'
    and frequency_interval in ('day', 'week', 'month', 'year')
  order by dodo_subscription_id, created_at desc
)
insert into public.os_billing_subscriptions (
  dodo_subscription_id, workspace_id, dodo_customer_id, dodo_product_id, status,
  currency, recurring_amount_minor, frequency_count, frequency_interval,
  next_billing_at, cancelled_at, source_event_id
)
select
  dodo_subscription_id, workspace_id, dodo_customer_id, dodo_product_id, status,
  currency, amount_text::bigint,
  greatest(coalesce(nullif(frequency_count_text, '')::integer, 1), 1), frequency_interval,
  next_billing_at, cancelled_at, event_id
from latest_per_subscription
on conflict (dodo_subscription_id) do update set
  workspace_id = excluded.workspace_id,
  dodo_customer_id = excluded.dodo_customer_id,
  dodo_product_id = excluded.dodo_product_id,
  status = excluded.status,
  currency = excluded.currency,
  recurring_amount_minor = excluded.recurring_amount_minor,
  frequency_count = excluded.frequency_count,
  frequency_interval = excluded.frequency_interval,
  next_billing_at = excluded.next_billing_at,
  cancelled_at = excluded.cancelled_at,
  source_event_id = excluded.source_event_id;

alter table public.os_billing_subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_billing_subscriptions_updated_at') then
    create trigger trg_os_billing_subscriptions_updated_at before update on public.os_billing_subscriptions for each row execute function set_updated_at();
  end if;
end $$;
