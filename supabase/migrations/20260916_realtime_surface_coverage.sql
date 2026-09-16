-- Extends the opaque workspace invalidation projection to every data-driven
-- authenticated surface. This migration is intentionally additive and must be
-- reviewed/applied through the normal Supabase deployment process.

alter table if exists public.os_workspace_realtime_state
  drop constraint if exists os_workspace_realtime_state_surface_check;

alter table if exists public.os_workspace_realtime_state
  add constraint os_workspace_realtime_state_surface_check
  check (surface in ('dashboard','approvals','workflows','activity','connectors','operators','memory','logs','insights'));

-- One source mutation can fan out to several read surfaces. Each trigger only
-- writes an opaque revision; no source row or customer content is published.
drop trigger if exists trg_realtime_os_approvals_dashboard on public.os_approvals;
create trigger trg_realtime_os_approvals_dashboard
after insert or update or delete on public.os_approvals for each row
execute function public.bump_os_workspace_realtime_surface('dashboard');

drop trigger if exists trg_realtime_os_approvals_activity on public.os_approvals;
create trigger trg_realtime_os_approvals_activity
after insert or update or delete on public.os_approvals for each row
execute function public.bump_os_workspace_realtime_surface('activity');

drop trigger if exists trg_realtime_os_workflow_runs_activity on public.os_workflow_runs;
create trigger trg_realtime_os_workflow_runs_activity
after insert or update or delete on public.os_workflow_runs for each row
execute function public.bump_os_workspace_realtime_surface('activity');

drop trigger if exists trg_realtime_os_workflow_outcomes_insights on public.os_workflow_outcomes;
create trigger trg_realtime_os_workflow_outcomes_insights
after insert or update or delete on public.os_workflow_outcomes for each row
execute function public.bump_os_workspace_realtime_surface('insights');

drop trigger if exists trg_realtime_os_workflow_outcomes_activity on public.os_workflow_outcomes;
create trigger trg_realtime_os_workflow_outcomes_activity
after insert or update or delete on public.os_workflow_outcomes for each row
execute function public.bump_os_workspace_realtime_surface('activity');

drop trigger if exists trg_realtime_os_operator_runs_dashboard on public.os_operator_runs;
create trigger trg_realtime_os_operator_runs_dashboard
after insert or update or delete on public.os_operator_runs for each row
execute function public.bump_os_workspace_realtime_surface('dashboard');

drop trigger if exists trg_realtime_os_operator_runs_activity on public.os_operator_runs;
create trigger trg_realtime_os_operator_runs_activity
after insert or update or delete on public.os_operator_runs for each row
execute function public.bump_os_workspace_realtime_surface('activity');

drop trigger if exists trg_realtime_os_operator_runs_logs on public.os_operator_runs;
create trigger trg_realtime_os_operator_runs_logs
after insert or update or delete on public.os_operator_runs for each row
execute function public.bump_os_workspace_realtime_surface('logs');

drop trigger if exists trg_realtime_os_operator_run_logs_activity on public.os_operator_run_logs;
create trigger trg_realtime_os_operator_run_logs_activity
after insert or update or delete on public.os_operator_run_logs for each row
execute function public.bump_os_workspace_realtime_surface('activity');

drop trigger if exists trg_realtime_os_operator_run_logs_logs on public.os_operator_run_logs;
create trigger trg_realtime_os_operator_run_logs_logs
after insert or update or delete on public.os_operator_run_logs for each row
execute function public.bump_os_workspace_realtime_surface('logs');

drop trigger if exists trg_realtime_os_memory_entries on public.os_memory_entries;
create trigger trg_realtime_os_memory_entries
after insert or update or delete on public.os_memory_entries for each row
execute function public.bump_os_workspace_realtime_surface('memory');
