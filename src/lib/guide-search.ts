import type { TeaEntry } from "@/data/corpus/schema";

export interface GuideSearchMatch {
  entry: TeaEntry;
  score: number;
}

/**
 * Client-side fallback search over the loaded corpus entries. Used when
 * /api/guide/search is unavailable (offline, Qdrant down). Also used for
 * instant feedback while a network request is in flight.
 *
 * Scoring is coarse by design — Qdrant is the authoritative ranker; this
 * is the "something is better than nothing" path. Higher score = better
 * match.
 *
 * Fields scanned (in order of signal strength):
 *   - name (exact / prefix / substring)
 *   - aliases (exact / substring)
 *   - category (exact)
 *   - aroma + taste notes (substring)
 */
export function guideSearchLocal(
  entries: Record<string, TeaEntry>,
  query: string,
  limit: number = 10
): GuideSearchMatch[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const matches: GuideSearchMatch[] = [];

  for (const entry of Object.values(entries)) {
    let score = 0;

    const name = entry.name.toLowerCase();
    if (name === q) score += 10;
    else if (name.startsWith(q)) score += 7;
    else if (name.includes(q)) score += 5;

    for (const alias of entry.aliases) {
      const a = alias.toLowerCase();
      if (a === q) score += 8;
      else if (a.includes(q)) score += 3;
    }

    if (entry.category.toLowerCase() === q) score += 4;

    for (const note of entry.aroma_notes) {
      if (note.toLowerCase().includes(q)) score += 1;
    }
    for (const note of entry.taste_notes) {
      if (note.toLowerCase().includes(q)) score += 1;
    }

    if (score > 0) matches.push({ entry, score });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}
