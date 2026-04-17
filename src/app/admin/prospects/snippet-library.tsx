"use client";

import { useMemo, useState } from "react";
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
}: {
  language: ProspectSnippetLanguage;
  lane: ProspectSnippetLane;
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

  const activeSnippet = useMemo(() => {
    if (snippets.length === 0) return null;
    if (!activeSnippetId) return snippets[0];
    return snippets.find((snippet) => snippet.id === activeSnippetId) ?? snippets[0];
  }, [activeSnippetId, snippets]);

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
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
            Snippet index
          </p>
          <p className="text-[10px] text-zinc-700">
            {totalCount} snippet{totalCount !== 1 ? "s" : ""}
          </p>
        </div>

        {snippetsByCategory.length === 0 ? (
          <div className="mt-3 rounded-lg border border-zinc-800/70 bg-zinc-900/45 p-3 text-xs text-zinc-600">
            No snippets for this language and lane.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-2">
              {snippetsByCategory.map((bucket) => (
                <section
                  key={bucket.category}
                  className="rounded-lg border border-zinc-800/70 bg-zinc-900/35 p-2.5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                      {PROSPECT_SNIPPET_CATEGORY_LABELS[bucket.category]}
                    </p>
                    <span className="text-[10px] text-zinc-700">
                      {bucket.items.length}
                    </span>
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
                              : "border-zinc-800/85 bg-zinc-900/55 hover:border-zinc-700"
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

            <div className="rounded-lg border border-zinc-800/85 bg-zinc-900/50 p-3">
              {activeSnippet ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                        Preview
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-100">
                        {activeSnippet.label}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                        {activeSnippet.useCase}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSnippet.body, activeSnippet.id)}
                      className="inline-flex h-8 shrink-0 items-center rounded-md border border-zinc-700/80 px-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                    >
                      {copiedId === activeSnippet.id ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="rounded-md border border-zinc-800/85 bg-zinc-950/45 p-3">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                      {PROSPECT_SNIPPET_CATEGORY_LABELS[activeSnippet.category]} ·{" "}
                      {activeSnippet.language.toUpperCase()}
                    </p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
                      {activeSnippet.body}
                    </p>
                  </div>

                </div>
              ) : (
                <div className="rounded-md border border-zinc-800/80 bg-zinc-950/45 p-3">
                  <p className="text-xs text-zinc-600">Pick a snippet from the list to preview and copy.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
