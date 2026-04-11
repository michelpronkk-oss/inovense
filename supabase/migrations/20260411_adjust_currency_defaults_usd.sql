alter table if exists public.leads
  alter column local_currency_code set default 'USD';

-- Keep codes normalized for deterministic comparisons and rendering.
update public.leads
set local_currency_code = upper(local_currency_code)
where local_currency_code is not null
  and local_currency_code <> upper(local_currency_code);

-- Safely re-seed legacy EUR defaults for leads that still have no commercial
-- amounts. This avoids reinterpreting historical priced deals.
with candidates as (
  select
    id,
    regexp_replace(lower(coalesce(lead_source, '')), '[^a-z0-9]+', '_', 'g') as normalized_source
  from public.leads
  where coalesce(currency_source, 'legacy_default') = 'legacy_default'
    and coalesce(upper(local_currency_code), 'EUR') = 'EUR'
    and proposal_price is null
    and proposal_deposit is null
    and deposit_amount is null
)
update public.leads as l
set local_currency_code = 'EUR',
    currency_source = 'inferred',
    country_code = coalesce(l.country_code, 'NL'),
    country_source = case
      when l.country_code is null then 'lead_source_inferred'
      else l.country_source
    end
from candidates c
where l.id = c.id
  and (
    c.normalized_source = 'nl_web'
    or c.normalized_source = 'nl'
    or c.normalized_source like 'nl_%'
    or c.normalized_source like '%dutch%'
    or c.normalized_source like '%nederland%'
  );

with candidates as (
  select
    id,
    regexp_replace(lower(coalesce(lead_source, '')), '[^a-z0-9]+', '_', 'g') as normalized_source
  from public.leads
  where coalesce(currency_source, 'legacy_default') = 'legacy_default'
    and coalesce(upper(local_currency_code), 'EUR') = 'EUR'
    and proposal_price is null
    and proposal_deposit is null
    and deposit_amount is null
)
update public.leads as l
set local_currency_code = 'GBP',
    currency_source = 'inferred',
    country_code = coalesce(l.country_code, 'GB'),
    country_source = case
      when l.country_code is null then 'lead_source_inferred'
      else l.country_source
    end
from candidates c
where l.id = c.id
  and (
    c.normalized_source ~ '(^|_)uk($|_)'
    or c.normalized_source ~ '(^|_)gb($|_)'
    or c.normalized_source like '%united_kingdom%'
    or c.normalized_source like '%britain%'
    or c.normalized_source like '%england%'
  );

with candidates as (
  select
    id,
    regexp_replace(lower(coalesce(lead_source, '')), '[^a-z0-9]+', '_', 'g') as normalized_source
  from public.leads
  where coalesce(currency_source, 'legacy_default') = 'legacy_default'
    and coalesce(upper(local_currency_code), 'EUR') = 'EUR'
    and proposal_price is null
    and proposal_deposit is null
    and deposit_amount is null
)
update public.leads as l
set local_currency_code = 'USD',
    currency_source = 'inferred',
    country_code = coalesce(l.country_code, 'US'),
    country_source = case
      when l.country_code is null then 'lead_source_inferred'
      else l.country_source
    end
from candidates c
where l.id = c.id
  and (
    c.normalized_source ~ '(^|_)us($|_)'
    or c.normalized_source ~ '(^|_)usa($|_)'
    or c.normalized_source like '%united_states%'
    or c.normalized_source like '%america%'
  );

-- Remaining legacy/global leads default to USD.
update public.leads
set local_currency_code = 'USD'
where coalesce(currency_source, 'legacy_default') = 'legacy_default'
  and coalesce(upper(local_currency_code), 'EUR') = 'EUR'
  and proposal_price is null
  and proposal_deposit is null
  and deposit_amount is null;

-- USD-local leads should always have a deterministic 1.0 conversion lock.
update public.leads
set usd_fx_rate_locked = 1,
    usd_fx_rate_locked_at = coalesce(usd_fx_rate_locked_at, now())
where upper(local_currency_code) = 'USD'
  and usd_fx_rate_locked is null;
