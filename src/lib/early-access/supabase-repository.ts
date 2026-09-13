import "server-only";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { EarlyAccessRepository, EarlyAccessSavedRequest } from "./service";
import type { EarlyAccessSubmission } from "./validation";

type StoredRequest = {
  id: string;
  interested_plan: string | null;
  confirmation_sent_at: string | null;
  confirmation_attempted_at: string | null;
  source: string;
  source_path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

function existingValues(input: EarlyAccessSubmission, current: StoredRequest) {
  return {
    interested_plan: input.interestedPlan ?? current.interested_plan,
    source: input.source,
    source_path: input.sourcePath || current.source_path,
    referrer: input.referrer ?? current.referrer,
    utm_source: input.utmSource ?? current.utm_source,
    utm_medium: input.utmMedium ?? current.utm_medium,
    utm_campaign: input.utmCampaign ?? current.utm_campaign,
    utm_content: input.utmContent ?? current.utm_content,
    utm_term: input.utmTerm ?? current.utm_term,
  };
}

function toSavedRequest(input: EarlyAccessSubmission, stored: StoredRequest, isNew: boolean): EarlyAccessSavedRequest {
  return {
    id: stored.id,
    isNew,
    confirmationSentAt: stored.confirmation_sent_at,
    confirmationAttemptedAt: stored.confirmation_attempted_at,
    submission: {
      ...input,
      interestedPlan: (stored.interested_plan ?? input.interestedPlan) as EarlyAccessSubmission["interestedPlan"],
      source: (stored.source || input.source) as "homepage",
      sourcePath: stored.source_path || input.sourcePath,
      referrer: stored.referrer ?? input.referrer,
      utmSource: stored.utm_source ?? input.utmSource,
      utmMedium: stored.utm_medium ?? input.utmMedium,
      utmCampaign: stored.utm_campaign ?? input.utmCampaign,
      utmContent: stored.utm_content ?? input.utmContent,
      utmTerm: stored.utm_term ?? input.utmTerm,
    },
  };
}

export function createEarlyAccessSupabaseRepository(): EarlyAccessRepository {
  const supabase = createSupabaseAdmin();

  async function findByEmail(email: string): Promise<StoredRequest | null> {
    const { data, error } = await supabase
      .from("os_early_access_requests")
      .select("id,interested_plan,confirmation_sent_at,confirmation_attempted_at,source,source_path,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term")
      .eq("email_normalized", email)
      .maybeSingle();
    if (error) throw error;
    return data as StoredRequest | null;
  }

  async function updateExisting(input: EarlyAccessSubmission, current: StoredRequest): Promise<EarlyAccessSavedRequest> {
    const { data, error } = await supabase
      .from("os_early_access_requests")
      .update({
        name: input.name,
        email: input.email,
        company: input.company,
        role: input.role,
        team_size: input.teamSize,
        use_case: input.useCase,
        ...existingValues(input, current),
      })
      .eq("id", current.id)
      .select("id,interested_plan,confirmation_sent_at,confirmation_attempted_at,source,source_path,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term")
      .single();
    if (error || !data) throw error ?? new Error("Early Access request update returned no row.");
    return toSavedRequest(input, data as StoredRequest, false);
  }

  return {
    async save(input) {
      const existing = await findByEmail(input.email);
      if (existing) return updateExisting(input, existing);

      const { data, error } = await supabase
        .from("os_early_access_requests")
        .insert({
          name: input.name,
          email: input.email,
          company: input.company,
          role: input.role,
          team_size: input.teamSize,
          use_case: input.useCase,
          interested_plan: input.interestedPlan,
          source: input.source,
          source_path: input.sourcePath,
          referrer: input.referrer,
          utm_source: input.utmSource,
          utm_medium: input.utmMedium,
          utm_campaign: input.utmCampaign,
          utm_content: input.utmContent,
          utm_term: input.utmTerm,
          locale: input.locale,
        })
        .select("id,interested_plan,confirmation_sent_at,confirmation_attempted_at,source,source_path,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term")
        .single();

      if (!error && data) return toSavedRequest(input, data as StoredRequest, true);
      // A concurrent submission may win after the initial read. Reuse that
      // normalized-email row rather than creating another request.
      if (error?.code === "23505") {
        const concurrent = await findByEmail(input.email);
        if (concurrent) return updateExisting(input, concurrent);
      }
      throw error ?? new Error("Early Access request insert returned no row.");
    },

    async claimConfirmation({ id, attemptedAt, olderThan }) {
      const { data, error } = await supabase
        .from("os_early_access_requests")
        .update({ confirmation_attempted_at: attemptedAt })
        .eq("id", id)
        .or(`confirmation_attempted_at.is.null,confirmation_attempted_at.lt.${olderThan}`)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.id);
    },

    async markConfirmationSent({ id, sentAt }) {
      const { error } = await supabase
        .from("os_early_access_requests")
        .update({ confirmation_sent_at: sentAt })
        .eq("id", id);
      if (error) throw error;
    },
  };
}
