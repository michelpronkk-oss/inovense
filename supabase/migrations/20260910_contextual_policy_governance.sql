-- Contextual governance evidence and precise approval scope.
-- Existing continuation_payload remains the compatibility source for older
-- approvals; these columns make new approvals queryable without changing the
-- existing os_approvals lifecycle.
alter table os_approvals
  add column if not exists approval_scope jsonb,
  add column if not exists policy_evidence jsonb;

create index if not exists os_approvals_policy_scope_idx
  on os_approvals (workspace_id, status)
  where approval_scope is not null;

