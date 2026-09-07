-- High-signal policy pauses appear in the existing notification center.
alter table public.os_notifications
  drop constraint if exists os_notifications_notification_type_check;

alter table public.os_notifications
  add constraint os_notifications_notification_type_check
  check (notification_type in ('approval_required', 'connector_attention', 'billing_attention', 'trial_ending', 'trial_expired', 'operator_paused'));
