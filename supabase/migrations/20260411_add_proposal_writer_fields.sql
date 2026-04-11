-- Proposal Writer agent output persistence
-- proposal_writer: full structured JSON output
-- proposal_writer_at: timestamp of most recent run
-- proposal_writer_applied_at: timestamp when prefill was last applied to proposal fields

alter table if exists public.leads
  add column if not exists proposal_writer jsonb,
  add column if not exists proposal_writer_at timestamptz,
  add column if not exists proposal_writer_applied_at timestamptz;
