import type { LeadStatus } from "@/lib/supabase-server";

export const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string }
> = {
  new: {
    label: "New",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  reviewing: {
    label: "Reviewing",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  qualified: {
    label: "Qualified",
    color: "bg-brand/10 text-brand border-brand/25",
  },
  proposal_sent: {
    label: "Proposal sent",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  payment_requested: {
    label: "Payment requested",
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  deposit_paid: {
    label: "Deposit paid",
    color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  onboarding_sent: {
    label: "Onboarding sent",
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  onboarding_completed: {
    label: "Onboarding done",
    color: "bg-brand/10 text-brand border-brand/25",
  },
  active: {
    label: "Active",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  won: {
    label: "Won",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  lost: {
    label: "Lost",
    color: "bg-zinc-700/30 text-zinc-500 border-zinc-700/40",
  },
};

export const LANE_COLORS: Record<string, string> = {
  Build: "bg-brand/10 text-brand border-brand/25",
  Systems: "bg-brand/10 text-brand border-brand/25",
  Growth: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Not sure yet": "bg-zinc-700/30 text-zinc-500 border-zinc-700/40",
  default: "bg-zinc-700/30 text-zinc-500 border-zinc-700/40",
};

export const ALL_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "payment_requested", label: "Payment requested" },
  { value: "deposit_paid", label: "Deposit paid" },
  { value: "onboarding_sent", label: "Onboarding sent" },
  { value: "onboarding_completed", label: "Onboarding done" },
  { value: "active", label: "Active" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const ALL_LANES = ["Build", "Systems", "Growth", "Not sure yet"];

export const LEAD_SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "nl_web", label: "Dutch website" },
  { value: "referral", label: "Referral" },
  { value: "outbound", label: "Outbound" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "personal_network", label: "Personal network" },
  { value: "call", label: "Call" },
  { value: "other", label: "Other" },
] as const;

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  nl_web: "Dutch website",
  referral: "Referral",
  outbound: "Outbound",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  personal_network: "Personal network",
  call: "Call",
  other: "Other",
};

export const EMAIL_TYPE_LABELS: Record<string, string> = {
  fit_followup: "Fit follow-up",
  proposal_sent: "Proposal ready",
  payment_request: "Payment request",
  onboarding_sent: "Onboarding link",
  decline: "Decline",
};
