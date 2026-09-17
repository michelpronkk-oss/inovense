-- Growth Operator v1: governed opportunity detection, campaign preparation,
-- approval lineage, and outcome capture. No provider publishing is enabled by
-- this migration. All writes remain server-side and workspace-scoped.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.os_workspaces') is null then
    raise exception 'Growth Operator requires public.os_workspaces';
  end if;
  if to_regclass('public.os_operator_runs') is null then
    raise exception 'Growth Operator requires public.os_operator_runs; apply 20260618_os_operator_runtime.sql first';
  end if;
  if to_regclass('public.os_approvals') is null then
    raise exception 'Growth Operator requires public.os_approvals; apply the OS dashboard and approval migrations first';
  end if;
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Growth Operator requires public.set_updated_at()';
  end if;
  if to_regprocedure('public.is_workspace_member(text)') is null
     or to_regprocedure('public.workspace_role_key(text)') is null then
    raise exception 'Growth Operator requires workspace RLS helper functions; apply 20260905_auth_rls_policies.sql first';
  end if;
end;
$$;

create table if not exists public.os_growth_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  fingerprint text not null,
  source_type text not null check (source_type in ('website_observation','owner_memory','product_activity','operator_outcome','manual_goal')),
  source_ref text not null,
  title text not null,
  summary text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array' and octet_length(evidence::text) <= 24000),
  trust_level text not null check (trust_level in ('owner_confirmed','verified','observed','derived')),
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','withdrawn','unsupported')),
  score numeric(6,3) not null default 0 check (score between 0 and 1),
  status text not null default 'detected' check (status in ('detected','reviewed','prepared','approved','dismissed','expired')), 
  dedupe_key text not null,
  observed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, fingerprint)
);

create index if not exists os_growth_opportunities_workspace_status_idx
  on public.os_growth_opportunities(workspace_id, status, last_seen_at desc);
create index if not exists os_growth_opportunities_workspace_freshness_idx
  on public.os_growth_opportunities(workspace_id, freshness_status, last_seen_at desc);
create index if not exists os_growth_opportunities_source_idx
  on public.os_growth_opportunities(workspace_id, source_type, source_ref);

create table if not exists public.os_growth_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.os_growth_opportunities(id) on delete restrict,
  objective text not null,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','exported','measured','cancelled')),
  created_by text,
  approved_at timestamptz,
  exported_at timestamptz,
  measured_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, opportunity_id, objective)
);

create index if not exists os_growth_campaigns_workspace_status_idx
  on public.os_growth_campaigns(workspace_id, status, updated_at desc);
create index if not exists os_growth_campaigns_opportunity_idx
  on public.os_growth_campaigns(workspace_id, opportunity_id, updated_at desc);

create table if not exists public.os_growth_campaign_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  campaign_id uuid not null references public.os_growth_campaigns(id) on delete cascade,
  revision integer not null check (revision > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 120000),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','superseded','exported')),
  approval_id text references public.os_approvals(id) on delete set null,
  created_by text,
  created_at timestamptz not null default now(),
  unique (campaign_id, revision),
  unique (campaign_id, content_hash)
);

create index if not exists os_growth_campaign_revisions_workspace_idx
  on public.os_growth_campaign_revisions(workspace_id, created_at desc);
create index if not exists os_growth_campaign_revisions_approval_idx
  on public.os_growth_campaign_revisions(workspace_id, approval_id)
  where approval_id is not null;

create table if not exists public.os_growth_outcomes (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  campaign_id uuid not null references public.os_growth_campaigns(id) on delete cascade,
  revision_id uuid references public.os_growth_campaign_revisions(id) on delete set null,
  channel text not null check (channel in ('x','linkedin','founder_update','email_newsletter','reusable_announcement','other')),
  outcome_type text not null check (outcome_type in ('published','impression','click','reply','lead','meeting','conversion','rejected','other')),
  value numeric,
  attribution_level text not null check (attribution_level in ('provider','owner_confirmed','manual','derived')),
  attribution_source text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array' and octet_length(evidence::text) <= 16000),
  observed_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists os_growth_outcomes_workspace_observed_idx
  on public.os_growth_outcomes(workspace_id, observed_at desc);
create index if not exists os_growth_outcomes_campaign_idx
  on public.os_growth_outcomes(workspace_id, campaign_id, observed_at desc);

create table if not exists public.os_growth_learnings (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  campaign_id uuid references public.os_growth_campaigns(id) on delete set null,
  outcome_id uuid references public.os_growth_outcomes(id) on delete set null,
  statement text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array' and octet_length(evidence::text) <= 16000),
  trust_level text not null default 'derived' check (trust_level = 'derived'),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  applied_to_memory boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists os_growth_learnings_workspace_idx
  on public.os_growth_learnings(workspace_id, approval_status, created_at desc);

do $$
declare
  table_name text;
begin
  for table_name in select unnest(array[
    'os_growth_opportunities', 'os_growth_campaigns',
    'os_growth_campaign_revisions', 'os_growth_outcomes', 'os_growth_learnings'
  ]) loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

drop policy if exists os_growth_opportunities_select_members on public.os_growth_opportunities;
create policy os_growth_opportunities_select_members on public.os_growth_opportunities
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
drop policy if exists os_growth_opportunities_write_admins on public.os_growth_opportunities;
create policy os_growth_opportunities_write_admins on public.os_growth_opportunities
  for all to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner','admin'))
  with check (public.workspace_role_key(workspace_id) in ('owner','admin'));

drop policy if exists os_growth_campaigns_select_members on public.os_growth_campaigns;
create policy os_growth_campaigns_select_members on public.os_growth_campaigns
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
drop policy if exists os_growth_campaigns_write_admins on public.os_growth_campaigns;
create policy os_growth_campaigns_write_admins on public.os_growth_campaigns
  for all to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner','admin'))
  with check (public.workspace_role_key(workspace_id) in ('owner','admin'));

drop policy if exists os_growth_revisions_select_members on public.os_growth_campaign_revisions;
create policy os_growth_revisions_select_members on public.os_growth_campaign_revisions
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
drop policy if exists os_growth_revisions_write_admins on public.os_growth_campaign_revisions;
create policy os_growth_revisions_write_admins on public.os_growth_campaign_revisions
  for all to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner','admin'))
  with check (public.workspace_role_key(workspace_id) in ('owner','admin'));

drop policy if exists os_growth_outcomes_select_members on public.os_growth_outcomes;
create policy os_growth_outcomes_select_members on public.os_growth_outcomes
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
drop policy if exists os_growth_outcomes_write_admins on public.os_growth_outcomes;
create policy os_growth_outcomes_write_admins on public.os_growth_outcomes
  for all to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner','admin'))
  with check (public.workspace_role_key(workspace_id) in ('owner','admin'));

drop policy if exists os_growth_learnings_select_members on public.os_growth_learnings;
create policy os_growth_learnings_select_members on public.os_growth_learnings
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
drop policy if exists os_growth_learnings_write_admins on public.os_growth_learnings;
create policy os_growth_learnings_write_admins on public.os_growth_learnings
  for all to authenticated
  using (public.workspace_role_key(workspace_id) in ('owner','admin'))
  with check (public.workspace_role_key(workspace_id) in ('owner','admin'));

revoke all on public.os_growth_opportunities, public.os_growth_campaigns,
  public.os_growth_campaign_revisions, public.os_growth_outcomes,
  public.os_growth_learnings from anon;
grant select on public.os_growth_opportunities, public.os_growth_campaigns,
  public.os_growth_campaign_revisions, public.os_growth_outcomes,
  public.os_growth_learnings to authenticated;
grant all on public.os_growth_opportunities, public.os_growth_campaigns,
  public.os_growth_campaign_revisions, public.os_growth_outcomes,
  public.os_growth_learnings to service_role;

drop trigger if exists trg_os_growth_opportunities_updated_at on public.os_growth_opportunities;
create trigger trg_os_growth_opportunities_updated_at before update on public.os_growth_opportunities for each row execute function public.set_updated_at();
drop trigger if exists trg_os_growth_campaigns_updated_at on public.os_growth_campaigns;
create trigger trg_os_growth_campaigns_updated_at before update on public.os_growth_campaigns for each row execute function public.set_updated_at();

commit;
