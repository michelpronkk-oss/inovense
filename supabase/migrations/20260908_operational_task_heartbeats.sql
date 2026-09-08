-- Payload-free liveness for scheduled background work. This is internal
-- service telemetry only: no task input, provider response, token, workspace
-- content, or customer identifier is stored.
create table if not exists public.os_task_heartbeats (
  task_id text primary key,
  expected_cadence_minutes integer not null check (expected_cadence_minutes > 0),
  last_started_at timestamptz,
  last_succeeded_at timestamptz,
  last_failed_at timestamptz,
  last_safe_error_code text,
  last_duration_ms integer check (last_duration_ms is null or last_duration_ms >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists os_task_heartbeats_updated_idx
  on public.os_task_heartbeats (updated_at desc);

alter table public.os_task_heartbeats enable row level security;
-- No browser policies. The service role owns writes and internal admin reads.

