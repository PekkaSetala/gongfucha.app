import { NextResponse } from "next/server";
import { searchTeas, type ScoredTeaResult } from "@/lib/rag/retrieve";

const MAX_QUERY_LENGTH = 200;
const DEFAULT_TOP_K = 10;
const MAX_TOP_K = 20;

/**
 * POST /api/guide/search
 *
 * Explore-mode retrieval over the tea corpus: returns top-k scored
 * entries, no confidence gate, no LLM fallback.
 *
 * Request body: { query: string, topK?: number }
 * Response: { results: ScoredTeaResult[] } or { error: string }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body must be an object" },
      { status: 400 }
    );
  }

  const { query, topK } = body as { query?: unknown; topK?: unknown };

  if (typeof query !== "string" || query.length === 0) {
    return NextResponse.json(
      { error: "query must be a non-empty string" },
      { status: 400 }
    );
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `query must be ≤ ${MAX_QUERY_LENGTH} chars` },
      { status: 400 }
    );
  }

  let k: number = DEFAULT_TOP_K;
  if (topK !== undefined) {
    if (typeof topK !== "number" || topK < 1 || topK > MAX_TOP_K) {
      return NextResponse.json(
        { error: `topK must be an integer between 1 and ${MAX_TOP_K}` },
        { status: 400 }
      );
    }
    k = Math.floor(topK);
  }

  try {
    const results: ScoredTeaResult[] = await searchTeas(query, k);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("guide search failed:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
