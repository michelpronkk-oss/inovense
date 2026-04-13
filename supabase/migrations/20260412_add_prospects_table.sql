create extension if not exists pgcrypto;

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_name text not null,
  website_url text,
  contact_name text,
  contact_channel text not null default 'email' check (
    contact_channel in ('email', 'linkedin', 'instagram', 'contact_form', 'other')
  ),
  contact_value text,
  country_code text,
  outreach_language text not null default 'en' check (
    outreach_language in ('en', 'nl')
  ),
  lane_fit text not null default 'uncertain' check (
    lane_fit in ('build', 'systems', 'growth', 'uncertain')
  ),
  status text not null default 'new' check (
    status in (
      'new',
      'researched',
      'ready_to_contact',
      'contacted',
      'replied',
      'qualified',
      'converted_to_lead',
      'not_fit'
    )
  ),
  source text not null default 'outbound',
  notes text,
  opening_angle text,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  converted_lead_id uuid references public.leads(id) on delete set null,
  converted_at timestamptz
);

create index if not exists prospects_status_idx
  on public.prospects (status);

create index if not exists prospects_outreach_language_idx
  on public.prospects (outreach_language);

create index if not exists prospects_lane_fit_idx
  on public.prospects (lane_fit);

create index if not exists prospects_next_follow_up_at_idx
  on public.prospects (next_follow_up_at);

create index if not exists prospects_source_idx
  on public.prospects (source);

create index if not exists prospects_converted_lead_id_idx
  on public.prospects (converted_lead_id);

create or replace function public.set_prospects_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists prospects_set_updated_at on public.prospects;
create trigger prospects_set_updated_at
before update on public.prospects
for each row
execute function public.set_prospects_updated_at();
