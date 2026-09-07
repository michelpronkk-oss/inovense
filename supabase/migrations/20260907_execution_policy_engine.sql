-- Central execution-policy audit and idempotency ledger. Service routes are
-- the sole writer; browser access is intentionally denied by RLS.
create table if not exists os_execution_intents (
  id text primary key,
  workspace_id text not null references os_workspaces(id) on delete cascade,
  operator_key text not null,
  action_type text not null,
  connector_key text not null,
  action_hash text not null,
  decision text not null check (decision in ('allow_auto', 'require_approval', 'deny', 'pause_operator')),
  reason_code text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null check (status in ('policy_evaluated', 'awaiting_approval', 'authorized', 'executing', 'succeeded', 'failed', 'denied')),
  approval_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, action_hash)
);

create index if not exists os_execution_intents_workspace_action_created_idx
  on os_execution_intents (workspace_id, operator_key, action_type, created_at desc);
create index if not exists os_execution_intents_approval_idx
  on os_execution_intents (approval_id) where approval_id is not null;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_execution_intents_updated_at') then
    create trigger trg_os_execution_intents_updated_at before update on os_execution_intents
      for each row execute function set_updated_at();
  end if;
end $$;

alter table os_execution_intents enable row level security;
