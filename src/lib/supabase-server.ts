import { createClient } from "@supabase/supabase-js";

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

export type ProjectStatus =
  | "not_started"
  | "ready"
  | "active"
  | "paused"
  | "completed";

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
  proposal_url: string | null;
  proposal_notes: string | null;
  proposal_sent_at: string | null;
  // payment and project
  payment_link: string | null;
  invoice_reference: string | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  project_start_date: string | null;
  project_status: ProjectStatus;
};

export type EmailLog = {
  id: string;
  lead_id: string;
  email_type: string;
  subject: string;
  sent_to: string;
  sent_at: string;
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
