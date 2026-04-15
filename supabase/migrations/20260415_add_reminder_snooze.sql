-- Reminder snooze state per lead
-- Keyed by reminder kind: proposal_follow_up | deposit_pending | onboarding_pending
-- Values are ISO timestamp strings indicating snooze expiry
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reminder_snooze jsonb DEFAULT '{}';
