// src/lib/rag/qdrant.ts
// Thin Qdrant REST client — raw fetch, no library dependency.
// Three operations: ensure collection, upsert points, search.

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface QdrantSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export class QdrantClient {
  constructor(
    private baseUrl: string,
    private apiKey?: string,
  ) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { ...extra };
    if (this.apiKey) h["api-key"] = this.apiKey;
    return h;
  }

  /**
   * Creates the collection if it does not yet exist.
   * Uses cosine distance — appropriate for normalised text embeddings.
   */
  async ensureCollection(name: string, vectorSize: number): Promise<void> {
    const check = await fetch(`${this.baseUrl}/collections/${name}`, {
      headers: this.headers(),
    });
    if (check.ok) return;

    const res = await fetch(`${this.baseUrl}/collections/${name}`, {
      method: "PUT",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to create collection "${name}": ${body}`);
    }
  }

  /**
   * Upserts points into a collection (insert or overwrite by id).
   */
  async upsert(collection: string, points: QdrantPoint[]): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/collections/${collection}/points`,
      {
        method: "PUT",
        headers: this.headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ points }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Qdrant upsert failed: ${body}`);
    }
  }

  /**
   * Returns the top-k nearest neighbours by cosine similarity.
   * Payload is included in results so callers don't need a second lookup.
   */
  async search(
    collection: string,
    vector: number[],
    limit: number
  ): Promise<QdrantSearchResult[]> {
    const res = await fetch(
      `${this.baseUrl}/collections/${collection}/points/search`,
      {
        method: "POST",
        headers: this.headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          vector,
          limit,
          with_payload: true,
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Qdrant search failed: ${body}`);
    }

    const data = await res.json();
    return data.result;
  }
}
