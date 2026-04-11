alter table if exists public.leads
  add column if not exists final_payment_paid_at timestamptz;
