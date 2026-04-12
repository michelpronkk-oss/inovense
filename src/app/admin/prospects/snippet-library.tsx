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
  "website_opener",
  "systems_opener",
  "growth_opener",
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

  return (
    <div className="space-y-3">
      {snippetsByCategory.map((bucket) => (
        <section
          key={bucket.category}
          className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3.5"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              {PROSPECT_SNIPPET_CATEGORY_LABELS[bucket.category]}
            </p>
            <p className="text-[10px] text-zinc-700">
              {bucket.items.length} snippet{bucket.items.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-2">
            {bucket.items.map((snippet) => {
              const copied = copiedId === snippet.id;
              return (
                <article
                  key={snippet.id}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-900/45 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-300">{snippet.label}</p>
                    <button
                      type="button"
                      onClick={() => handleCopy(snippet.body, snippet.id)}
                      className="inline-flex items-center rounded-md border border-zinc-700/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                    {snippet.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {snippetsByCategory.length === 0 && (
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-4 text-xs text-zinc-600">
          No snippets for this language + lane combination.
        </div>
      )}
    </div>
  );
}
