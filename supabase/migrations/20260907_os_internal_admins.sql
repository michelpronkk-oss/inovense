create table if not exists public.os_internal_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  email text not null,
  role text not null default 'super_admin' check (role in ('super_admin', 'ops', 'support', 'finance', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists os_internal_admins_email_lower_unique on public.os_internal_admins(lower(email));
create index if not exists os_internal_admins_active_idx on public.os_internal_admins(is_active) where is_active = true;
alter table public.os_internal_admins enable row level security;
-- Internal authorization runs only on the server with the service role. No
-- authenticated browser policy exists, so workspace users cannot enumerate it.

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_internal_admins_updated_at') then
    create trigger trg_os_internal_admins_updated_at before update on public.os_internal_admins for each row execute function set_updated_at();
  end if;
end $$;
