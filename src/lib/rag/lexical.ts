// src/lib/rag/lexical.ts
// IDF-weighted substring scorer over tea identity fields.
//
// Why substring rather than whitespace-tokenized BM25: queries like "wuyi"
// must match "wuyishan" in the region field. BM25 over whitespace tokens
// would never connect them. For an 84-doc corpus this runs in sub-ms.
//
// Identity text = name + aliases + category + subcategory + region.
// Flavor/tasting text is deliberately excluded — that's the dense retriever's
// job, and mixing them here would dilute the lexical signal.
// Cultivar is excluded because it often cross-references other tea names
// (e.g., huang-guan-yin's cultivar: "Huang Jin Gui x Tie Guan Yin hybrid"
// would match a query for "Tie Guan Yin" and out-rank the real one).

import { getAllEntries } from "@/data/corpus";
import type { TeaEntry } from "@/data/corpus/schema";

function identityText(e: TeaEntry): string {
  return [
    e.name,
    ...e.aliases,
    e.category,
    e.subcategory ?? "",
    e.region,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

interface IndexDoc {
  id: string;
  text: string;
}

let cachedDocs: IndexDoc[] | null = null;

function getDocs(entries?: TeaEntry[]): IndexDoc[] {
  if (entries) {
    return entries.map((e) => ({ id: e.id, text: identityText(e) }));
  }
  if (!cachedDocs) {
    cachedDocs = getAllEntries().map((e) => ({ id: e.id, text: identityText(e) }));
  }
  return cachedDocs;
}

export interface LexicalResult {
  id: string;
  score: number;
  matchedTerms: string[];
}

/**
 * Score every doc by summing IDF weights of query tokens that appear
 * as substrings of its identity text.
 *
 * idf(t) = ln(1 + N / df(t))  where df(t) = number of docs containing t as substring.
 *
 * Rare tokens (df=1) → high IDF (~4.4 on 84 docs). Common tokens collapse.
 *
 * `entries` override is for test isolation — defaults to full corpus.
 */
export function lexicalSearch(
  query: string,
  topK: number = 20,
  entries?: TeaEntry[],
): LexicalResult[] {
  const docs = getDocs(entries);
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const uniqueTokens = [...new Set(tokens)];

  const df = new Map<string, number>();
  for (const t of uniqueTokens) {
    let count = 0;
    for (const d of docs) {
      if (d.text.includes(t)) count++;
    }
    df.set(t, count);
  }

  const scores = new Map<string, { score: number; matched: string[] }>();
  for (const t of uniqueTokens) {
    const dfT = df.get(t) ?? 0;
    if (dfT === 0) continue;
    const idf = Math.log(1 + docs.length / dfT);
    for (const d of docs) {
      if (d.text.includes(t)) {
        const cur = scores.get(d.id) ?? { score: 0, matched: [] };
        cur.score += idf;
        cur.matched.push(t);
        scores.set(d.id, cur);
      }
    }
  }

  return [...scores.entries()]
    .map(([id, { score, matched }]) => ({ id, score, matchedTerms: matched }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
