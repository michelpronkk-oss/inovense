-- Website Knowledge Sync: durable, workspace-scoped source, crawl, page and
-- observation records. This migration is additive and must be reviewed and
-- applied through the normal Supabase deployment process; it is intentionally
-- not applied by the application.
--
-- The current Product Activity surface is a read-time projection over the
-- workspace-scoped OS tables (approvals, operator runs/logs, workflows and
-- outcomes). The older public.activity_events table is a separate legacy
-- admin/prospect audit surface and is deliberately not a Website dependency.
-- Website lifecycle/audit state is durably represented by the Website source
-- and crawl-run tables below.

begin;

create extension if not exists pgcrypto;

-- These are required existing product dependencies. Fail clearly before any
-- Website object is created rather than hiding a broken migration order behind
-- ALTER TABLE IF EXISTS or nullable foreign keys.
do $$
begin
  if to_regclass('public.os_workspaces') is null then
    raise exception 'Website Knowledge Sync requires public.os_workspaces; apply the OS workspace migrations first';
  end if;
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Website Knowledge Sync requires public.set_updated_at(); apply the OS workspace migrations first';
  end if;
  if to_regprocedure('public.bump_os_workspace_realtime_surface()') is null then
    raise exception 'Website Knowledge Sync requires public.bump_os_workspace_realtime_surface(); apply the Realtime backbone migration first';
  end if;
  if to_regclass('public.os_workspace_realtime_state') is null then
    raise exception 'Website Knowledge Sync requires public.os_workspace_realtime_state; apply the Realtime surface migrations first';
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.os_workspace_realtime_state'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%memory%'
  ) then
    raise exception 'Website Knowledge Sync requires the Realtime surface check to include memory; apply 20260916_realtime_surface_coverage.sql first';
  end if;
end;
$$;

create table if not exists public.os_website_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  canonical_origin text not null,
  hostname text not null,
  allowed_subdomains jsonb not null default '[]'::jsonb check (jsonb_typeof(allowed_subdomains) = 'array' and jsonb_array_length(allowed_subdomains) <= 10),
  sync_enabled boolean not null default false,
  cadence text not null default 'weekly' check (cadence in ('manual','daily','weekly','monthly')),
  include_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(include_paths) = 'array' and jsonb_array_length(include_paths) <= 20),
  exclude_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(exclude_paths) = 'array' and jsonb_array_length(exclude_paths) <= 40),
  max_pages integer not null default 50 check (max_pages between 1 and 100),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','failed','expired')),
  verification_method text check (verification_method in ('dns_txt','html_meta','html_file')),
  verified_at timestamptz,
  verification_expires_at timestamptz,
  robots_status text not null default 'unknown' check (robots_status in ('unknown','allowed','blocked','unavailable','error')),
  robots_rules jsonb not null default '[]'::jsonb check (octet_length(robots_rules::text) <= 20000),
  robots_sitemaps jsonb not null default '[]'::jsonb check (jsonb_typeof(robots_sitemaps) = 'array' and jsonb_array_length(robots_sitemaps) <= 10),
  robots_fetched_at timestamptz,
  robots_expires_at timestamptz,
  health_status text not null default 'setup_required' check (health_status in ('setup_required','verification_pending','connected','syncing','healthy','partial','degraded','paused','blocked_by_robots','reconnect_required','failed')),
  last_run_id uuid,
  last_successful_sync_at timestamptz,
  next_sync_at timestamptz,
  pages_discovered integer not null default 0 check (pages_discovered >= 0),
  pages_checked integer not null default 0 check (pages_checked >= 0),
  pages_changed integer not null default 0 check (pages_changed >= 0),
  pages_skipped integer not null default 0 check (pages_skipped >= 0),
  pages_failed integer not null default 0 check (pages_failed >= 0),
  observations_pending integer not null default 0 check (observations_pending >= 0),
  conflicts_pending integer not null default 0 check (conflicts_pending >= 0),
  disconnected_at timestamptz,
  retain_observations_on_disconnect boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, canonical_origin)
);

create index if not exists os_website_sources_due_idx
  on public.os_website_sources(sync_enabled, next_sync_at)
  where disconnected_at is null;
create index if not exists os_website_sources_workspace_idx
  on public.os_website_sources(workspace_id, updated_at desc);

create table if not exists public.os_website_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  source_id uuid not null references public.os_website_sources(id) on delete cascade,
  token_hash text not null,
  method text not null check (method in ('dns_txt','html_meta','html_file')),
  status text not null default 'pending' check (status in ('pending','verified','expired','failed','superseded')),
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_id, token_hash)
);
create index if not exists os_website_verification_challenges_due_idx
  on public.os_website_verification_challenges(source_id, status, expires_at);

create table if not exists public.os_website_crawl_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  source_id uuid not null references public.os_website_sources(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('manual','scheduled','reconciliation')),
  scheduled_slot text not null,
  state text not null default 'queued' check (state in ('queued','claimed','verifying','discovering','fetching','extracting','review_ready','completed','partial','failed','cancelled')),
  lease_token text,
  lease_until timestamptz,
  heartbeat_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  discovered_count integer not null default 0,
  checked_count integer not null default 0,
  changed_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  observation_count integer not null default 0,
  conflict_count integer not null default 0,
  retry_count integer not null default 0,
  error_code text,
  error_detail text,
  metadata jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, scheduled_slot)
);
create index if not exists os_website_crawl_runs_active_idx
  on public.os_website_crawl_runs(source_id, state, lease_until);
create index if not exists os_website_crawl_runs_workspace_idx
  on public.os_website_crawl_runs(workspace_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.os_website_sources'::regclass
      and conname = 'os_website_sources_last_run_fk'
  ) then
    alter table public.os_website_sources
      add constraint os_website_sources_last_run_fk
      foreign key (last_run_id) references public.os_website_crawl_runs(id) on delete set null;
  end if;
end;
$$;

create table if not exists public.os_website_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  source_id uuid not null references public.os_website_sources(id) on delete cascade,
  fetched_url text not null,
  canonical_url text not null,
  discovered_from text,
  lastmod_hint timestamptz,
  status text not null default 'discovered' check (status in ('discovered','queued','active','not_modified','blocked','skipped','failed','removed','tombstoned')),
  robots_status text not null default 'unknown' check (robots_status in ('unknown','allowed','blocked','unavailable')),
  noindex boolean not null default false,
  noarchive boolean not null default false,
  title text,
  meta_description text,
  language text,
  canonical_tag text,
  etag text,
  last_modified text,
  last_checked_at timestamptz,
  last_successful_fetch_at timestamptz,
  last_http_status integer,
  consecutive_failure_count integer not null default 0,
  next_eligible_at timestamptz,
  content_hash text,
  extraction_version text,
  normalized_text text check (normalized_text is null or octet_length(normalized_text) <= 500000),
  metadata jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 24000),
  removed_at timestamptz,
  tombstone_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, canonical_url)
);
create index if not exists os_website_pages_due_idx
  on public.os_website_pages(source_id, next_eligible_at, status);
create index if not exists os_website_pages_review_idx
  on public.os_website_pages(workspace_id, status, updated_at desc);

create table if not exists public.os_website_page_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  source_id uuid not null references public.os_website_sources(id) on delete cascade,
  page_id uuid not null references public.os_website_pages(id) on delete cascade,
  content_hash text not null,
  extraction_version text not null,
  normalized_length integer not null default 0 check (normalized_length between 0 and 500000),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (page_id, content_hash, extraction_version)
);
create index if not exists os_website_page_versions_page_idx
  on public.os_website_page_versions(page_id, fetched_at desc);

create table if not exists public.os_website_observations (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  source_id uuid not null references public.os_website_sources(id) on delete cascade,
  page_id uuid not null references public.os_website_pages(id) on delete cascade,
  canonical_source_url text not null,
  source_content_hash text not null,
  observation_type text not null,
  observation_key text not null,
  observation_value text not null check (octet_length(observation_value) <= 1200),
  observation_value_hash text not null,
  evidence_excerpt text not null check (octet_length(evidence_excerpt) <= 500),
  observed_at timestamptz not null default now(),
  source_last_checked_at timestamptz not null default now(),
  extraction_method text not null default 'deterministic',
  extraction_version text not null,
  confidence text not null default 'medium' check (confidence in ('low','medium','high')),
  trust_level text not null default 'observed' check (trust_level = 'observed'),
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','withdrawn','unsupported')),
  conflict_status text not null default 'none' check (conflict_status in ('none','conflict','resolved')),
  review_status text not null default 'pending' check (review_status in ('pending','kept_observed','confirmed_owner','edited_owner','dismissed','ignored')),
  dismissed_fingerprint text,
  memory_entry_id text,
  metadata jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, source_content_hash, observation_key, observation_value_hash, extraction_version)
);
create index if not exists os_website_observations_review_idx
  on public.os_website_observations(workspace_id, review_status, conflict_status, updated_at desc);
create index if not exists os_website_observations_canonical_idx
  on public.os_website_observations(workspace_id, observation_key, updated_at desc);

alter table public.os_website_sources enable row level security;
alter table public.os_website_verification_challenges enable row level security;
alter table public.os_website_crawl_runs enable row level security;
alter table public.os_website_pages enable row level security;
alter table public.os_website_page_versions enable row level security;
alter table public.os_website_observations enable row level security;

revoke all on public.os_website_sources, public.os_website_verification_challenges, public.os_website_crawl_runs, public.os_website_pages, public.os_website_page_versions, public.os_website_observations from anon, authenticated;
grant select, insert, update, delete on public.os_website_sources, public.os_website_verification_challenges, public.os_website_crawl_runs, public.os_website_pages, public.os_website_page_versions, public.os_website_observations to service_role;

drop trigger if exists trg_os_website_sources_updated_at on public.os_website_sources;
create trigger trg_os_website_sources_updated_at before update on public.os_website_sources for each row execute function public.set_updated_at();
drop trigger if exists trg_os_website_crawl_runs_updated_at on public.os_website_crawl_runs;
create trigger trg_os_website_crawl_runs_updated_at before update on public.os_website_crawl_runs for each row execute function public.set_updated_at();
drop trigger if exists trg_os_website_pages_updated_at on public.os_website_pages;
create trigger trg_os_website_pages_updated_at before update on public.os_website_pages for each row execute function public.set_updated_at();
drop trigger if exists trg_os_website_observations_updated_at on public.os_website_observations;
create trigger trg_os_website_observations_updated_at before update on public.os_website_observations for each row execute function public.set_updated_at();

create or replace function public.claim_os_website_crawl_run(p_run_id uuid, p_lease_token text, p_lease_seconds integer default 900)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare claimed boolean;
begin
  update public.os_website_crawl_runs
     set state = 'claimed', lease_token = p_lease_token,
         lease_until = now() + make_interval(secs => greatest(1, least(p_lease_seconds, 3600))),
         heartbeat_at = now(), started_at = coalesce(started_at, now()), updated_at = now()
   where id = p_run_id
     and ((state = 'queued') or (state not in ('completed','partial','failed','cancelled') and lease_until < now()))
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

create or replace function public.release_os_website_crawl_run(p_run_id uuid, p_lease_token text, p_state text, p_error_code text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare released boolean;
begin
  update public.os_website_crawl_runs
     set state = case when p_state in ('completed','partial','failed','cancelled','review_ready') then p_state else 'partial' end,
         lease_token = null, lease_until = null, completed_at = case when p_state in ('completed','partial','failed','cancelled','review_ready') then now() else completed_at end,
         error_code = left(regexp_replace(coalesce(p_error_code, ''), '[^a-zA-Z0-9_.-]', '_', 'g'), 80), updated_at = now()
  where id = p_run_id and state not in ('completed','partial','failed','cancelled') and lease_token = p_lease_token
  returning true into released;
  return coalesce(released, false);
end;
$$;
revoke all on function public.claim_os_website_crawl_run(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.release_os_website_crawl_run(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.claim_os_website_crawl_run(uuid,text,integer) to service_role;
grant execute on function public.release_os_website_crawl_run(uuid,text,text,text) to service_role;

-- Only opaque invalidations are published through the existing Realtime
-- projection. Website content and evidence never go over Realtime.
drop trigger if exists trg_realtime_os_website_sources on public.os_website_sources;
create trigger trg_realtime_os_website_sources after insert or update or delete on public.os_website_sources for each row execute function public.bump_os_workspace_realtime_surface('connectors');
drop trigger if exists trg_realtime_os_website_crawl_runs on public.os_website_crawl_runs;
create trigger trg_realtime_os_website_crawl_runs after insert or update or delete on public.os_website_crawl_runs for each row execute function public.bump_os_workspace_realtime_surface('connectors');
drop trigger if exists trg_realtime_os_website_observations on public.os_website_observations;
create trigger trg_realtime_os_website_observations after insert or update or delete on public.os_website_observations for each row execute function public.bump_os_workspace_realtime_surface('memory');

commit;
