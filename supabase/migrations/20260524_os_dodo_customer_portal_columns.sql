-- Dodo customer portal identifiers for workspace billing management

alter table if exists os_workspaces
  add column if not exists dodo_customer_id text,
  add column if not exists dodo_subscription_id text,
  add column if not exists dodo_product_id text,
  add column if not exists billing_updated_at timestamptz;

create index if not exists os_workspaces_dodo_customer_id_idx on os_workspaces(dodo_customer_id);
create index if not exists os_workspaces_dodo_subscription_id_idx on os_workspaces(dodo_subscription_id);

