import { addDays, differenceInCalendarDays } from "date-fns";
import type { Lead } from "@/lib/supabase-server";

export type LifecycleReminderKind =
  | "proposal_follow_up"
  | "deposit_pending"
  | "onboarding_pending";

export type ReminderUrgency = "due" | "overdue" | "stalled";

export type LifecycleReminder = {
  kind: LifecycleReminderKind;
  title: string;
  summary: string;
  nextAction: string;
  anchorAt: string;
  dueAt: string;
  ageDays: number;
  daysOverdue: number;
  urgency: ReminderUrgency;
};

type ReminderThresholds = {
  proposalFollowUpDays: number;
  depositPendingDays: number;
  onboardingPendingDays: number;
};

const DEFAULT_THRESHOLDS: ReminderThresholds = {
  proposalFollowUpDays: 3,
  depositPendingDays: 4,
  onboardingPendingDays: 4,
};

const LATE_STAGE_STATUSES = new Set<Lead["status"]>([
  "payment_requested",
  "deposit_paid",
  "onboarding_sent",
  "onboarding_completed",
  "active",
  "won",
  "lost",
]);

function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function addReminderIfDue(
  reminders: LifecycleReminder[],
  params: {
    kind: LifecycleReminderKind;
    title: string;
    summary: string;
    nextAction: string;
    anchor: Date;
    thresholdDays: number;
    now: Date;
    snoozedUntil?: string | null;
  }
) {
  const dueAt = addDays(params.anchor, params.thresholdDays);
  if (params.now < dueAt) return;

  // Respect active snooze
  if (params.snoozedUntil) {
    const snoozedUntilDate = parseIso(params.snoozedUntil);
    if (snoozedUntilDate && params.now < snoozedUntilDate) return;
  }

  const ageDays = Math.max(
    0,
    differenceInCalendarDays(params.now, params.anchor)
  );
  const daysOverdue = Math.max(
    0,
    differenceInCalendarDays(params.now, dueAt)
  );
  const urgency: ReminderUrgency =
    daysOverdue === 0 ? "due" : daysOverdue <= 7 ? "overdue" : "stalled";

  reminders.push({
    kind: params.kind,
    title: params.title,
    summary: params.summary,
    nextAction: params.nextAction,
    anchorAt: toIso(params.anchor),
    dueAt: toIso(dueAt),
    ageDays,
    daysOverdue,
    urgency,
  });
}

function proposalHasMeaningfulProgress(lead: Lead): boolean {
  if (lead.proposal_decision === "accepted" || lead.proposal_decision === "declined") {
    return true;
  }
  if (LATE_STAGE_STATUSES.has(lead.status)) return true;
  if (lead.deposit_paid_at || lead.final_payment_paid_at) return true;
  return false;
}

function hasAcceptedSignal(lead: Lead): boolean {
  if (lead.proposal_decision === "accepted") return true;
  if (lead.status === "payment_requested") return true;
  return false;
}

export function getLifecycleReminders(
  lead: Lead,
  options?: {
    now?: Date;
    thresholds?: Partial<ReminderThresholds>;
  }
): LifecycleReminder[] {
  const now = options?.now ?? new Date();
  const thresholds: ReminderThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(options?.thresholds ?? {}),
  };

  const reminders: LifecycleReminder[] = [];
  const isClosed = lead.status === "lost" || lead.status === "won";
  if (isClosed) return reminders;

  const snooze = (lead.reminder_snooze ?? {}) as Record<string, string | undefined>;

  const proposalSentAt = parseIso(lead.proposal_sent_at);
  if (proposalSentAt && !proposalHasMeaningfulProgress(lead)) {
    addReminderIfDue(reminders, {
      kind: "proposal_follow_up",
      title: "Follow-up recommended",
      summary: "Proposal is sent, but the lead has not progressed yet.",
      nextAction: "Send a calm follow-up and confirm whether questions need to be answered.",
      anchor: proposalSentAt,
      thresholdDays: thresholds.proposalFollowUpDays,
      now,
      snoozedUntil: snooze["proposal_follow_up"],
    });
  }

  if (hasAcceptedSignal(lead) && !lead.deposit_paid_at) {
    const acceptedAnchor =
      parseIso(lead.proposal_decided_at) ??
      parseIso(lead.proposal_sent_at) ??
      parseIso(lead.created_at);

    if (acceptedAnchor) {
      addReminderIfDue(reminders, {
        kind: "deposit_pending",
        title: "Deposit still pending",
        summary: "The project is accepted, but deposit payment is not received yet.",
        nextAction: lead.payment_link
          ? "Confirm payment timing with the client and share the payment step if needed."
          : "Add a payment link and send a clean payment request before follow-up.",
        anchor: acceptedAnchor,
        thresholdDays: thresholds.depositPendingDays,
        now,
        snoozedUntil: snooze["deposit_pending"],
      });
    }
  }

  if (
    lead.deposit_paid_at &&
    !lead.onboarding_completed_at &&
    lead.onboarding_status !== "completed"
  ) {
    const onboardingAnchor =
      parseIso(lead.onboarding_sent_at) ?? parseIso(lead.deposit_paid_at);

    if (onboardingAnchor) {
      addReminderIfDue(reminders, {
        kind: "onboarding_pending",
        title: "Onboarding not completed yet",
        summary:
          lead.onboarding_status === "sent"
            ? "Onboarding has been sent, but completion is still pending."
            : "Deposit is received, but onboarding has not been sent yet.",
        nextAction:
          lead.onboarding_status === "sent"
            ? "Nudge completion and confirm if support is needed."
            : "Send onboarding so kickoff can stay on schedule.",
        anchor: onboardingAnchor,
        thresholdDays: thresholds.onboardingPendingDays,
        now,
        snoozedUntil: snooze["onboarding_pending"],
      });
    }
  }

  return reminders.sort((a, b) => {
    if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return b.ageDays - a.ageDays;
  });
}

export function formatReminderAge(reminder: LifecycleReminder): string {
  if (reminder.daysOverdue > 0) {
    return `${reminder.daysOverdue}d overdue`;
  }
  return "Due now";
}
