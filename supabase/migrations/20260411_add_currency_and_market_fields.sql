alter table if exists public.leads
  add column if not exists local_currency_code text,
  add column if not exists usd_fx_rate_locked numeric,
  add column if not exists usd_fx_rate_locked_at timestamptz,
  add column if not exists currency_source text,
  add column if not exists country_code text,
  add column if not exists country_source text;

alter table if exists public.leads
  alter column local_currency_code set default 'EUR',
  alter column currency_source set default 'legacy_default',
  alter column country_source set default 'unknown';

update public.leads
set local_currency_code = upper(coalesce(local_currency_code, 'EUR')),
    currency_source = coalesce(currency_source, 'legacy_default'),
    country_code = upper(country_code),
    country_source = coalesce(country_source, 'unknown')
where true;

-- For USD-local leads, lock a deterministic conversion rate.
update public.leads
set usd_fx_rate_locked = 1,
    usd_fx_rate_locked_at = coalesce(usd_fx_rate_locked_at, now())
where upper(local_currency_code) = 'USD'
  and usd_fx_rate_locked is null;

do $$
begin
  alter table public.leads
    add constraint leads_local_currency_code_format
    check (local_currency_code is null or local_currency_code ~ '^[A-Z]{3}$');
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.leads
    add constraint leads_usd_fx_rate_positive
    check (usd_fx_rate_locked is null or usd_fx_rate_locked > 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.leads
    add constraint leads_currency_source_allowed
    check (
      currency_source is null
      or currency_source in ('manual', 'inferred', 'legacy_default')
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.leads
    add constraint leads_country_code_format
    check (country_code is null or country_code ~ '^[A-Z]{2}$');
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.leads
    add constraint leads_country_source_allowed
    check (
      country_source is null
      or country_source in ('manual', 'lead_source_inferred', 'unknown', 'legacy_default')
    );
exception when duplicate_object then null;
end $$;
