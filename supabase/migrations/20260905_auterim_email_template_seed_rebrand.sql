-- Rebrand the placeholder os_email_templates seed row for team invites.
--
-- This row is only an audit/FK anchor for os_email_outbox.template_key --
-- its subject/html/text columns are never actually sent to a user; the real
-- invite email is built at send time in src/app/app/team/actions.ts via
-- src/lib/email/auth-emails.ts (renderTeamInviteEmail). Updating this
-- placeholder purely for hygiene: it still referenced "Inovense OS" branding
-- from before the Auterim rename.
update os_email_templates
set
  subject = 'You''ve been invited to Auterim',
  html_body = '<html><body><p>Invite template managed by app action (see src/lib/email/auth-emails.ts).</p></body></html>',
  text_body = 'Invite template managed by app action (see src/lib/email/auth-emails.ts).',
  updated_at = now()
where key = 'team_invite_v1';
