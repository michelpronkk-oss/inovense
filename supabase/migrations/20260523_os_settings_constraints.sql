-- Optional hardening: enforce typed values inside os_workspace_settings JSON

alter table os_workspace_settings
  add constraint os_workspace_settings_approval_policy_keys_chk
  check (
    approval_policy ? 'outboundComms'
    and approval_policy ? 'proposals'
    and approval_policy ? 'internalReports'
    and approval_policy ? 'crmWrites'
  ) not valid;

alter table os_workspace_settings
  add constraint os_workspace_settings_approval_policy_values_chk
  check (
    (approval_policy->>'outboundComms') in ('Always require approval','Auto-approve within policy','Auto-approve','Blocked')
    and (approval_policy->>'proposals') in ('Always require approval','Auto-approve within policy','Auto-approve','Blocked')
    and (approval_policy->>'internalReports') in ('Always require approval','Auto-approve within policy','Auto-approve','Blocked')
    and (approval_policy->>'crmWrites') in ('Always require approval','Auto-approve within policy','Auto-approve','Blocked')
  ) not valid;

alter table os_workspace_settings
  add constraint os_workspace_settings_notifications_keys_chk
  check (
    notifications ? 'approvalInbox'
    and notifications ? 'weeklyDigest'
    and notifications ? 'errorAlerts'
    and notifications ? 'newAgentDeployed'
  ) not valid;

-- Validate later when existing rows are clean.
-- alter table os_workspace_settings validate constraint os_workspace_settings_approval_policy_keys_chk;
-- alter table os_workspace_settings validate constraint os_workspace_settings_approval_policy_values_chk;
-- alter table os_workspace_settings validate constraint os_workspace_settings_notifications_keys_chk;

