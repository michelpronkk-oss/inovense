"use server";

import { revalidatePath } from "next/cache";
import {
  createSupabaseServerClient,
  type PlannerPlatform,
  type PlannerPost,
  type PlannerStatus,
  type PlannerTemplateType,
} from "@/lib/supabase-server";
import { FORMAT_VALUES } from "./config";

type PlatformFields = {
  exported: boolean;
  posted: boolean;
  postedAt: string | null;
};

const PLATFORM_COLUMN_MAP = {
  instagram: {
    exported: "instagram_exported",
    posted: "instagram_posted",
    postedAt: "instagram_posted_at",
  },
  facebook: {
    exported: "facebook_exported",
    posted: "facebook_posted",
    postedAt: "facebook_posted_at",
  },
  linkedin: {
    exported: "linkedin_exported",
    posted: "linkedin_posted",
    postedAt: "linkedin_posted_at",
  },
} as const;

const PLATFORM_KEYS = Object.keys(PLATFORM_COLUMN_MAP) as PlannerPlatform[];

export type PlannerPostInput = {
  title: string;
  weekLabel: string;
  templateType: PlannerTemplateType;
  bestFor: PlannerPlatform;
  platforms: PlannerPlatform[];
  recommendedFormat: string;
  formatVariants: string[];
  status: PlannerStatus;
  notes: string;
  socialAssetKey: string;
  instagramExported: boolean;
  instagramPosted: boolean;
  facebookExported: boolean;
  facebookPosted: boolean;
  linkedinExported: boolean;
  linkedinPosted: boolean;
};

function revalidatePlannerPaths(id?: string) {
  revalidatePath("/admin/planner");
  revalidatePath("/admin/planner/new");
  if (id) {
    revalidatePath(`/admin/planner/${id}`);
  }
}

function toIsoNow() {
  return new Date().toISOString();
}

function normalizeInput(input: PlannerPostInput): PlannerPostInput | null {
  const title = input.title.trim();
  const weekLabel = input.weekLabel.trim();
  const notes = input.notes.trim();
  const socialAssetKey = input.socialAssetKey.trim();
  const recommendedFormat = input.recommendedFormat.trim();

  if (!title || !weekLabel) {
    return null;
  }

  const uniquePlatforms = Array.from(new Set(input.platforms));
  const uniqueVariants = Array.from(new Set(input.formatVariants));

  if (uniquePlatforms.length === 0 || uniqueVariants.length === 0) {
    return null;
  }

  if (!uniquePlatforms.includes(input.bestFor)) {
    return null;
  }

  if (!FORMAT_VALUES.some((value) => value === recommendedFormat)) {
    return null;
  }

  return {
    ...input,
    title,
    weekLabel,
    notes,
    socialAssetKey,
    recommendedFormat,
    platforms: uniquePlatforms,
    formatVariants: uniqueVariants,
  };
}

function deriveGlobalPostedAt(platformState: Record<PlannerPlatform, PlatformFields>) {
  const postedDates = PLATFORM_KEYS.map((platform) => platformState[platform].postedAt)
    .filter((date): date is string => !!date)
    .sort();

  return postedDates.length ? postedDates[postedDates.length - 1] : null;
}

function deriveGlobalStatus(inputStatus: PlannerStatus, platformState: Record<PlannerPlatform, PlatformFields>) {
  const anyPosted = PLATFORM_KEYS.some((platform) => platformState[platform].posted);
  if (anyPosted) {
    return "posted" as const;
  }
  return inputStatus;
}

async function getPlannerPost(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("planner_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Planner post not found.");
  }

  return data as PlannerPost;
}

function buildPlatformStateFromInput(
  input: PlannerPostInput,
  existing?: PlannerPost
): Record<PlannerPlatform, PlatformFields> {
  const now = toIsoNow();
  const nextState: Record<PlannerPlatform, PlatformFields> = {
    instagram: {
      exported: input.instagramExported || input.instagramPosted,
      posted: input.instagramPosted,
      postedAt: null,
    },
    facebook: {
      exported: input.facebookExported || input.facebookPosted,
      posted: input.facebookPosted,
      postedAt: null,
    },
    linkedin: {
      exported: input.linkedinExported || input.linkedinPosted,
      posted: input.linkedinPosted,
      postedAt: null,
    },
  };

  for (const platform of PLATFORM_KEYS) {
    const previousPostedAt = existing?.[PLATFORM_COLUMN_MAP[platform].postedAt] ?? null;
    const previousPosted = existing?.[PLATFORM_COLUMN_MAP[platform].posted] ?? false;

    if (nextState[platform].posted) {
      nextState[platform].postedAt = previousPosted && previousPostedAt ? previousPostedAt : now;
    } else {
      nextState[platform].postedAt = null;
    }
  }

  return nextState;
}

export async function createPlannerPost(
  input: PlannerPostInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const normalized = normalizeInput(input);
  if (!normalized) {
    return { success: false, error: "Fill all required planner fields." };
  }

  try {
    const supabase = createSupabaseServerClient();
    const platformState = buildPlatformStateFromInput(normalized);
    const postedAt = deriveGlobalPostedAt(platformState);
    const status = deriveGlobalStatus(normalized.status, platformState);

    const insertPayload = {
      title: normalized.title,
      week_label: normalized.weekLabel,
      template_type: normalized.templateType,
      best_for: normalized.bestFor,
      platforms: normalized.platforms,
      recommended_format: normalized.recommendedFormat,
      format_variants: normalized.formatVariants,
      status,
      instagram_exported: platformState.instagram.exported,
      instagram_posted: platformState.instagram.posted,
      instagram_posted_at: platformState.instagram.postedAt,
      facebook_exported: platformState.facebook.exported,
      facebook_posted: platformState.facebook.posted,
      facebook_posted_at: platformState.facebook.postedAt,
      linkedin_exported: platformState.linkedin.exported,
      linkedin_posted: platformState.linkedin.posted,
      linkedin_posted_at: platformState.linkedin.postedAt,
      posted_at: postedAt ?? (status === "posted" ? toIsoNow() : null),
      notes: normalized.notes || null,
      social_asset_key: normalized.socialAssetKey || null,
    } satisfies Omit<PlannerPost, "id" | "created_at" | "updated_at">;

    const { data, error } = await supabase
      .from("planner_posts")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create planner post.");
    }

    revalidatePlannerPaths(data.id);
    return { success: true, id: data.id };
  } catch (err) {
    console.error("[admin] createPlannerPost failed:", err);
    return { success: false, error: "Could not create planner post." };
  }
}

export async function updatePlannerPost(
  id: string,
  input: PlannerPostInput
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeInput(input);
  if (!normalized) {
    return { success: false, error: "Fill all required planner fields." };
  }

  try {
    const existing = await getPlannerPost(id);
    const supabase = createSupabaseServerClient();
    const platformState = buildPlatformStateFromInput(normalized, existing);
    const status = deriveGlobalStatus(normalized.status, platformState);
    const postedAt =
      deriveGlobalPostedAt(platformState) ??
      (status === "posted" ? existing.posted_at ?? toIsoNow() : null);

    const updatePayload: Partial<PlannerPost> = {
      title: normalized.title,
      week_label: normalized.weekLabel,
      template_type: normalized.templateType,
      best_for: normalized.bestFor,
      platforms: normalized.platforms,
      recommended_format: normalized.recommendedFormat,
      format_variants: normalized.formatVariants,
      status,
      instagram_exported: platformState.instagram.exported,
      instagram_posted: platformState.instagram.posted,
      instagram_posted_at: platformState.instagram.postedAt,
      facebook_exported: platformState.facebook.exported,
      facebook_posted: platformState.facebook.posted,
      facebook_posted_at: platformState.facebook.postedAt,
      linkedin_exported: platformState.linkedin.exported,
      linkedin_posted: platformState.linkedin.posted,
      linkedin_posted_at: platformState.linkedin.postedAt,
      posted_at: postedAt,
      notes: normalized.notes || null,
      social_asset_key: normalized.socialAssetKey || null,
    };

    const { error } = await supabase.from("planner_posts").update(updatePayload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePlannerPaths(id);
    return { success: true };
  } catch (err) {
    console.error("[admin] updatePlannerPost failed:", err);
    return { success: false, error: "Could not save planner post." };
  }
}

export async function setPlannerStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as PlannerStatus;
  if (!id || !["draft", "ready", "posted"].includes(status)) {
    return;
  }

  try {
    const existing = await getPlannerPost(id);
    const hasPlatformPosted =
      existing.instagram_posted || existing.facebook_posted || existing.linkedin_posted;

    const updatePayload: Partial<PlannerPost> = {
      status,
      posted_at:
        status === "posted"
          ? existing.posted_at ?? toIsoNow()
          : hasPlatformPosted
            ? existing.posted_at
            : null,
    };

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("planner_posts").update(updatePayload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePlannerPaths(id);
  } catch (err) {
    console.error("[admin] setPlannerStatus failed:", err);
  }
}

export async function togglePlannerPlatformFlag(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim() as PlannerPlatform;
  const field = String(formData.get("field") ?? "").trim() as "exported" | "posted";

  if (!id || !PLATFORM_KEYS.includes(platform) || !["exported", "posted"].includes(field)) {
    return;
  }

  try {
    const existing = await getPlannerPost(id);
    const now = toIsoNow();
    const columns = PLATFORM_COLUMN_MAP[platform];

    const state: Record<PlannerPlatform, PlatformFields> = {
      instagram: {
        exported: existing.instagram_exported,
        posted: existing.instagram_posted,
        postedAt: existing.instagram_posted_at,
      },
      facebook: {
        exported: existing.facebook_exported,
        posted: existing.facebook_posted,
        postedAt: existing.facebook_posted_at,
      },
      linkedin: {
        exported: existing.linkedin_exported,
        posted: existing.linkedin_posted,
        postedAt: existing.linkedin_posted_at,
      },
    };

    if (field === "posted") {
      const nextPosted = !state[platform].posted;
      state[platform].posted = nextPosted;
      state[platform].exported = nextPosted ? true : state[platform].exported;
      state[platform].postedAt = nextPosted ? now : null;
    } else {
      const nextExported = !state[platform].exported;
      state[platform].exported = nextExported;
      if (!nextExported) {
        state[platform].posted = false;
        state[platform].postedAt = null;
      }
    }

    const postedAt = deriveGlobalPostedAt(state);
    const hasAnyPosted = PLATFORM_KEYS.some((key) => state[key].posted);
    const nextStatus = hasAnyPosted ? "posted" : existing.status === "posted" ? "ready" : existing.status;

    const updatePayload: Partial<PlannerPost> = {
      [columns.exported]: state[platform].exported,
      [columns.posted]: state[platform].posted,
      [columns.postedAt]: state[platform].postedAt,
      posted_at: postedAt,
      status: nextStatus,
    };

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("planner_posts").update(updatePayload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePlannerPaths(id);
  } catch (err) {
    console.error("[admin] togglePlannerPlatformFlag failed:", err);
  }
}
