-- Extend the existing workspace memory table into a governed context record.
-- The original label/summary/content fields remain the human-readable surface;
-- these fields make provenance, freshness and safe operator use queryable.
-- No raw connector payloads belong in this table.

alter table os_memory_entries
  add column if not exists canonical_key text,
  add column if not exists category text,
  add column if not exists source_type text,
  add column if not exists source_label text,
  add column if not exists source_ref text,
  add column if not exists source_connector text,
  add column if not exists source_entity_id text,
  add column if not exists reliability text,
  add column if not exists confidence text,
  add column if not exists first_observed_at timestamptz,
  add column if not exists last_observed_at timestamptz,
  add column if not exists last_confirmed_at timestamptz,
  add column if not exists stale_after timestamptz,
  add column if not exists operator_relevance jsonb not null default '[]'::jsonb,
  add column if not exists policy_relevant boolean not null default false,
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists supersedes_id text;

create index if not exists os_memory_entries_workspace_context_idx
  on os_memory_entries(workspace_id, category, reliability, updated_at desc);

create index if not exists os_memory_entries_workspace_canonical_idx
  on os_memory_entries(workspace_id, canonical_key);

comment on column os_memory_entries.content is 'Bounded normalized business context; raw provider payloads remain in connector/audit storage.';
comment on column os_memory_entries.evidence is 'Small source references or evidence labels, never raw provider payloads.';
comment on column os_memory_entries.reliability is 'Existing policy vocabulary: verified, observed, derived, missing, stale.';

