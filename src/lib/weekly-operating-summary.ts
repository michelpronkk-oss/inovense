import { addDays, differenceInCalendarDays } from "date-fns";
import type { Lead, Prospect } from "@/lib/supabase-server";
import { getLifecycleReminders } from "@/lib/lifecycle-reminders";

const PROSPECT_STATUS_LABELS: Record<Prospect["status"], string> = {
  new: "New",
  researched: "Researched",
  ready_to_contact: "Ready to contact",
  contacted: "Contacted",
  replied: "Replied",
  qualified: "Qualified",
  converted_to_lead: "Converted to lead",
  not_fit: "Not fit",
};

const BLOCKED_FINAL_STATUSES = new Set<Lead["status"]>(["won", "lost"]);
const PROSPECTS_NEEDING_ACTION = new Set<Prospect["status"]>([
  "ready_to_contact",
  "contacted",
  "replied",
  "qualified",
]);

export type WeeklySummaryLeadItem = {
  id: string;
  name: string;
  company: string;
  href: string;
  detail: string;
  ageLabel: string;
  ageDays: number;
  score: number;
};

export type WeeklySummaryProspectItem = {
  id: string;
  company: string;
  statusLabel: string;
  href: string;
  detail: string;
  ageLabel: string;
  ageDays: number;
  score: number;
};

export type WeeklySummaryPriorityItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  ageLabel: string;
};

export type WeeklyOperatingSummary = {
  generatedAt: string;
  proposals: {
    pendingCount: number;
    dueCount: number;
    items: WeeklySummaryLeadItem[];
  };
  deposits: {
    pendingCount: number;
    dueCount: number;
    items: WeeklySummaryLeadItem[];
  };
  onboarding: {
    pendingCount: number;
    dueCount: number;
    items: WeeklySummaryLeadItem[];
  };
  prospects: {
    attentionCount: number;
    overdueCount: number;
    unscheduledCount: number;
    dueSoonCount: number;
    items: WeeklySummaryProspectItem[];
  };
  active: {
    attentionCount: number;
    readyToActivateCount: number;
    pausedCount: number;
    items: WeeklySummaryLeadItem[];
  };
  priorityItems: WeeklySummaryPriorityItem[];
};

function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseIso(`${value}T12:00:00`);
}

function ageDaysFrom(anchor: Date, now: Date): number {
  return Math.max(0, differenceInCalendarDays(now, anchor));
}

function toAgeLabel(days: number): string {
  if (days <= 0) return "Due now";
  return `${days}d overdue`;
}

function isProposalPending(lead: Lead): boolean {
  if (BLOCKED_FINAL_STATUSES.has(lead.status)) return false;
  if (!lead.proposal_sent_at) return false;
  if (lead.proposal_decision != null) return false;
  if (
    lead.status === "payment_requested" ||
    lead.status === "deposit_paid" ||
    lead.status === "onboarding_sent" ||
    lead.status === "onboarding_completed" ||
    lead.status === "active"
  ) {
    return false;
  }
  if (lead.deposit_paid_at || lead.final_payment_paid_at) return false;
  return true;
}

function isDepositPending(lead: Lead): boolean {
  if (BLOCKED_FINAL_STATUSES.has(lead.status)) return false;
  const acceptedSignal =
    lead.proposal_decision === "accepted" || lead.status === "payment_requested";
  return acceptedSignal && !lead.deposit_paid_at;
}

function isOnboardingPending(lead: Lead): boolean {
  if (BLOCKED_FINAL_STATUSES.has(lead.status)) return false;
  return (
    !!lead.deposit_paid_at &&
    !lead.onboarding_completed_at &&
    lead.onboarding_status !== "completed"
  );
}

function deriveActiveAttentionItem(
  lead: Lead,
  now: Date
): WeeklySummaryLeadItem[] {
  if (BLOCKED_FINAL_STATUSES.has(lead.status)) return [];

  const readyToActivate =
    !!lead.deposit_paid_at &&
    lead.onboarding_status === "completed" &&
    lead.project_status !== "active" &&
    lead.project_status !== "completed";

  const pausedFlow =
    lead.project_status === "paused" &&
    (lead.status === "active" ||
      lead.status === "onboarding_completed" ||
      lead.status === "deposit_paid");

  const items: WeeklySummaryLeadItem[] = [];

  if (readyToActivate) {
    const anchor =
      parseIso(lead.onboarding_completed_at) ??
      parseIso(lead.deposit_paid_at) ??
      parseIso(lead.created_at) ??
      now;
    const stalledDays = ageDaysFrom(anchor, now);
    items.push({
      id: `${lead.id}-ready`,
      name: lead.full_name,
      company: lead.company_name,
      href: `/admin/leads/${lead.id}`,
      detail: "Ready to activate delivery",
      ageLabel: stalledDays > 0 ? `${stalledDays}d waiting` : "Ready now",
      ageDays: stalledDays,
      score: 78 + stalledDays,
    });
  }

  if (pausedFlow) {
    const anchor =
      parseDateOnly(lead.project_start_date) ??
      parseIso(lead.deposit_paid_at) ??
      parseIso(lead.created_at) ??
      now;
    const pausedDays = ageDaysFrom(anchor, now);
    items.push({
      id: `${lead.id}-paused`,
      name: lead.full_name,
      company: lead.company_name,
      href: `/admin/leads/${lead.id}`,
      detail: "Project is paused and likely needs operator check-in",
      ageLabel: pausedDays > 0 ? `${pausedDays}d in flow` : "Needs review",
      ageDays: pausedDays,
      score: 68 + pausedDays,
    });
  }

  return items;
}

export function deriveWeeklyOperatingSummary(input: {
  leads: Lead[];
  prospects: Prospect[];
  now?: Date;
}): WeeklyOperatingSummary {
  const now = input.now ?? new Date();

  const proposalPendingLeads = input.leads.filter(isProposalPending);
  const depositPendingLeads = input.leads.filter(isDepositPending);
  const onboardingPendingLeads = input.leads.filter(isOnboardingPending);

  const proposalDueItems: WeeklySummaryLeadItem[] = [];
  const depositDueItems: WeeklySummaryLeadItem[] = [];
  const onboardingDueItems: WeeklySummaryLeadItem[] = [];
  const activeAttentionItems: WeeklySummaryLeadItem[] = [];

  for (const lead of input.leads) {
    const reminders = getLifecycleReminders(lead, { now });
    for (const reminder of reminders) {
      const baseItem: WeeklySummaryLeadItem = {
        id: lead.id,
        name: lead.full_name,
        company: lead.company_name,
        href: `/admin/leads/${lead.id}`,
        detail: reminder.title,
        ageLabel: toAgeLabel(reminder.daysOverdue),
        ageDays: reminder.daysOverdue,
        score: 0,
      };

      if (reminder.kind === "proposal_follow_up") {
        proposalDueItems.push({
          ...baseItem,
          score: 72 + reminder.daysOverdue * 2,
        });
      } else if (reminder.kind === "deposit_pending") {
        depositDueItems.push({
          ...baseItem,
          score: 92 + reminder.daysOverdue * 3,
        });
      } else if (reminder.kind === "onboarding_pending") {
        onboardingDueItems.push({
          ...baseItem,
          score: 84 + reminder.daysOverdue * 3,
        });
      }
    }

    activeAttentionItems.push(...deriveActiveAttentionItem(lead, now));
  }

  const overdueProspects: WeeklySummaryProspectItem[] = [];
  const unscheduledProspects: WeeklySummaryProspectItem[] = [];
  let dueSoonCount = 0;
  const weekAhead = addDays(now, 7);

  for (const prospect of input.prospects) {
    if (
      prospect.status === "converted_to_lead" ||
      prospect.status === "not_fit"
    ) {
      continue;
    }

    const followUpAt = parseIso(prospect.next_follow_up_at);
    if (followUpAt && followUpAt > now && followUpAt <= weekAhead) {
      dueSoonCount += 1;
    }

    if (followUpAt && followUpAt < now) {
      const overdueDays = ageDaysFrom(followUpAt, now);
      overdueProspects.push({
        id: prospect.id,
        company: prospect.company_name,
        statusLabel: PROSPECT_STATUS_LABELS[prospect.status],
        href: `/admin/prospects/${prospect.id}`,
        detail: "Prospect follow-up is overdue",
        ageLabel: `${overdueDays}d overdue`,
        ageDays: overdueDays,
        score: 66 + overdueDays * 2,
      });
      continue;
    }

    if (!followUpAt && PROSPECTS_NEEDING_ACTION.has(prospect.status)) {
      const anchor = parseIso(prospect.updated_at) ?? parseIso(prospect.created_at) ?? now;
      const waitingDays = ageDaysFrom(anchor, now);
      unscheduledProspects.push({
        id: prospect.id,
        company: prospect.company_name,
        statusLabel: PROSPECT_STATUS_LABELS[prospect.status],
        href: `/admin/prospects/${prospect.id}`,
        detail: "No follow-up is scheduled",
        ageLabel: waitingDays > 0 ? `${waitingDays}d unscheduled` : "Schedule now",
        ageDays: waitingDays,
        score: 54 + waitingDays,
      });
    }
  }

  proposalDueItems.sort((a, b) => b.ageDays - a.ageDays);
  depositDueItems.sort((a, b) => b.ageDays - a.ageDays);
  onboardingDueItems.sort((a, b) => b.ageDays - a.ageDays);
  activeAttentionItems.sort((a, b) => b.score - a.score);
  overdueProspects.sort((a, b) => b.ageDays - a.ageDays);
  unscheduledProspects.sort((a, b) => b.ageDays - a.ageDays);

  const prospectItems = [...overdueProspects, ...unscheduledProspects];
  const attentionCount = overdueProspects.length + unscheduledProspects.length;
  const readyToActivateCount = activeAttentionItems.filter((item) =>
    item.id.endsWith("-ready")
  ).length;
  const pausedCount = activeAttentionItems.filter((item) =>
    item.id.endsWith("-paused")
  ).length;

  const priorityPool: Array<{
    id: string;
    title: string;
    detail: string;
    href: string;
    ageLabel: string;
    score: number;
  }> = [
    ...depositDueItems.map((item) => ({
      id: `deposit-${item.id}`,
      title: `${item.company} - Deposit pending`,
      detail: item.detail,
      href: item.href,
      ageLabel: item.ageLabel,
      score: item.score,
    })),
    ...onboardingDueItems.map((item) => ({
      id: `onboarding-${item.id}`,
      title: `${item.company} - Onboarding pending`,
      detail: item.detail,
      href: item.href,
      ageLabel: item.ageLabel,
      score: item.score,
    })),
    ...proposalDueItems.map((item) => ({
      id: `proposal-${item.id}`,
      title: `${item.company} - Proposal follow-up`,
      detail: item.detail,
      href: item.href,
      ageLabel: item.ageLabel,
      score: item.score,
    })),
    ...activeAttentionItems.map((item) => ({
      id: `active-${item.id}`,
      title: `${item.company} - Active flow`,
      detail: item.detail,
      href: item.href,
      ageLabel: item.ageLabel,
      score: item.score,
    })),
    ...overdueProspects.map((item) => ({
      id: `prospect-overdue-${item.id}`,
      title: `${item.company} - Prospect follow-up`,
      detail: item.detail,
      href: item.href,
      ageLabel: item.ageLabel,
      score: item.score,
    })),
    ...unscheduledProspects.map((item) => ({
      id: `prospect-unscheduled-${item.id}`,
      title: `${item.company} - Prospect scheduling`,
      detail: item.detail,
      href: item.href,
      ageLabel: item.ageLabel,
      score: item.score,
    })),
  ];

  priorityPool.sort((a, b) => b.score - a.score);
  const priorityItems: WeeklySummaryPriorityItem[] = priorityPool
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      href: item.href,
      ageLabel: item.ageLabel,
    }));

  return {
    generatedAt: now.toISOString(),
    proposals: {
      pendingCount: proposalPendingLeads.length,
      dueCount: proposalDueItems.length,
      items: proposalDueItems.slice(0, 3),
    },
    deposits: {
      pendingCount: depositPendingLeads.length,
      dueCount: depositDueItems.length,
      items: depositDueItems.slice(0, 3),
    },
    onboarding: {
      pendingCount: onboardingPendingLeads.length,
      dueCount: onboardingDueItems.length,
      items: onboardingDueItems.slice(0, 3),
    },
    prospects: {
      attentionCount,
      overdueCount: overdueProspects.length,
      unscheduledCount: unscheduledProspects.length,
      dueSoonCount,
      items: prospectItems.slice(0, 3),
    },
    active: {
      attentionCount: activeAttentionItems.length,
      readyToActivateCount,
      pausedCount,
      items: activeAttentionItems.slice(0, 3),
    },
    priorityItems,
  };
}
