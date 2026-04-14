// src/lib/rag/retrieve.ts
// Hybrid retrieval: lexical (substring + IDF) + dense (Qdrant embeddings).
//
// Two-tier decision: run both retrievers always, then pick the stronger
// signal. If neither signal is strong, return []  — the caller falls
// back to the LLM. No magic score threshold tuning, no late name-boost
// hack.
//
// Tier 1 — lexical strong: top1 lex score >= LEX_STRONG_SCORE.
//           Handles exact name / alias / high-IDF facet queries
//           ("Big Red Robe", "Iron Goddess", "Hangzhou green tea").
//
// Tier 2 — dense strong: top1 dense cosine >= DENSE_STRONG_SCORE.
//           Handles rich descriptive queries with no identity tokens
//           ("smooth earthy ripe pu-erh").
//
// Else    — return []. Caller falls back to LLM.
//
// Graceful degradation: if Qdrant throws, lex-only still answers exact
// name/alias queries. Exact-name users never see "AI service unavailable".

import { embedText } from "./embed";
import { QdrantClient, type QdrantSearchResult } from "./qdrant";
import { lexicalSearch } from "./lexical";
import { getEntryById } from "@/data/corpus";
import type { TeaEntry } from "@/data/corpus/schema";

const COLLECTION = "teas";
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";

// Tier gates. Calibrated against scripts/rag-eval.ts on the 84-doc corpus.
//
// LEX_STRONG_SCORE = 4.0
//   Single rare identity token (df=1) scores ~4.44 on N=84.
//   Two medium-common tokens (df≈6) sum to ~4.2.
//   Out-of-corpus queries top out at "tea" ≈ 1.73 — comfortably below.
//
// DENSE_STRONG_SCORE = 0.55
//   Raised slightly from the old firefighting threshold of 0.5.
//   Rich descriptive queries that are actually in-corpus land at 0.55+;
//   OOC queries on the mini model top out at ~0.49.
export const LEX_STRONG_SCORE = 4.0;
export const DENSE_STRONG_SCORE = 0.55;

const LEX_TOPK = 20;
const DENSE_TOPK = 20;

export interface ScoredTeaResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

function entryToPayload(entry: TeaEntry): Record<string, unknown> {
  return {
    slug: entry.id,
    name: entry.name,
    aliases: entry.aliases,
    category: entry.category,
    entry: JSON.stringify(entry),
  };
}

function wrapLex(id: string, score: number): ScoredTeaResult | null {
  const entry = getEntryById(id);
  if (!entry) return null;
  return { id, score, payload: entryToPayload(entry) };
}

function wrapDense(r: QdrantSearchResult): ScoredTeaResult {
  const slug = (r.payload.slug as string | undefined) ?? (r.id as string);
  return { id: slug, score: r.score, payload: r.payload };
}

async function denseSearch(
  query: string,
  topK: number,
  collection: string,
): Promise<QdrantSearchResult[]> {
  const client = new QdrantClient(QDRANT_URL);
  const vector = await embedText(query);
  return client.search(collection, vector, topK);
}

/**
 * Searches the tea corpus with hybrid retrieval.
 *
 * Contract change from the old version: returns `[]` when no tier
 * fires, signalling the caller to fall back to LLM. Callers no
 * longer apply a threshold.
 */
export async function searchTeas(
  query: string,
  topK: number = 3,
  collection: string = COLLECTION,
): Promise<ScoredTeaResult[]> {
  // Always run both. Tiers only choose which to trust.
  const lex = lexicalSearch(query, LEX_TOPK);

  let dense: QdrantSearchResult[] = [];
  try {
    dense = await denseSearch(query, DENSE_TOPK, collection);
  } catch (err) {
    // Graceful degradation: lex-only still serves exact-name queries.
    console.warn("dense retrieval failed, continuing with lexical only:", err);
  }

  // Tier 1 — lexical strong
  if (lex.length > 0 && lex[0].score >= LEX_STRONG_SCORE) {
    const wrapped = lex
      .slice(0, topK)
      .map((r) => wrapLex(r.id, r.score))
      .filter((r): r is ScoredTeaResult => r !== null);
    if (wrapped.length > 0) return wrapped;
  }

  // Tier 2 — dense strong
  if (dense.length > 0 && dense[0].score >= DENSE_STRONG_SCORE) {
    return dense.slice(0, topK).map(wrapDense);
  }

  // No confident signal — caller falls back.
  return [];
}
