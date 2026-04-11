-- Agent 2: Proposal Angle
-- Adds three nullable fields to the leads table.
-- proposal_angle: full structured JSON output from the proposal angle agent
-- proposal_angle_at: timestamp of the most recent run
-- proposal_angle_applied_at: timestamp when prefill was last applied to proposal fields

alter table if exists public.leads
  add column if not exists proposal_angle jsonb,
  add column if not exists proposal_angle_at timestamptz,
  add column if not exists proposal_angle_applied_at timestamptz;
