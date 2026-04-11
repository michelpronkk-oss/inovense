-- Agent 1: Lead Research Audit
-- Adds two nullable fields to the leads table to persist audit output.
-- research_audit: full structured JSON output from the research agent
-- research_audit_at: timestamp of the most recent audit run

alter table if exists public.leads
  add column if not exists research_audit jsonb,
  add column if not exists research_audit_at timestamptz;
