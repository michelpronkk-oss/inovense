create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_identifier text null,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  from_status text null,
  to_status text null,
  market text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists activity_events_created_at_idx
  on public.activity_events (created_at desc);

create index if not exists activity_events_event_type_idx
  on public.activity_events (event_type);

create index if not exists activity_events_entity_idx
  on public.activity_events (entity_type, entity_id);
