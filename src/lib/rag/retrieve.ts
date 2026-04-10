// src/lib/rag/retrieve.ts
// Retrieval function: embed query → search Qdrant → boost name/alias matches → return scored results.

import { embedText } from "./embed";
import { QdrantClient, type QdrantSearchResult } from "./qdrant";

export const CONFIDENCE_THRESHOLD = 0.5;
export const NAME_BOOST = 0.15;

const COLLECTION = "teas";
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";

export interface ScoredTeaResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

/**
 * Searches the tea corpus for the given query.
 *
 * Steps:
 * 1. Embed the query to a 384-dim vector.
 * 2. Search Qdrant for the top topK*2 candidates (wider net before boosting).
 * 3. Apply NAME_BOOST when the query substring-matches the tea name or any alias
 *    (case-insensitive, bidirectional substring check).
 * 4. Re-sort by boosted score, return top topK.
 *
 * Tradeoff: fetching topK*2 before trimming means one extra candidate slot is
 * considered, keeping results that might rank up after boosting.
 */
export async function searchTeas(
  query: string,
  topK: number = 3,
  collection: string = COLLECTION
): Promise<ScoredTeaResult[]> {
  const client = new QdrantClient(QDRANT_URL);
  const queryVector = await embedText(query);
  const results = await client.search(collection, queryVector, topK * 2);

  const queryLower = query.toLowerCase();

  const boosted: ScoredTeaResult[] = results.map((r: QdrantSearchResult) => {
    let score = r.score;

    const name = String(r.payload.name || "").toLowerCase();
    const aliases = (r.payload.aliases as string[]) || [];
    const aliasesLower = aliases.map((a: string) => a.toLowerCase());

    const nameMatch =
      name.includes(queryLower) ||
      queryLower.includes(name) ||
      aliasesLower.some(
        (a: string) => a.includes(queryLower) || queryLower.includes(a)
      );

    if (nameMatch) {
      score += NAME_BOOST;
    }

    return { id: r.id as string, score, payload: r.payload };
  });

  boosted.sort((a, b) => b.score - a.score);

  return boosted.slice(0, topK);
}
