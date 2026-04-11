-- Stage 1: Attribution fields on leads
alter table if exists public.leads
  add column if not exists landing_path text,
  add column if not exists referrer text,
  add column if not exists referrer_host text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists first_touch_source text,
  add column if not exists last_touch_source text,
  add column if not exists attribution_session_key text,
  add column if not exists attribution_captured_at timestamptz;

-- Stage 1: traffic_sessions table
create table if not exists public.traffic_sessions (
  session_key        text primary key,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  landing_path       text,
  last_path          text,
  referrer_host      text,
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  utm_content        text,
  utm_term           text,
  first_touch_source text,
  last_touch_source  text,
  pageviews          integer not null default 1
);

create index if not exists traffic_sessions_first_seen_at
  on public.traffic_sessions (first_seen_at);

create index if not exists traffic_sessions_first_touch_source
  on public.traffic_sessions (first_touch_source);

create index if not exists traffic_sessions_last_touch_source
  on public.traffic_sessions (last_touch_source);

create index if not exists traffic_sessions_landing_path
  on public.traffic_sessions (landing_path);
