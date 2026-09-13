-- Pre-public-launch applications are stored separately from Auth, workspaces,
-- subscriptions, trials, CRM records, and member invitations.
create table if not exists public.os_early_access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  email_normalized text generated always as (lower(btrim(email))) stored,
  company text not null check (char_length(company) between 1 and 160),
  role text check (role is null or char_length(role) <= 100),
  team_size text not null check (team_size in ('1–5', '6–20', '21–50', '51–100', '101–250', '251+')),
  use_case text not null check (char_length(use_case) between 1 and 1200),

  status text not null default 'requested'
    check (status in ('requested', 'reviewing', 'invited', 'accepted', 'declined')),

  source text not null default 'homepage' check (char_length(source) between 1 and 80),
  source_path text not null check (char_length(source_path) between 1 and 512),
  referrer text check (referrer is null or char_length(referrer) <= 512),
  utm_source text check (utm_source is null or char_length(utm_source) <= 200),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 200),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 200),
  utm_content text check (utm_content is null or char_length(utm_content) <= 200),
  utm_term text check (utm_term is null or char_length(utm_term) <= 200),

  interested_plan text check (interested_plan is null or interested_plan in ('foundation', 'workforce', 'scale')),
  locale text not null default 'en' check (char_length(locale) between 2 and 10),

  confirmation_sent_at timestamptz,
  confirmation_attempted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  notes text
);

comment on table public.os_early_access_requests is
  'Pre-public-launch Early Access applications. Records do not create users, workspaces, trials, or billing state.';
comment on column public.os_early_access_requests.email_normalized is
  'Generated lowercase, trimmed email used for case-insensitive request deduplication.';
comment on column public.os_early_access_requests.confirmation_attempted_at is
  'Atomic 24-hour send suppression claim, including attempts that failed delivery.';
comment on column public.os_early_access_requests.status is
  'Internal review lifecycle: requested, reviewing, invited, accepted, or declined.';

create unique index if not exists os_early_access_requests_email_normalized_uidx
  on public.os_early_access_requests (email_normalized);
create index if not exists os_early_access_requests_status_created_idx
  on public.os_early_access_requests (status, created_at desc);
create index if not exists os_early_access_requests_created_idx
  on public.os_early_access_requests (created_at desc);
create index if not exists os_early_access_requests_utm_source_idx
  on public.os_early_access_requests (utm_source) where utm_source is not null;

alter table public.os_early_access_requests enable row level security;
revoke all on table public.os_early_access_requests from public, anon, authenticated;
grant all on table public.os_early_access_requests to service_role;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_os_early_access_requests_updated_at'
      and tgrelid = 'public.os_early_access_requests'::regclass
  ) then
    create trigger trg_os_early_access_requests_updated_at
      before update on public.os_early_access_requests
      for each row execute function set_updated_at();
  end if;
end;
$$;
