"use server";

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  type Prospect,
  type ProspectContactChannel,
  type ProspectLaneFit,
  type ProspectOutreachLanguage,
  type ProspectStatus,
} from "@/lib/supabase-server";
import { getLeadMarketSeedFromLeadSource, parseCountryCodeInput } from "@/lib/market";
import { generateProspectCandidatesFromApify } from "@/lib/prospects/apify";

const VALID_STATUSES: ProspectStatus[] = [
  "new",
  "researched",
  "ready_to_contact",
  "contacted",
  "replied",
  "qualified",
  "converted_to_lead",
  "not_fit",
];

const VALID_CHANNELS: ProspectContactChannel[] = [
  "email",
  "linkedin",
  "instagram",
  "contact_form",
  "other",
];

const VALID_LANGUAGES: ProspectOutreachLanguage[] = ["en", "nl"];
const VALID_LANES: ProspectLaneFit[] = ["build", "systems", "growth", "uncertain"];

export type ProspectCreateInput = {
  company_name: string;
  website_url: string;
  contact_name: string;
  contact_channel: ProspectContactChannel;
  contact_value: string;
  country_code: string;
  outreach_language: ProspectOutreachLanguage;
  lane_fit: ProspectLaneFit;
  status: ProspectStatus;
  source: string;
  notes: string;
  opening_angle: string;
  next_follow_up_at: string;
};

export type ProspectUpdateInput = ProspectCreateInput & {
  last_contact_at: string;
};

type ActionResult = { success: true; id?: string } | { success: false; error: string };

export type GenerateProspectsState = {
  ok: boolean;
  error: string | null;
  inserted: number;
  duplicates: number;
  discarded: number;
  summary: string | null;
};

function revalidateProspects(id?: string) {
  revalidatePath("/admin/prospects");
  revalidatePath("/admin");
  if (id) {
    revalidatePath(`/admin/prospects/${id}`);
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : null;
}

function normalizeSource(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return normalized || "outbound";
}

function parseOptionalTimestampInput(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeWebsite(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) {
    return `https://${raw}`;
  }
  return raw;
}

function websiteHost(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeKey(value: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseVolumeInput(value: string | null): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return 10;
  if (parsed < 1) return 1;
  if (parsed > 50) return 50;
  return parsed;
}

function parseEmailCandidate(input: {
  contactChannel: ProspectContactChannel;
  contactValue: string | null;
}): string | null {
  const value = (input.contactValue ?? "").trim().toLowerCase();
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (input.contactChannel === "email" && emailRegex.test(value)) return value;
  if (emailRegex.test(value)) return value;
  return null;
}

function mapLaneToLeadServiceLane(lane: ProspectLaneFit): string {
  if (lane === "build") return "Build";
  if (lane === "systems") return "Systems";
  if (lane === "growth") return "Growth";
  return "Not sure yet";
}

function inferLeadSourceFromProspect(input: {
  source: string;
  language: ProspectOutreachLanguage;
}): string {
  const source = normalizeSource(input.source);
  let base: string;

  if (source.includes("linkedin")) base = "linkedin";
  else if (source.includes("instagram")) base = "instagram";
  else if (source.includes("referral")) base = "referral";
  else if (source.includes("website") || source.includes("web") || source.includes("form")) {
    base = "website";
  } else if (source.includes("outbound")) base = "outbound";
  else base = "other";

  if (input.language === "nl") {
    if (base === "website") return "nl_web";
    return `nl_${base}`;
  }

  return base;
}

function buildProjectDetails(input: {
  openingAngle: string | null;
  notes: string | null;
}) {
  const blocks: string[] = [];
  if (input.openingAngle) blocks.push(`Opening angle:\n${input.openingAngle}`);
  if (input.notes) blocks.push(`Prospect notes:\n${input.notes}`);
  return blocks.join("\n\n");
}

function validateBaseInput(input: {
  contact_channel: ProspectContactChannel;
  outreach_language: ProspectOutreachLanguage;
  lane_fit: ProspectLaneFit;
  status: ProspectStatus;
}): string | null {
  if (!VALID_CHANNELS.includes(input.contact_channel)) return "Invalid contact channel.";
  if (!VALID_LANGUAGES.includes(input.outreach_language)) return "Invalid outreach language.";
  if (!VALID_LANES.includes(input.lane_fit)) return "Invalid lane fit.";
  if (!VALID_STATUSES.includes(input.status)) return "Invalid status.";
  return null;
}

export async function createProspect(input: ProspectCreateInput): Promise<ActionResult> {
  const companyName = (input.company_name ?? "").trim();
  if (!companyName) {
    return { success: false, error: "Company name is required." };
  }

  const validationError = validateBaseInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const supabase = createSupabaseServerClient();
    const payload = {
      company_name: companyName,
      website_url: normalizeWebsite(input.website_url),
      contact_name: normalizeOptionalText(input.contact_name),
      contact_channel: input.contact_channel,
      contact_value: normalizeOptionalText(input.contact_value),
      country_code: parseCountryCodeInput(input.country_code),
      outreach_language: input.outreach_language,
      lane_fit: input.lane_fit,
      status: input.status,
      source: normalizeSource(input.source),
      notes: normalizeOptionalText(input.notes),
      opening_angle: normalizeOptionalText(input.opening_angle),
      last_contact_at: null,
      next_follow_up_at: parseOptionalTimestampInput(input.next_follow_up_at),
      converted_lead_id: null,
      converted_at: null,
    };

    const { data, error } = await supabase
      .from("prospects")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create prospect.");
    }

    revalidateProspects(data.id);
    return { success: true, id: data.id };
  } catch (err) {
    console.error("[admin] createProspect failed:", err);
    return { success: false, error: "Failed to create prospect." };
  }
}

export async function generateProspectsFromBrief(
  _prevState: GenerateProspectsState,
  formData: FormData
): Promise<GenerateProspectsState> {
  const market = (formData.get("market") as string | null)?.trim() ?? "";
  const niche = (formData.get("niche") as string | null)?.trim() ?? "";
  const location = (formData.get("location") as string | null)?.trim() ?? "";
  const source = (formData.get("source") as string | null)?.trim() ?? "outbound";
  const volume = parseVolumeInput(formData.get("volume") as string | null);

  if (!niche || (!location && !market)) {
    return {
      ok: false,
      error: "Enter niche and location (or market) before generating.",
      inserted: 0,
      duplicates: 0,
      discarded: 0,
      summary: null,
    };
  }

  try {
    const generation = await generateProspectCandidatesFromApify({
      market,
      niche,
      location,
      volume,
      source,
    });
    const candidates = generation.candidates;

    if (candidates.length === 0) {
      return {
        ok: false,
        error: "No usable prospects were returned for this brief.",
        inserted: 0,
        duplicates: 0,
        discarded: generation.filteredCount,
        summary: null,
      };
    }

    const supabase = createSupabaseServerClient();
    const { data: existingRaw, error: existingError } = await supabase
      .from("prospects")
      .select("id,company_name,website_url,contact_value")
      .order("updated_at", { ascending: false })
      .limit(2500);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existing = (existingRaw ?? []) as Pick<
      Prospect,
      "id" | "company_name" | "website_url" | "contact_value"
    >[];

    const knownWebsiteHosts = new Set<string>();
    const knownNameContact = new Set<string>();
    const knownNameOnly = new Set<string>();

    for (const row of existing) {
      const host = websiteHost(normalizeWebsite(row.website_url));
      if (host) knownWebsiteHosts.add(host);

      const nameKey = normalizeKey(row.company_name);
      if (!nameKey) continue;
      knownNameOnly.add(nameKey);
      const contactKey = normalizeKey(row.contact_value);
      knownNameContact.add(`${nameKey}|${contactKey}`);
    }

    let duplicates = 0;
    let discarded = generation.filteredCount;
    const insertRows: Array<Omit<Prospect, "id" | "created_at" | "updated_at">> = [];

    for (const candidate of candidates) {
      const hasWebsiteDuplicate =
        Boolean(candidate.dedupe.websiteHost) &&
        knownWebsiteHosts.has(candidate.dedupe.websiteHost as string);

      const hasNameContactDuplicate = knownNameContact.has(candidate.dedupe.nameContactKey);

      const shouldUseNameOnlyFallback =
        !candidate.dedupe.websiteHost &&
        !candidate.contact_value &&
        knownNameOnly.has(candidate.dedupe.nameOnlyKey);

      if (hasWebsiteDuplicate || hasNameContactDuplicate || shouldUseNameOnlyFallback) {
        duplicates += 1;
        continue;
      }

      if (!candidate.company_name.trim()) {
        discarded += 1;
        continue;
      }

      insertRows.push({
        company_name: candidate.company_name.trim(),
        website_url: normalizeWebsite(candidate.website_url),
        contact_name: normalizeOptionalText(candidate.contact_name),
        contact_channel: candidate.contact_channel,
        contact_value: normalizeOptionalText(candidate.contact_value),
        country_code: parseCountryCodeInput(candidate.country_code),
        outreach_language: candidate.outreach_language,
        lane_fit: candidate.lane_fit,
        status: "new",
        source: normalizeSource(candidate.source),
        notes: normalizeOptionalText(candidate.notes),
        opening_angle: normalizeOptionalText(candidate.opening_angle),
        last_contact_at: null,
        next_follow_up_at: null,
        converted_lead_id: null,
        converted_at: null,
      });

      if (candidate.dedupe.websiteHost) {
        knownWebsiteHosts.add(candidate.dedupe.websiteHost);
      }
      knownNameContact.add(candidate.dedupe.nameContactKey);
      knownNameOnly.add(candidate.dedupe.nameOnlyKey);
    }

    if (insertRows.length === 0) {
      return {
        ok: false,
        error:
          duplicates > 0
            ? "Generation completed but all results were already in queue."
            : "Generation returned no records eligible for queue.",
        inserted: 0,
        duplicates,
        discarded,
        summary: null,
      };
    }

    const { error: insertError } = await supabase.from("prospects").insert(insertRows);
    if (insertError) {
      throw new Error(insertError.message);
    }

    revalidateProspects();

    const summary = `Added ${insertRows.length} prospect${
      insertRows.length === 1 ? "" : "s"
    } to queue${
      duplicates > 0 ? `, skipped ${duplicates} duplicate${duplicates === 1 ? "" : "s"}` : ""
    }${
      discarded > 0 ? `, filtered ${discarded} weak record${discarded === 1 ? "" : "s"}` : ""
    }.`;

    return {
      ok: true,
      error: null,
      inserted: insertRows.length,
      duplicates,
      discarded,
      summary,
    };
  } catch (err) {
    console.error("[admin] generateProspectsFromBrief failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message || "Prospect generation failed."
          : "Prospect generation failed.",
      inserted: 0,
      duplicates: 0,
      discarded: 0,
      summary: null,
    };
  }
}

export async function updateProspect(id: string, input: ProspectUpdateInput): Promise<ActionResult> {
  if (!id) {
    return { success: false, error: "Prospect id is required." };
  }

  const companyName = (input.company_name ?? "").trim();
  if (!companyName) {
    return { success: false, error: "Company name is required." };
  }

  const validationError = validateBaseInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("prospects")
      .update({
        company_name: companyName,
        website_url: normalizeWebsite(input.website_url),
        contact_name: normalizeOptionalText(input.contact_name),
        contact_channel: input.contact_channel,
        contact_value: normalizeOptionalText(input.contact_value),
        country_code: parseCountryCodeInput(input.country_code),
        outreach_language: input.outreach_language,
        lane_fit: input.lane_fit,
        status: input.status,
        source: normalizeSource(input.source),
        notes: normalizeOptionalText(input.notes),
        opening_angle: normalizeOptionalText(input.opening_angle),
        last_contact_at: parseOptionalTimestampInput(input.last_contact_at),
        next_follow_up_at: parseOptionalTimestampInput(input.next_follow_up_at),
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidateProspects(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateProspect failed:", err);
    return { success: false, error: "Failed to update prospect." };
  }
}

export async function updateProspectStatus(
  id: string,
  status: ProspectStatus
): Promise<ActionResult> {
  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: "Invalid status." };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("prospects")
      .update({ status })
      .eq("id", id);

    if (error) throw new Error(error.message);
    revalidateProspects(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] updateProspectStatus failed:", err);
    return { success: false, error: "Failed to update status." };
  }
}

export async function updateProspectStatusFromList(
  id: string,
  status: ProspectStatus
): Promise<void> {
  await updateProspectStatus(id, status);
}

export async function markProspectContacted(id: string): Promise<ActionResult> {
  try {
    const now = new Date().toISOString();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("prospects")
      .update({
        status: "contacted",
        last_contact_at: now,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
    revalidateProspects(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] markProspectContacted failed:", err);
    return { success: false, error: "Failed to mark contacted." };
  }
}

export async function markProspectContactedFromList(id: string): Promise<void> {
  await markProspectContacted(id);
}

export async function convertProspectToLead(id: string): Promise<ActionResult> {
  if (!id) {
    return { success: false, error: "Prospect id is required." };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !prospect) {
      throw new Error(fetchError?.message ?? "Prospect not found.");
    }

    if (prospect.converted_lead_id) {
      revalidateProspects(id);
      return { success: true, id: prospect.converted_lead_id };
    }

    const contactEmail = parseEmailCandidate({
      contactChannel: prospect.contact_channel,
      contactValue: prospect.contact_value,
    });

    if (!contactEmail) {
      return {
        success: false,
        error:
          "Prospect must have a valid email in contact value before conversion to a lead.",
      };
    }

    const leadSource = inferLeadSourceFromProspect({
      source: prospect.source,
      language: prospect.outreach_language,
    });
    const marketSeed = getLeadMarketSeedFromLeadSource(leadSource);

    const countryCodeFromProspect = parseCountryCodeInput(prospect.country_code);
    const countryCode = countryCodeFromProspect ?? marketSeed.country_code;
    const countrySource = countryCodeFromProspect ? "manual" : marketSeed.country_source;

    const projectDetails = buildProjectDetails({
      openingAngle: normalizeOptionalText(prospect.opening_angle),
      notes: normalizeOptionalText(prospect.notes),
    });

    const fullName =
      normalizeOptionalText(prospect.contact_name) ??
      `${prospect.company_name.trim()} Contact`;

    const websiteOrSocial =
      normalizeWebsite(prospect.website_url) ??
      normalizeOptionalText(prospect.contact_value);

    const { data: leadRow, error: insertError } = await supabase
      .from("leads")
      .insert({
        full_name: fullName,
        company_name: prospect.company_name.trim(),
        work_email: contactEmail,
        website_or_social: websiteOrSocial,
        service_lane: mapLaneToLeadServiceLane(prospect.lane_fit),
        project_type: "",
        budget_range: "",
        timeline: "",
        project_details: projectDetails,
        lead_source: leadSource,
        local_currency_code: marketSeed.local_currency_code,
        currency_source: marketSeed.currency_source,
        country_code: countryCode,
        country_source: countrySource,
        status: "new",
        project_status: "not_started",
      })
      .select("id")
      .single();

    if (insertError || !leadRow) {
      throw new Error(insertError?.message ?? "Failed to create lead from prospect.");
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("prospects")
      .update({
        status: "converted_to_lead",
        converted_lead_id: leadRow.id,
        converted_at: now,
        next_follow_up_at: null,
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidateProspects(id);
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadRow.id}`);

    return { success: true, id: leadRow.id };
  } catch (err) {
    console.error("[admin] convertProspectToLead failed:", err);
    return { success: false, error: "Failed to convert prospect to lead." };
  }
}
