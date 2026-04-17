"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  PROSPECT_SNIPPETS,
  PROSPECT_SNIPPET_CATEGORY_LABELS,
  type ProspectSnippetCategory,
  type ProspectSnippetLanguage,
  type ProspectSnippetLane,
} from "./snippets";

const CATEGORY_ORDER: ProspectSnippetCategory[] = [
  "website_trust_opener",
  "conversion_next_step_opener",
  "systems_follow_up_opener",
  "growth_demand_capture_opener",
  "local_service_opener",
  "agency_peer_opener",
  "follow_up_1",
  "follow_up_2",
  "soft_bump",
  "referral_ask",
  "not_now_follow_up",
];

export default function SnippetLibrary({
  language,
  lane,
  triggerLabel = "Open snippet library",
  triggerClassName,
}: {
  language: ProspectSnippetLanguage;
  lane: ProspectSnippetLane;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);

  const snippets = useMemo(() => {
    return PROSPECT_SNIPPETS.filter((snippet) => {
      if (snippet.language !== language) return false;
      if (lane === "all") return true;
      return snippet.lane === "all" || snippet.lane === lane;
    });
  }, [language, lane]);

  const snippetsByCategory = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: snippets.filter((snippet) => snippet.category === category),
    })).filter((bucket) => bucket.items.length > 0);
  }, [snippets]);

  const preferredSnippet = useMemo(() => {
    if (snippets.length === 0) return null;
    return snippets.find((snippet) => snippet.lane === lane) ?? snippets[0];
  }, [lane, snippets]);

  const activeSnippet = useMemo(() => {
    if (snippets.length === 0) return null;
    if (!activeSnippetId) return preferredSnippet;
    return snippets.find((snippet) => snippet.id === activeSnippetId) ?? preferredSnippet;
  }, [activeSnippetId, preferredSnippet, snippets]);

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1300);
    } catch {
      setCopiedId(null);
    }
  }

  const totalCount = snippets.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            "inline-flex h-8 items-center rounded-lg border border-brand/30 bg-brand/10 px-3 text-[10px] font-medium uppercase tracking-[0.09em] text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
          }
        >
          {triggerLabel}
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="border-zinc-800 bg-zinc-950 p-0 text-zinc-100 data-[side=right]:w-full data-[side=right]:sm:max-w-[min(1160px,96vw)]"
      >
        <SheetHeader className="border-b border-zinc-800/80 bg-zinc-900/65 px-5 py-4 sm:px-6">
          <SheetTitle className="text-sm font-medium text-zinc-100">Snippet library</SheetTitle>
          <SheetDescription className="text-xs text-zinc-500">
            Internal operator support only. Preview first, then copy.
          </SheetDescription>
          <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
            {language.toUpperCase()} · {totalCount} snippet{totalCount !== 1 ? "s" : ""}
          </p>
        </SheetHeader>

        {snippetsByCategory.length === 0 ? (
          <div className="px-5 py-6 sm:px-6">
            <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/45 p-3 text-xs text-zinc-600">
              No snippets for this language and lane.
            </div>
          </div>
        ) : (
          <div className="grid h-[calc(100dvh-112px)] grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]">
            <div className="border-b border-zinc-800/70 bg-zinc-900/35 px-4 py-4 md:h-full md:overflow-y-auto md:border-b-0 md:border-r">
              <div className="space-y-2.5">
                {snippetsByCategory.map((bucket) => (
                  <section key={bucket.category} className="rounded-lg border border-zinc-800/70 bg-zinc-900/45 p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                        {PROSPECT_SNIPPET_CATEGORY_LABELS[bucket.category]}
                      </p>
                      <span className="text-[10px] text-zinc-700">{bucket.items.length}</span>
                    </div>

                    <div className="space-y-1.5">
                      {bucket.items.map((snippet) => {
                        const isActive = activeSnippet?.id === snippet.id;
                        return (
                          <button
                            key={snippet.id}
                            type="button"
                            onClick={() => setActiveSnippetId(snippet.id)}
                            className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                              isActive
                                ? "border-brand/40 bg-brand/10"
                                : "border-zinc-800/85 bg-zinc-900/60 hover:border-zinc-700"
                            }`}
                          >
                            <p className="text-[11px] font-medium text-zinc-200">{snippet.label}</p>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                              {snippet.useCase}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="h-full overflow-y-auto px-5 py-5 sm:px-6">
              {activeSnippet ? (
                <div className="mx-auto w-full max-w-3xl space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                        Preview
                      </p>
                      <p className="mt-1 text-base font-medium text-zinc-100">{activeSnippet.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{activeSnippet.useCase}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSnippet.body, activeSnippet.id)}
                      className="inline-flex h-9 shrink-0 items-center rounded-lg border border-zinc-700/85 px-3 text-xs font-medium uppercase tracking-[0.08em] text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                    >
                      {copiedId === activeSnippet.id ? "Copied" : "Copy snippet"}
                    </button>
                  </div>

                  <div className="rounded-xl border border-zinc-800/85 bg-zinc-900/50 p-4 sm:p-5">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                      {PROSPECT_SNIPPET_CATEGORY_LABELS[activeSnippet.category]} ·{" "}
                      {activeSnippet.language.toUpperCase()}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                      {activeSnippet.body}
                    </p>
                  </div>

                  <p className="text-[11px] text-zinc-600">
                    Tip: replace placeholders before sending.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/45 p-3 text-xs text-zinc-600">
                  Pick a snippet from the index to preview and copy.
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
