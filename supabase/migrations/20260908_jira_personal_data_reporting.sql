-- Atlassian Personal Data Reporting API state for Jira OAuth 2.0 (3LO).
-- The account id is the only Jira personal-data identifier retained by the
-- application. This table is workspace-scoped and contains no access tokens,
-- profile fields, names, avatars, or email addresses.
create table if not exists public.os_jira_personal_data_reports (
  workspace_id text not null references public.os_workspaces(id) on delete cascade,
  account_id text not null,
  data_updated_at timestamptz not null,
  last_reported_at timestamptz,
  next_report_at timestamptz,
  status text not null default 'active' check (status in ('active', 'updated', 'erase_pending', 'erased')),
  last_response_status text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, account_id),
  check (length(account_id) between 1 and 128),
  check (account_id <> 'unknown')
);

create index if not exists os_jira_personal_data_reports_due_idx
  on public.os_jira_personal_data_reports (next_report_at, workspace_id);

alter table public.os_jira_personal_data_reports enable row level security;

create policy os_jira_personal_data_reports_select_members
  on public.os_jira_personal_data_reports
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_os_jira_personal_data_reports_updated_at') then
    create trigger trg_os_jira_personal_data_reports_updated_at
      before update on public.os_jira_personal_data_reports
      for each row execute function set_updated_at();
  end if;
end $$;

-- Email is not needed for Jira execution or reporting. Remove any historical
-- copy so the reporting scope is limited to the required accountId.
update public.os_connector_credentials
set provider_email = null
where connector_key = 'jira' and provider_email is not null;
