"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { InlineViewHeader } from "@/components/InlineViewHeader";
import { corpusCategories } from "@/data/corpus-categories";
import { guideSearchLocal } from "@/lib/guide-search";
import type { TeaEntry, TeaCategory } from "@/data/corpus/schema";

interface GuideIndexProps {
  entries: Record<string, TeaEntry>;
  onOpenPrimer: () => void;
  onOpenEntry: (id: string) => void;
  onBack: () => void;
  initialScrollY?: number;
  onScrollYChange?: (y: number) => void;
}

interface ApiSearchResult {
  id: string;
  score: number;
}

async function fetchApiSearch(query: string, topK: number = 10): Promise<ApiSearchResult[]> {
  const res = await fetch("/api/guide/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, topK }),
  });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  const json = await res.json();
  return json.results as ApiSearchResult[];
}

function extractChineseName(entry: TeaEntry): string | undefined {
  for (const alias of entry.aliases) {
    if (/[\u4e00-\u9fff]/.test(alias)) return alias;
  }
  return undefined;
}

export function GuideIndex({
  entries,
  onOpenPrimer,
  onOpenEntry,
  onBack,
  initialScrollY,
  onScrollYChange,
}: GuideIndexProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<TeaCategory | null>(null);
  const [searchIds, setSearchIds] = useState<string[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore scroll on mount
  useEffect(() => {
    if (initialScrollY !== undefined && scrollRef.current) {
      scrollRef.current.scrollTop = initialScrollY;
    }
  }, [initialScrollY]);

  // Track scroll for restoration on leave
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onScrollYChange) return;
    const handler = () => onScrollYChange(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [onScrollYChange]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchIds(null);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        const results = await fetchApiSearch(q, 10);
        if (!cancelled) setSearchIds(results.map((r) => r.id));
      } catch {
        // Fallback: client-side substring search
        if (cancelled) return;
        const local = guideSearchLocal(entries, q, 10);
        setSearchIds(local.map((m) => m.entry.id));
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query, entries]);

  // Compute the list to show
  const visibleEntries = useMemo(() => {
    const allEntries = Object.values(entries);

    let filtered: TeaEntry[];
    if (searchIds !== null) {
      // Search active — order by search ranking
      const byId = new Map(allEntries.map((e) => [e.id, e]));
      filtered = searchIds
        .map((id) => byId.get(id))
        .filter((e): e is TeaEntry => e !== undefined);
    } else {
      // No search — alphabetical by English name
      filtered = [...allEntries].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (activeCategory) {
      filtered = filtered.filter((e) => e.category === activeCategory);
    }

    return filtered;
  }, [entries, searchIds, activeCategory]);

  return (
    <div ref={scrollRef} className="min-h-[100dvh] bg-surface overflow-y-auto">
      <InlineViewHeader title="Tea guide" onBack={onBack} />

      <div className="max-w-[680px] mx-auto px-5 py-6">
        {/* Primer link */}
        <button
          type="button"
          onClick={onOpenPrimer}
          className="w-full text-left font-serif-cn text-[16px] text-primary pb-5 mb-5 border-b border-border"
        >
          New to gongfu? Start here <span aria-hidden="true">→</span>
        </button>

        {/* Search input */}
        <label className="sr-only" htmlFor="guide-search-input">
          Search teas by name, flavor, or region
        </label>
        <input
          id="guide-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, flavor, region…"
          className="w-full px-4 py-3 mb-4 bg-surface border border-border rounded-[12px] text-[14px] text-primary placeholder:text-tertiary/60 focus:outline-none focus:border-tertiary"
          maxLength={200}
        />

        {/* Category chips */}
        <div
          role="radiogroup"
          aria-label="Filter by category"
          className="flex gap-2 mb-6 overflow-x-auto scrollbar-none"
        >
          <button
            type="button"
            role="radio"
            aria-checked={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full border text-[12px] whitespace-nowrap ${
              activeCategory === null
                ? "border-tertiary text-primary"
                : "border-border text-tertiary"
            }`}
          >
            All
          </button>
          {corpusCategories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setActiveCategory(active ? null : cat.id)}
                className={`px-3 py-1.5 rounded-full border text-[12px] whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? "border-tertiary text-primary"
                    : "border-border text-tertiary"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden="true"
                />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        {visibleEntries.length === 0 ? (
          <p className="text-center text-[13px] text-tertiary py-12">
            No teas match that.
          </p>
        ) : (
          <ul className="list-none pl-0 space-y-0">
            {visibleEntries.map((entry) => {
              const chinese = extractChineseName(entry);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onOpenEntry(entry.id)}
                    className="w-full flex items-center gap-3 py-3.5 text-left border-b border-border/40 hover:bg-border/10"
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: corpusCategories.find(
                          (c) => c.id === entry.category
                        )?.color ?? "#888",
                      }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block font-serif-cn text-[15px] text-primary truncate">
                        {entry.name}
                      </span>
                      {chinese && (
                        <span
                          lang="zh"
                          className="block text-[12px] text-tertiary truncate"
                        >
                          {chinese}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
