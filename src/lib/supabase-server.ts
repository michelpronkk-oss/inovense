import { createClient } from "@supabase/supabase-js";
import type { LeadResearchOutput } from "@/lib/agents/lead-research/schema";
import type { ProposalAngleOutput } from "@/lib/agents/proposal-angle/schema";
import type { ProposalWriterOutput } from "@/lib/agents/proposal-writer/schema";

export type LeadStatus =
  | "new"
  | "reviewing"
  | "qualified"
  | "proposal_sent"
  | "payment_requested"
  | "deposit_paid"
  | "onboarding_sent"
  | "onboarding_completed"
  | "active"
  | "won"
  | "lost";

export type OnboardingStatus = "not_sent" | "sent" | "completed";
export type ProposalDecision = "accepted" | "declined";
export type CurrencySource = "manual" | "inferred" | "legacy_default";
export type CountrySource =
  | "manual"
  | "lead_source_inferred"
  | "unknown"
  | "legacy_default";

export type ProjectStatus =
  | "not_started"
  | "ready"
  | "active"
  | "paused"
  | "completed";

export type PlannerStatus = "draft" | "ready" | "posted";
export type PlannerPlatform = "instagram" | "facebook" | "linkedin";
export type PlannerTemplateType =
  | "authority"
  | "service"
  | "offer"
  | "quote"
  | "carousel"
  | "custom";
export type ProspectStatus =
  | "new"
  | "researched"
  | "ready_to_contact"
  | "contacted"
  | "replied"
  | "qualified"
  | "converted_to_lead"
  | "not_fit";
export type ProspectContactChannel =
  | "email"
  | "linkedin"
  | "instagram"
  | "contact_form"
  | "other";
export type ProspectOutreachLanguage = "en" | "nl";
export type ProspectLaneFit = "build" | "systems" | "growth" | "uncertain";

export type Lead = {
  id: string;
  created_at: string;
  full_name: string;
  company_name: string;
  work_email: string;
  website_or_social: string | null;
  service_lane: string;
  project_type: string;
  budget_range: string;
  timeline: string;
  project_details: string;
  status: LeadStatus;
  notes: string | null;
  // onboarding
  onboarding_status: OnboardingStatus;
  onboarding_token: string | null;
  onboarding_sent_at: string | null;
  onboarding_completed_at: string | null;
  onboarding_data: Record<string, string> | null;
  internal_next_step: string | null;
  // proposal
  proposal_token: string | null;
  proposal_status: string | null;
  proposal_title: string | null;
  proposal_intro: string | null;
  proposal_scope: string | null;
  proposal_deliverables: string | null;
  proposal_timeline: string | null;
  proposal_notes: string | null;
  proposal_price: number | null;
  proposal_deposit: number | null;
  proposal_decision: ProposalDecision | null;
  proposal_decided_at: string | null;
  proposal_sent_at: string | null;
  // payment and project
  payment_link: string | null;
  invoice_reference: string | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  final_payment_paid_at: string | null;
  project_start_date: string | null;
  project_status: ProjectStatus;
  lead_source: string | null;
  local_currency_code: string | null;
  usd_fx_rate_locked: number | null;
  usd_fx_rate_locked_at: string | null;
  currency_source: CurrencySource | null;
  country_code: string | null;
  country_source: CountrySource | null;
  // Agent 1: Lead Research Audit
  research_audit: LeadResearchOutput | null;
  research_audit_at: string | null;
  // Agent 2: Proposal Angle
  proposal_angle: ProposalAngleOutput | null;
  proposal_angle_at: string | null;
  proposal_angle_applied_at: string | null;
  // Proposal Writer
  proposal_writer: ProposalWriterOutput | null;
  proposal_writer_at: string | null;
  proposal_writer_applied_at: string | null;
  // Attribution
  landing_path: string | null;
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  first_touch_source: string | null;
  last_touch_source: string | null;
  attribution_session_key: string | null;
  attribution_captured_at: string | null;
  // Reminder snooze: kind -> ISO expiry string
  reminder_snooze: Record<string, string> | null;
};

export type TrafficSession = {
  session_key: string;
  first_seen_at: string;
  last_seen_at: string;
  landing_path: string | null;
  last_path: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  first_touch_source: string | null;
  last_touch_source: string | null;
  pageviews: number;
};

export type EmailLog = {
  id: string;
  lead_id: string;
  email_type: string;
  subject: string;
  sent_to: string;
  sent_at: string;
};

export type PlannerPost = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  week_label: string;
  template_type: PlannerTemplateType;
  best_for: PlannerPlatform;
  platforms: PlannerPlatform[];
  recommended_format: string;
  format_variants: string[];
  status: PlannerStatus;
  instagram_exported: boolean;
  instagram_posted: boolean;
  instagram_posted_at: string | null;
  facebook_exported: boolean;
  facebook_posted: boolean;
  facebook_posted_at: string | null;
  linkedin_exported: boolean;
  linkedin_posted: boolean;
  linkedin_posted_at: string | null;
  posted_at: string | null;
  notes: string | null;
  social_asset_key: string | null;
};

export type Prospect = {
  id: string;
  created_at: string;
  updated_at: string;
  company_name: string;
  website_url: string | null;
  contact_name: string | null;
  contact_channel: ProspectContactChannel;
  contact_value: string | null;
  country_code: string | null;
  outreach_language: ProspectOutreachLanguage;
  lane_fit: ProspectLaneFit;
  status: ProspectStatus;
  source: string;
  notes: string | null;
  opening_angle: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  converted_lead_id: string | null;
  converted_at: string | null;
};

type Database = {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: Partial<Lead> & {
          full_name: string;
          company_name: string;
          work_email: string;
          service_lane: string;
          project_type: string;
          budget_range: string;
          timeline: string;
          project_details: string;
        };
        Update: Partial<Lead>;
        Relationships: [];
      };
      lead_email_log: {
        Row: EmailLog;
        Insert: {
          lead_id: string;
          email_type: string;
          subject: string;
          sent_to: string;
          id?: string;
          sent_at?: string;
        };
        Update: Partial<EmailLog>;
        Relationships: [];
      };
      traffic_sessions: {
        Row: TrafficSession;
        Insert: Partial<TrafficSession> & { session_key: string };
        Update: Partial<TrafficSession>;
        Relationships: [];
      };
      planner_posts: {
        Row: PlannerPost;
        Insert: Omit<PlannerPost, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PlannerPost>;
        Relationships: [];
      };
      prospects: {
        Row: Prospect;
        Insert: Omit<Prospect, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Prospect>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set"
    );
  }

  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
