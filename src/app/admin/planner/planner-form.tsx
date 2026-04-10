"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlannerPost } from "@/lib/supabase-server";
import { createPlannerPost, updatePlannerPost, type PlannerPostInput } from "./actions";
import {
  FORMAT_OPTIONS,
  PLATFORM_LABELS,
  PLATFORM_OPTIONS,
  PLANNER_STATUS_OPTIONS,
  TEMPLATE_OPTIONS,
} from "./config";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-700 outline-none transition focus:border-zinc-600 focus:ring-0 sm:text-sm";

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-base text-zinc-100 outline-none transition focus:border-zinc-600 focus:ring-0 appearance-none sm:text-sm";

const textareaClass = `${inputClass} min-h-[116px] resize-y`;

type PlannerFormMode = "create" | "edit";

type PlannerFormValues = PlannerPostInput;

function createDefaultValues(): PlannerFormValues {
  return {
    title: "",
    weekLabel: "",
    templateType: "authority",
    bestFor: "linkedin",
    platforms: ["linkedin"],
    recommendedFormat: "1:1 Square",
    formatVariants: ["1:1 Square"],
    status: "draft",
    notes: "",
    socialAssetKey: "",
    instagramExported: false,
    instagramPosted: false,
    facebookExported: false,
    facebookPosted: false,
    linkedinExported: false,
    linkedinPosted: false,
  };
}

function mapPostToValues(post: PlannerPost): PlannerFormValues {
  return {
    title: post.title,
    weekLabel: post.week_label,
    templateType: post.template_type,
    bestFor: post.best_for,
    platforms: post.platforms,
    recommendedFormat: post.recommended_format,
    formatVariants: post.format_variants,
    status: post.status,
    notes: post.notes ?? "",
    socialAssetKey: post.social_asset_key ?? "",
    instagramExported: post.instagram_exported,
    instagramPosted: post.instagram_posted,
    facebookExported: post.facebook_exported,
    facebookPosted: post.facebook_posted,
    linkedinExported: post.linkedin_exported,
    linkedinPosted: post.linkedin_posted,
  };
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
      {children}
      {required ? <span className="ml-1 text-brand/70">*</span> : null}
    </p>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-5 py-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
          {title}
        </h2>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </div>
  );
}

function PlatformStateEditor({
  label,
  exported,
  posted,
  onExportedChange,
  onPostedChange,
}: {
  label: string;
  exported: boolean;
  posted: boolean;
  onExportedChange: (next: boolean) => void;
  onPostedChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
      <p className="mb-2 text-[11px] text-zinc-400">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={exported}
            onChange={(event) => onExportedChange(event.target.checked)}
            className="h-3.5 w-3.5 accent-[#49A0A4]"
          />
          Exported
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={posted}
            onChange={(event) => onPostedChange(event.target.checked)}
            className="h-3.5 w-3.5 accent-[#49A0A4]"
          />
          Posted
        </label>
      </div>
    </div>
  );
}

export default function PlannerForm({
  mode,
  initialPost,
}: {
  mode: PlannerFormMode;
  initialPost?: PlannerPost;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const initialValues = useMemo(
    () => (initialPost ? mapPostToValues(initialPost) : createDefaultValues()),
    [initialPost]
  );

  const [fields, setFields] = useState<PlannerFormValues>(initialValues);

  const activeVariantOptions = fields.formatVariants.length
    ? fields.formatVariants
    : [fields.recommendedFormat];

  function setField<K extends keyof PlannerFormValues>(key: K, value: PlannerFormValues[K]) {
    setFields((previous) => ({ ...previous, [key]: value }));
  }

  function togglePlatform(platform: PlannerFormValues["bestFor"]) {
    setFields((previous) => {
      const exists = previous.platforms.includes(platform);
      let nextPlatforms = previous.platforms;
      if (exists) {
        if (previous.platforms.length === 1) {
          return previous;
        }
        nextPlatforms = previous.platforms.filter((item) => item !== platform);
      } else {
        nextPlatforms = [...previous.platforms, platform];
      }

      const next: PlannerFormValues = {
        ...previous,
        platforms: nextPlatforms,
        bestFor: nextPlatforms.includes(previous.bestFor) ? previous.bestFor : nextPlatforms[0],
      };

      if (!nextPlatforms.includes("instagram")) {
        next.instagramExported = false;
        next.instagramPosted = false;
      }
      if (!nextPlatforms.includes("facebook")) {
        next.facebookExported = false;
        next.facebookPosted = false;
      }
      if (!nextPlatforms.includes("linkedin")) {
        next.linkedinExported = false;
        next.linkedinPosted = false;
      }

      return next;
    });
  }

  function toggleVariant(value: string) {
    setFields((previous) => {
      const exists = previous.formatVariants.includes(value);
      let nextVariants = previous.formatVariants;
      if (exists) {
        if (previous.formatVariants.length === 1) {
          return previous;
        }
        nextVariants = previous.formatVariants.filter((item) => item !== value);
      } else {
        nextVariants = [...previous.formatVariants, value];
      }

      return {
        ...previous,
        formatVariants: nextVariants,
        recommendedFormat: nextVariants.includes(previous.recommendedFormat)
          ? previous.recommendedFormat
          : nextVariants[0],
      };
    });
  }

  function setPlatformPosted(
    platform: "instagram" | "facebook" | "linkedin",
    checked: boolean
  ) {
    if (platform === "instagram") {
      setFields((previous) => ({
        ...previous,
        instagramPosted: checked,
        instagramExported: checked ? true : previous.instagramExported,
      }));
      return;
    }
    if (platform === "facebook") {
      setFields((previous) => ({
        ...previous,
        facebookPosted: checked,
        facebookExported: checked ? true : previous.facebookExported,
      }));
      return;
    }
    setFields((previous) => ({
      ...previous,
      linkedinPosted: checked,
      linkedinExported: checked ? true : previous.linkedinExported,
    }));
  }

  function setPlatformExported(
    platform: "instagram" | "facebook" | "linkedin",
    checked: boolean
  ) {
    if (platform === "instagram") {
      setFields((previous) => ({
        ...previous,
        instagramExported: checked,
        instagramPosted: checked ? previous.instagramPosted : false,
      }));
      return;
    }
    if (platform === "facebook") {
      setFields((previous) => ({
        ...previous,
        facebookExported: checked,
        facebookPosted: checked ? previous.facebookPosted : false,
      }));
      return;
    }
    setFields((previous) => ({
      ...previous,
      linkedinExported: checked,
      linkedinPosted: checked ? previous.linkedinPosted : false,
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const payload: PlannerPostInput = {
        ...fields,
        title: fields.title.trim(),
        weekLabel: fields.weekLabel.trim(),
        notes: fields.notes.trim(),
        socialAssetKey: fields.socialAssetKey.trim(),
      };

      if (mode === "create") {
        const result = await createPlannerPost(payload);
        if (!result.success) {
          setError(result.error ?? "Could not create planner item.");
          return;
        }
        router.push(result.id ? `/admin/planner/${result.id}` : "/admin/planner");
        return;
      }

      if (!initialPost?.id) {
        setError("Missing planner item id.");
        return;
      }

      const result = await updatePlannerPost(initialPost.id, payload);
      if (!result.success) {
        setError(result.error ?? "Could not update planner item.");
        return;
      }
      setMessage("Planner item saved.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-7">
        <Link
          href="/admin/planner"
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to planner
        </Link>
        <h1 className="text-xl font-semibold text-zinc-50">
          {mode === "create" ? "New planner item" : "Edit planner item"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Operational post tracking for weekly publishing across LinkedIn, Instagram, and Facebook.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <SectionCard title="Post details">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label required>Title</Label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="SilentSpend case spotlight"
                    value={fields.title}
                    onChange={(event) => setField("title", event.target.value)}
                  />
                </div>

                <div>
                  <Label required>Week</Label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Week 19"
                    value={fields.weekLabel}
                    onChange={(event) => setField("weekLabel", event.target.value)}
                  />
                </div>

                <div>
                  <Label required>Template</Label>
                  <SelectWrapper>
                    <select
                      className={selectClass}
                      value={fields.templateType}
                      onChange={(event) =>
                        setField("templateType", event.target.value as PlannerFormValues["templateType"])
                      }
                    >
                      {TEMPLATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <Label required>Status</Label>
                  <SelectWrapper>
                    <select
                      className={selectClass}
                      value={fields.status}
                      onChange={(event) =>
                        setField("status", event.target.value as PlannerFormValues["status"])
                      }
                    >
                      {PLANNER_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <Label>Social preset key</Label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="w17-carousel-web"
                    value={fields.socialAssetKey}
                    onChange={(event) => setField("socialAssetKey", event.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Notes</Label>
                  <textarea
                    className={textareaClass}
                    value={fields.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    placeholder="Optional operator notes, scheduling context, or post intent."
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-1">
            <SectionCard title="Platform planning">
              <div>
                <Label required>Platforms</Label>
                <div className="flex flex-col gap-2">
                  {PLATFORM_OPTIONS.map((option) => (
                    <label key={option.value} className="inline-flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={fields.platforms.includes(option.value)}
                        onChange={() => togglePlatform(option.value)}
                        className="h-3.5 w-3.5 accent-[#49A0A4]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label required>Best for</Label>
                <SelectWrapper>
                  <select
                    className={selectClass}
                    value={fields.bestFor}
                    onChange={(event) =>
                      setField("bestFor", event.target.value as PlannerFormValues["bestFor"])
                    }
                  >
                    {fields.platforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {PLATFORM_LABELS[platform]}
                      </option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>

              <div>
                <Label required>Format variants</Label>
                <div className="flex flex-col gap-2">
                  {FORMAT_OPTIONS.map((option) => (
                    <label key={option.value} className="inline-flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={fields.formatVariants.includes(option.value)}
                        onChange={() => toggleVariant(option.value)}
                        className="h-3.5 w-3.5 accent-[#49A0A4]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label required>Recommended format</Label>
                <SelectWrapper>
                  <select
                    className={selectClass}
                    value={fields.recommendedFormat}
                    onChange={(event) => setField("recommendedFormat", event.target.value)}
                  >
                    {activeVariantOptions.map((variant) => (
                      <option key={variant} value={variant}>
                        {variant}
                      </option>
                    ))}
                  </select>
                </SelectWrapper>
              </div>
            </SectionCard>

            <SectionCard title="Usage state">
              <PlatformStateEditor
                label="Instagram"
                exported={fields.instagramExported}
                posted={fields.instagramPosted}
                onExportedChange={(checked) => setPlatformExported("instagram", checked)}
                onPostedChange={(checked) => setPlatformPosted("instagram", checked)}
              />
              <PlatformStateEditor
                label="Facebook"
                exported={fields.facebookExported}
                posted={fields.facebookPosted}
                onExportedChange={(checked) => setPlatformExported("facebook", checked)}
                onPostedChange={(checked) => setPlatformPosted("facebook", checked)}
              />
              <PlatformStateEditor
                label="LinkedIn"
                exported={fields.linkedinExported}
                posted={fields.linkedinPosted}
                onExportedChange={(checked) => setPlatformExported("linkedin", checked)}
                onPostedChange={(checked) => setPlatformPosted("linkedin", checked)}
              />
            </SectionCard>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <p className={`text-sm ${message ? "text-brand" : "text-zinc-700"}`}>
              {message ?? "Planner item saves to CRM with platform-aware status tracking."}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/admin/planner"
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg border border-brand/30 bg-brand/10 px-5 py-2 text-sm font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/15 disabled:opacity-50"
            >
              {isPending ? "Saving..." : mode === "create" ? "Create planner item" : "Save planner item"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
