import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  createSupabaseServerClient,
  type PlannerPlatform,
  type PlannerPost,
  type PlannerStatus,
  type PlannerTemplateType,
} from "@/lib/supabase-server";
import { PlannerFilter } from "./planner-filter";
import {
  PLATFORM_LABELS,
  PLATFORM_OPTIONS,
  PLANNER_STATUS_OPTIONS,
  STATUS_COLORS,
  STATUS_LABELS,
  TEMPLATE_LABELS,
} from "./config";
import { PLANNER_SEED_POSTS } from "./seed";
import { setPlannerStatus, togglePlannerPlatformFlag } from "./actions";

export const metadata: Metadata = { title: "Planner | Inovense CRM" };
export const dynamic = "force-dynamic";

function isPlannerStatus(value: string): value is PlannerStatus {
  return value === "draft" || value === "ready" || value === "posted";
}

function isPlannerPlatform(value: string): value is PlannerPlatform {
  return value === "instagram" || value === "facebook" || value === "linkedin";
}

function isPlannerTemplateType(value: string): value is PlannerTemplateType {
  return (
    value === "authority" ||
    value === "service" ||
    value === "offer" ||
    value === "quote" ||
    value === "carousel" ||
    value === "custom"
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not posted";
  }
  return format(new Date(value), "MMM d, yyyy HH:mm");
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { week, platform, status, template } = await searchParams;

  const activePlatform = platform && isPlannerPlatform(platform) ? platform : null;
  const activeStatus = status && isPlannerStatus(status) ? status : null;
  const activeTemplate = template && isPlannerTemplateType(template) ? template : null;

  let posts: PlannerPost[] = [];
  let weeks: string[] = [];
  let error: string | null = null;

  try {
    const supabase = createSupabaseServerClient();

    const { count, error: countError } = await supabase
      .from("planner_posts")
      .select("id", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    if (!count) {
      await supabase.from("planner_posts").insert(PLANNER_SEED_POSTS);
    }

    let query = supabase
      .from("planner_posts")
      .select("*")
      .order("week_label", { ascending: false })
      .order("created_at", { ascending: false });

    if (week) {
      query = query.eq("week_label", week);
    }
    if (activePlatform) {
      query = query.contains("platforms", [activePlatform]);
    }
    if (activeStatus) {
      query = query.eq("status", activeStatus);
    }
    if (activeTemplate) {
      query = query.eq("template_type", activeTemplate);
    }

    const [{ data: postData, error: postError }, { data: weekData, error: weekError }] =
      await Promise.all([
        query,
        supabase
          .from("planner_posts")
          .select("week_label")
          .order("week_label", { ascending: false }),
      ]);

    if (postError) {
      throw postError;
    }
    if (weekError) {
      throw weekError;
    }

    posts = (postData ?? []) as PlannerPost[];
    weeks = Array.from(new Set((weekData ?? []).map((item) => item.week_label)));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load planner posts.";
  }

  const hasFilters = !!(week || activePlatform || activeStatus || activeTemplate);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Planner</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {error
              ? "Could not load planner entries."
              : `${posts.length} planner entr${posts.length === 1 ? "y" : "ies"}${hasFilters ? " matching filters" : ""}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PlannerFilter weeks={weeks} />
          <Link
            href="/admin/planner/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-3 text-xs font-medium text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New item
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {!error && posts.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <span className="h-1.5 w-1.5 rounded-full bg-brand/50" />
          </div>
          <p className="text-sm text-zinc-500">
            {hasFilters
              ? "No planner entries match the current filters."
              : "No planner entries yet. Create the first weekly post item."}
          </p>
        </div>
      ) : null}

      {!error && posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/25 p-4 md:p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-medium text-zinc-100">{post.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-zinc-700/80 px-2 py-0.5 text-[11px] text-zinc-400">
                      {post.week_label}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_COLORS[post.status]
                      }`}
                    >
                      {STATUS_LABELS[post.status]}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-zinc-700/80 px-2 py-0.5 text-[11px] text-zinc-400">
                      {TEMPLATE_LABELS[post.template_type]}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-zinc-700/80 px-2 py-0.5 text-[11px] text-zinc-400">
                      Best for {PLATFORM_LABELS[post.best_for]}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={setPlannerStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={post.id} />
                    {PLANNER_STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        name="status"
                        value={option.value}
                        className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                          post.status === option.value
                            ? "border-brand/40 bg-brand/12 text-brand"
                            : "border-zinc-700/70 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </form>

                  <Link
                    href={`/admin/planner/${post.id}`}
                    className="rounded-md border border-zinc-700/70 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                  >
                    Edit
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    Format
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    Recommended: {post.recommended_format}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Variants: {post.format_variants.join(", ")}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                    Posting
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    Overall posted: {formatDateTime(post.posted_at)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Platforms: {post.platforms.map((item) => PLATFORM_LABELS[item]).join(", ")}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                {PLATFORM_OPTIONS.map((platformOption) => {
                  const isTargeted = post.platforms.includes(platformOption.value);
                  const exported = post[`${platformOption.value}_exported`];
                  const posted = post[`${platformOption.value}_posted`];
                  const postedAt = post[`${platformOption.value}_posted_at`];

                  return (
                    <div
                      key={platformOption.value}
                      className={`rounded-lg border px-3 py-2 ${
                        isTargeted
                          ? "border-zinc-800/70 bg-zinc-900/35"
                          : "border-zinc-900 bg-zinc-950/40"
                      }`}
                    >
                      <p className="mb-2 text-xs text-zinc-400">{platformOption.label}</p>

                      {isTargeted ? (
                        <>
                          <div className="flex items-center gap-2">
                            <form action={togglePlannerPlatformFlag}>
                              <input type="hidden" name="id" value={post.id} />
                              <input type="hidden" name="platform" value={platformOption.value} />
                              <button
                                type="submit"
                                name="field"
                                value="exported"
                                className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                                  exported
                                    ? "border-brand/40 bg-brand/12 text-brand"
                                    : "border-zinc-700/70 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                                }`}
                              >
                                {exported ? "Exported" : "Mark exported"}
                              </button>
                            </form>

                            <form action={togglePlannerPlatformFlag}>
                              <input type="hidden" name="id" value={post.id} />
                              <input type="hidden" name="platform" value={platformOption.value} />
                              <button
                                type="submit"
                                name="field"
                                value="posted"
                                className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                                  posted
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : "border-zinc-700/70 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                                }`}
                              >
                                {posted ? "Posted" : "Mark posted"}
                              </button>
                            </form>
                          </div>

                          <p className="mt-2 text-[11px] text-zinc-500">
                            {posted ? formatDateTime(postedAt) : "Not posted"}
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] text-zinc-700">Not targeted</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {post.notes ? <p className="mt-4 text-sm text-zinc-500">{post.notes}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
