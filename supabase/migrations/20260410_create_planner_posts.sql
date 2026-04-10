create extension if not exists pgcrypto;

create table if not exists public.planner_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  week_label text not null,
  template_type text not null check (
    template_type in ('authority', 'service', 'offer', 'quote', 'carousel', 'custom')
  ),
  best_for text not null check (
    best_for in ('instagram', 'facebook', 'linkedin')
  ),
  platforms text[] not null default '{}',
  recommended_format text not null,
  format_variants text[] not null default '{}',
  status text not null default 'draft' check (
    status in ('draft', 'ready', 'posted')
  ),
  instagram_exported boolean not null default false,
  instagram_posted boolean not null default false,
  instagram_posted_at timestamptz,
  facebook_exported boolean not null default false,
  facebook_posted boolean not null default false,
  facebook_posted_at timestamptz,
  linkedin_exported boolean not null default false,
  linkedin_posted boolean not null default false,
  linkedin_posted_at timestamptz,
  posted_at timestamptz,
  notes text,
  social_asset_key text
);

create index if not exists planner_posts_week_label_idx on public.planner_posts (week_label);
create index if not exists planner_posts_status_idx on public.planner_posts (status);
create index if not exists planner_posts_template_type_idx on public.planner_posts (template_type);
create index if not exists planner_posts_best_for_idx on public.planner_posts (best_for);
create index if not exists planner_posts_platforms_gin_idx on public.planner_posts using gin (platforms);

create or replace function public.set_planner_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists planner_posts_set_updated_at on public.planner_posts;
create trigger planner_posts_set_updated_at
before update on public.planner_posts
for each row
execute function public.set_planner_posts_updated_at();

insert into public.planner_posts (
  title,
  week_label,
  template_type,
  best_for,
  platforms,
  recommended_format,
  format_variants,
  status,
  instagram_exported,
  instagram_posted,
  instagram_posted_at,
  facebook_exported,
  facebook_posted,
  facebook_posted_at,
  linkedin_exported,
  linkedin_posted,
  linkedin_posted_at,
  posted_at,
  notes,
  social_asset_key
)
select
  'SilentSpend case spotlight',
  'Week 18',
  'carousel',
  'linkedin',
  array['linkedin', 'instagram']::text[],
  '1:1 Square',
  array['1:1 Square', '4:5 Portrait']::text[],
  'ready',
  true,
  false,
  null,
  false,
  false,
  null,
  true,
  false,
  null,
  null,
  'Case angle around monetization intelligence and decision-layer execution.',
  'w17-carousel-web'
where not exists (select 1 from public.planner_posts)
union all
select
  'Execution quality authority post',
  'Week 18',
  'authority',
  'linkedin',
  array['linkedin', 'facebook']::text[],
  '1:1 Square',
  array['1:1 Square']::text[],
  'draft',
  false,
  false,
  null,
  false,
  false,
  null,
  false,
  false,
  null,
  null,
  'Use this after publishing the SilentSpend case to reinforce operator-grade execution.',
  'w17-authority-exec'
where not exists (select 1 from public.planner_posts)
union all
select
  'Shopify offer card',
  'Week 19',
  'offer',
  'instagram',
  array['instagram', 'facebook']::text[],
  '4:5 Portrait',
  array['4:5 Portrait', '1:1 Square']::text[],
  'posted',
  true,
  true,
  '2026-04-08T09:30:00Z'::timestamptz,
  true,
  true,
  '2026-04-08T10:10:00Z'::timestamptz,
  false,
  false,
  null,
  '2026-04-08T10:10:00Z'::timestamptz,
  'Use the same creative set for feed and retargeting. Keep copy direct and offer-led.',
  'w18-offer-shopify'
where not exists (select 1 from public.planner_posts);
