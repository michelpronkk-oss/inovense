-- Safety migration: ensure final payment tracking column exists everywhere.
-- Some environments were created before this field was introduced.
alter table if exists public.leads
  add column if not exists final_payment_paid_at timestamptz;
