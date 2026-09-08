# Launch hardening retention policy

Auterim keeps approvals, execution intents, execution logs, workflow runs, and
workflow outcomes as audit records. The central signal tables are bounded at
ingest and indexed by workspace and time; they are not part of the user-facing
Activity audit trail.

For beta operations, run cleanup as a reviewed maintenance job rather than as
part of a provider or workflow request:

- `os_signal_candidates`: remove rows older than 90 days only when `status` is
  `resolved`, `expired`, or `suppressed`.
- `os_signal_events`: remove rows older than 180 days only after the candidate
  retention pass and after confirming no active workflow depends on the event.
- Never delete `os_approvals`, `os_execution_intents`, `os_execution_logs`,
  `os_workflow_runs`, or `os_workflow_outcomes` as part of this cleanup.
- Delete in batches of at most 500 rows per workspace and record the operator,
  time window, and counts in the internal maintenance log.

The retention job should be enabled once beta workspaces have enough history to
measure the windows. Until then, bounded ingest, candidate caps, and indexed
workspace/time queries keep growth controlled without silently deleting launch
evidence.
