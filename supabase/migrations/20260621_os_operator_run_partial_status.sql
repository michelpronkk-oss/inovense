-- Allow approval-gated runs to represent honest partial completion.
-- Example: Gmail send succeeded after approval, but HubSpot CRM update failed.

alter table if exists os_operator_runs
  drop constraint if exists os_operator_runs_status_check;

alter table if exists os_operator_runs
  add constraint os_operator_runs_status_check
  check (status in (
    'pending',
    'running',
    'waiting_for_approval',
    'completed',
    'partially_completed',
    'failed',
    'blocked'
  ));
