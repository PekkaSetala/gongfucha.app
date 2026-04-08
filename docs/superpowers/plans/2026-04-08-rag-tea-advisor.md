# RAG Tea Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add retrieval-augmented search over 84 curated tea entries so the AI advisor returns real brewing data instead of LLM-hallucinated parameters.

**Architecture:** Local embeddings (all-MiniLM-L6-v2 via @huggingface/transformers) → Qdrant vector DB → confidence-based routing (corpus match vs LLM fallback). No framework, raw fetch to Qdrant REST API.

**Tech Stack:** TypeScript, @huggingface/transformers, Qdrant (Docker), Vitest, Next.js 16

---

## File Map

```
src/lib/rag/
  embed.ts           # NEW — load model, embed text
  retrieve.ts        # NEW — search Qdrant, boost name matches, return scored results
  index.ts           # NEW — CLI script: read corpus → embed → upsert to Qdrant
  qdrant.ts          # NEW — thin Qdrant HTTP client (upsert, search, collection mgmt)
  build-embedding-text.ts  # NEW — compose embedding text from TeaEntry fields

src/app/api/identify/
  route.ts           # MODIFY — add retrieval-first path, LLM fallback, source field

src/components/
  AIAdvisor.tsx       # MODIFY — read source field, show badge

tests/
  rag/
    embed.test.ts             # NEW — embedding function tests
    build-embedding-text.test.ts  # NEW — text composition tests
    retrieve.test.ts          # NEW — retrieval logic tests (mocked Qdrant)
    qdrant.test.ts            # NEW — Qdrant client tests (mocked fetch)
  rag-integration.test.ts    # NEW — end-to-end retrieval test (requires running Qdrant)
```

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @huggingface/transformers**

```bash
npm install @huggingface/transformers
```

This is the only new dependency. Qdrant communication uses raw `fetch()` — no client library.

- [ ] **Step 2: Verify install**

```bash
npm ls @huggingface/transformers
```

Expected: shows the installed version, no peer dependency warnings.

- [ ] **Step 3: Verify existing tests still pass**

```bash
npx vitest run
```

Expected: all existing tests pass unchanged.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @huggingface/transformers for local embeddings"
```

---

### Task 2: Build Embedding Text Composer

Pure function that takes a `TeaEntry` and returns the string to embed. No I/O, no model — just string concatenation with the right fields.

**Files:**
- Create: `src/lib/rag/build-embedding-text.ts`
- Create: `tests/rag/build-embedding-text.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/rag/build-embedding-text.test.ts
import { describe, it, expect } from "vitest";
import { buildEmbeddingText } from "@/lib/rag/build-embedding-text";
import type { TeaEntry } from "@/data/corpus/schema";

const mockEntry: TeaEntry = {
  id: "da-hong-pao",
  name: "Da Hong Pao",
  aliases: ["大红袍", "Big Red Robe", "DHP"],
  category: "oolong",
  subcategory: "Yan Cha",
  region: "Wuyishan, Fujian, China",
  processing: ["withered", "oxidized", "charcoal roasted"],
  oxidation: "medium",
  roast: "heavy",
  aging: { viable: true, sweet_spot: "2-10 years" },
  flavor_profile: "Deep mineral backbone with dark chocolate and roasted almonds.",
  body: "full",
  aroma_notes: ["roasted nuts", "cocoa", "incense"],
  taste_notes: ["dark chocolate", "mineral", "stone fruit"],
  brewing: {
    temp_c: 100,
    ratio_g_per_100ml: 6,
    schedule_s: [10, 10, 12, 15, 20, 25, 30, 40],
    max_infusions: 8,
    rinse: true,
    rinse_hint: "One quick rinse.",
    tips: "Full boiling water, no exceptions.",
  },
  beginner_friendly: true,
  sources: ["https://example.com"],
  updated: "2026-04-08",
};

describe("buildEmbeddingText", () => {
  it("includes name, aliases, subcategory, region, and flavor fields", () => {
    const text = buildEmbeddingText(mockEntry);

    // Name and aliases
    expect(text).toContain("Da Hong Pao");
    expect(text).toContain("大红袍");
    expect(text).toContain("Big Red Robe");
    expect(text).toContain("DHP");

    // Subcategory and region (the key addition from tea expert review)
    expect(text).toContain("Yan Cha");
    expect(text).toContain("Wuyishan, Fujian, China");

    // Processing summary
    expect(text).toContain("medium oxidation");
    expect(text).toContain("heavy roast");

    // Flavor text
    expect(text).toContain("Deep mineral backbone");
    expect(text).toContain("Full boiling water");

    // Aroma and taste
    expect(text).toContain("roasted nuts");
    expect(text).toContain("dark chocolate");
  });

  it("handles entries with no subcategory, roast, or tips", () => {
    const minimal: TeaEntry = {
      ...mockEntry,
      subcategory: undefined,
      roast: undefined,
      brewing: { ...mockEntry.brewing, tips: undefined },
    };
    const text = buildEmbeddingText(minimal);

    expect(text).toContain("Da Hong Pao");
    expect(text).toContain("medium oxidation");
    expect(text).not.toContain("undefined");
  });

  it("includes aging-viable for aged teas", () => {
    const text = buildEmbeddingText(mockEntry);
    expect(text).toContain("aging-viable");
  });

  it("does not include aging-viable for non-aging teas", () => {
    const noAging = { ...mockEntry, aging: { viable: false } };
    const text = buildEmbeddingText(noAging);
    expect(text).not.toContain("aging-viable");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/rag/build-embedding-text.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/rag/build-embedding-text.ts
import type { TeaEntry } from "@/data/corpus/schema";

/**
 * Compose the text string that gets embedded for a tea entry.
 *
 * Includes fields that match how people search for tea:
 * - name + aliases: exact name matching
 * - subcategory: "yan cha", "dan cong" — second most common query pattern
 * - region: "Wuyi", "Yunnan", "Taiwanese oolong"
 * - processing summary: "heavy roast", "aged", "lightly oxidized"
 * - flavor_profile + tips: richest descriptive text
 * - aroma + taste notes: individual tasting descriptors
 *
 * Structured numeric fields (temp, ratio, schedule) are NOT embedded —
 * they go into Qdrant payload for metadata filtering.
 */
export function buildEmbeddingText(entry: TeaEntry): string {
  const parts: string[] = [
    entry.name,
    entry.aliases.join(" "),
  ];

  if (entry.subcategory) {
    parts.push(entry.subcategory);
  }

  parts.push(entry.region);

  // Processing summary — how people describe tea character
  const processingParts: string[] = [`${entry.oxidation} oxidation`];
  if (entry.roast) {
    processingParts.push(`${entry.roast} roast`);
  }
  if (entry.aging?.viable) {
    processingParts.push("aging-viable");
  }
  parts.push(processingParts.join(", "));

  parts.push(entry.flavor_profile);

  if (entry.brewing.tips) {
    parts.push(entry.brewing.tips);
  }

  parts.push(entry.aroma_notes.join(" "));
  parts.push(entry.taste_notes.join(" "));

  return parts.join(" ");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/rag/build-embedding-text.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/build-embedding-text.ts tests/rag/build-embedding-text.test.ts
git commit -m "feat(rag): add embedding text composer for tea entries"
```

---

### Task 3: Embedding Function

Wraps `@huggingface/transformers` to expose a simple `embedText()` function. Lazy-loads the model on first call.

**Files:**
- Create: `src/lib/rag/embed.ts`
- Create: `tests/rag/embed.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/rag/embed.test.ts
import { describe, it, expect } from "vitest";
import { embedText, embedBatch } from "@/lib/rag/embed";

// These tests actually load the model (~80MB download on first run).
// They're slow the first time, fast after (cached on disk).

describe("embedText", () => {
  it("returns a 384-dimension vector", async () => {
    const vector = await embedText("Da Hong Pao oolong tea");
    expect(vector).toHaveLength(384);
  }, 30_000); // 30s timeout for first model load

  it("returns normalized vectors (unit length)", async () => {
    const vector = await embedText("floral green tea");
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 1);
  });

  it("produces similar vectors for similar texts", async () => {
    const v1 = await embedText("roasted oolong tea with chocolate notes");
    const v2 = await embedText("dark roast oolong chocolate flavor");
    const v3 = await embedText("bright green salad with vinaigrette");

    const sim12 = cosine(v1, v2);
    const sim13 = cosine(v1, v3);

    // Similar tea descriptions should score higher than tea vs salad
    expect(sim12).toBeGreaterThan(sim13);
  });
});

describe("embedBatch", () => {
  it("embeds multiple texts at once", async () => {
    const vectors = await embedBatch([
      "Da Hong Pao",
      "Tie Guan Yin",
      "Long Jing",
    ]);
    expect(vectors).toHaveLength(3);
    expect(vectors[0]).toHaveLength(384);
  });
});

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are normalized, so dot product = cosine similarity
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/rag/embed.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/rag/embed.ts

/**
 * Local text embedding using all-MiniLM-L6-v2.
 *
 * WHY LOCAL: For 84 tea entries, API latency and cost aren't justified.
 * The model is ~80MB, runs in Node.js via WASM, produces 384-dim vectors.
 * First call downloads and caches the model; subsequent calls are ~10ms.
 *
 * WHY THIS MODEL: all-MiniLM-L6-v2 is the standard lightweight embedding
 * model — good quality, tiny footprint, well-understood benchmarks.
 * For a corpus this small, larger models offer no measurable benefit.
 */

let pipeline: ReturnType<typeof import("@huggingface/transformers").pipeline> | null = null;

async function getPipeline() {
  if (!pipeline) {
    const { pipeline: createPipeline } = await import("@huggingface/transformers");
    pipeline = createPipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "fp32" }
    );
  }
  return pipeline;
}

/** Embed a single text string. Returns a 384-dimension normalized vector. */
export async function embedText(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  const result = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(result.data as Float32Array);
}

/** Embed multiple texts. More efficient than calling embedText in a loop. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const pipe = await getPipeline();
  const results = await Promise.all(
    texts.map((t) => pipe(t, { pooling: "mean", normalize: true }))
  );
  return results.map((r) => Array.from(r.data as Float32Array));
}
```

**Note:** The `@huggingface/transformers` API may differ slightly from what's shown. After installing in Task 1, check the actual API by reading `node_modules/@huggingface/transformers/README.md` or the package's type definitions. The key concept is correct: load a feature-extraction pipeline, pass text, get vectors. The exact options (`pooling`, `normalize`, `dtype`) may need adjustment based on the installed version.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/rag/embed.test.ts
```

Expected: PASS (first run may take 20-30s to download the model).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/embed.ts tests/rag/embed.test.ts
git commit -m "feat(rag): add local embedding via all-MiniLM-L6-v2"
```

---

### Task 4: Qdrant HTTP Client

Thin wrapper around Qdrant's REST API. Just three operations: ensure collection exists, upsert points, search.

**Files:**
- Create: `src/lib/rag/qdrant.ts`
- Create: `tests/rag/qdrant.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/rag/qdrant.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QdrantClient } from "@/lib/rag/qdrant";

// Mock fetch — we test HTTP calls without a running Qdrant instance
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("QdrantClient", () => {
  const client = new QdrantClient("http://localhost:6333");

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("ensureCollection", () => {
    it("creates collection if it does not exist", async () => {
      // First call: check existence → 404
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      // Second call: create → 200
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: true }),
      });

      await client.ensureCollection("teas", 384);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const createCall = mockFetch.mock.calls[1];
      expect(createCall[0]).toBe("http://localhost:6333/collections/teas");
      expect(createCall[1].method).toBe("PUT");
      const body = JSON.parse(createCall[1].body);
      expect(body.vectors.size).toBe(384);
      expect(body.vectors.distance).toBe("Cosine");
    });

    it("skips creation if collection already exists", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await client.ensureCollection("teas", 384);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("upsert", () => {
    it("sends points to Qdrant", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { status: "completed" } }),
      });

      await client.upsert("teas", [
        {
          id: "da-hong-pao",
          vector: new Array(384).fill(0.1),
          payload: { name: "Da Hong Pao", category: "oolong" },
        },
      ]);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe("http://localhost:6333/collections/teas/points");
      expect(call[1].method).toBe("PUT");
      const body = JSON.parse(call[1].body);
      expect(body.points).toHaveLength(1);
      expect(body.points[0].id).toBe("da-hong-pao");
    });
  });

  describe("search", () => {
    it("returns scored results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            {
              id: "da-hong-pao",
              score: 0.85,
              payload: { name: "Da Hong Pao", category: "oolong" },
            },
          ],
        }),
      });

      const results = await client.search("teas", new Array(384).fill(0.1), 3);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("da-hong-pao");
      expect(results[0].score).toBe(0.85);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe("http://localhost:6333/collections/teas/points/search");
      expect(call[1].method).toBe("POST");
      const body = JSON.parse(call[1].body);
      expect(body.limit).toBe(3);
      expect(body.with_payload).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/rag/qdrant.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/rag/qdrant.ts

/**
 * Thin HTTP client for Qdrant's REST API.
 *
 * WHY NO CLIENT LIBRARY: Qdrant's REST API is simple enough that a
 * client library adds dependency weight without value. Three endpoints
 * cover everything we need. Raw fetch also means you see exactly what's
 * going over the wire — better for learning and debugging.
 *
 * QDRANT CONCEPTS:
 * - Collection: like a database table. Holds vectors of a fixed dimension.
 * - Point: one entry — a vector + a JSON payload (metadata).
 * - Search: send a query vector, get back the nearest points by cosine similarity.
 */

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
  constructor(private baseUrl: string) {}

  /** Create collection if it doesn't exist. Idempotent. */
  async ensureCollection(name: string, vectorSize: number): Promise<void> {
    const check = await fetch(`${this.baseUrl}/collections/${name}`);
    if (check.ok) return;

    const res = await fetch(`${this.baseUrl}/collections/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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

  /** Upsert points (insert or update by ID). */
  async upsert(collection: string, points: QdrantPoint[]): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/collections/${collection}/points`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Qdrant upsert failed: ${body}`);
    }
  }

  /** Search for nearest vectors. Returns results sorted by score descending. */
  async search(
    collection: string,
    vector: number[],
    limit: number
  ): Promise<QdrantSearchResult[]> {
    const res = await fetch(
      `${this.baseUrl}/collections/${collection}/points/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vector,
          limit,
          with_payload: true,
        }),
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/rag/qdrant.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/qdrant.ts tests/rag/qdrant.test.ts
git commit -m "feat(rag): add thin Qdrant HTTP client"
```

---

### Task 5: Retrieval Function

The search function that ties everything together: embed query → search Qdrant → boost name/alias matches → return scored results.

**Files:**
- Create: `src/lib/rag/retrieve.ts`
- Create: `tests/rag/retrieve.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/rag/retrieve.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QdrantSearchResult } from "@/lib/rag/qdrant";

// Mock the dependencies so we test retrieval logic in isolation
vi.mock("@/lib/rag/embed", () => ({
  embedText: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
}));

vi.mock("@/lib/rag/qdrant", () => ({
  QdrantClient: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
  })),
}));

// Import after mocks are set up
import { searchTeas, CONFIDENCE_THRESHOLD, NAME_BOOST } from "@/lib/rag/retrieve";
import { QdrantClient } from "@/lib/rag/qdrant";

describe("searchTeas", () => {
  let mockSearch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = vi.fn();
    vi.mocked(QdrantClient).mockImplementation(
      () => ({ search: mockSearch }) as unknown as InstanceType<typeof QdrantClient>
    );
  });

  const fakeResults: QdrantSearchResult[] = [
    {
      id: "da-hong-pao",
      score: 0.72,
      payload: {
        name: "Da Hong Pao",
        aliases: ["大红袍", "Big Red Robe", "DHP"],
        category: "oolong",
      },
    },
    {
      id: "rou-gui",
      score: 0.68,
      payload: {
        name: "Rou Gui",
        aliases: ["肉桂", "Cassia Bark"],
        category: "oolong",
      },
    },
  ];

  it("returns results with scores", async () => {
    mockSearch.mockResolvedValue(fakeResults);
    const results = await searchTeas("roasted oolong");

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("da-hong-pao");
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("boosts score when query matches tea name", async () => {
    mockSearch.mockResolvedValue(fakeResults);
    const results = await searchTeas("Da Hong Pao");

    // Da Hong Pao should get NAME_BOOST because query matches name
    const dhp = results.find((r) => r.id === "da-hong-pao")!;
    expect(dhp.score).toBe(0.72 + NAME_BOOST);
  });

  it("boosts score when query matches an alias", async () => {
    mockSearch.mockResolvedValue(fakeResults);
    const results = await searchTeas("Big Red Robe");

    const dhp = results.find((r) => r.id === "da-hong-pao")!;
    expect(dhp.score).toBe(0.72 + NAME_BOOST);
  });

  it("name boost is case-insensitive", async () => {
    mockSearch.mockResolvedValue(fakeResults);
    const results = await searchTeas("da hong pao");

    const dhp = results.find((r) => r.id === "da-hong-pao")!;
    expect(dhp.score).toBe(0.72 + NAME_BOOST);
  });

  it("re-sorts results after boosting", async () => {
    // Rou Gui has higher base score, but query matches DHP name
    const reversed: QdrantSearchResult[] = [
      { id: "rou-gui", score: 0.80, payload: { name: "Rou Gui", aliases: [], category: "oolong" } },
      { id: "da-hong-pao", score: 0.70, payload: { name: "Da Hong Pao", aliases: [], category: "oolong" } },
    ];
    mockSearch.mockResolvedValue(reversed);

    const results = await searchTeas("Da Hong Pao");

    // DHP: 0.70 + 0.15 = 0.85 > Rou Gui: 0.80
    expect(results[0].id).toBe("da-hong-pao");
  });

  it("exports threshold and boost constants", () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.6);
    expect(NAME_BOOST).toBe(0.15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/rag/retrieve.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/rag/retrieve.ts
import { embedText } from "./embed";
import { QdrantClient, type QdrantSearchResult } from "./qdrant";

/**
 * CONFIDENCE_THRESHOLD: minimum cosine similarity to accept a corpus match.
 * Below this, we fall back to LLM generation.
 *
 * 0.6 was chosen as a starting point — tight enough to avoid false positives,
 * loose enough that descriptive queries ("roasted Wuyi oolong") still match.
 * Tune during evaluation (Phase 4).
 */
export const CONFIDENCE_THRESHOLD = 0.6;

/**
 * NAME_BOOST: added to cosine score when the query substring-matches
 * a tea's name or alias. This ensures exact name lookups ("Da Hong Pao")
 * always rank highest, even if the vector similarity is only moderate.
 *
 * WHY 0.15: large enough to rescue a mediocre vector match on an exact name
 * (0.50 + 0.15 = 0.65, above threshold), small enough not to override
 * genuinely better semantic matches.
 */
export const NAME_BOOST = 0.15;

const COLLECTION = "teas";
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";

export interface ScoredTeaResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

/**
 * Search the tea corpus for entries matching the query.
 *
 * Steps:
 * 1. Embed the query text into a 384-dim vector
 * 2. Search Qdrant for nearest neighbors by cosine similarity
 * 3. Boost score for results where query matches name/alias (substring)
 * 4. Re-sort by boosted score
 * 5. Return top-k results
 */
export async function searchTeas(
  query: string,
  topK: number = 3
): Promise<ScoredTeaResult[]> {
  const client = new QdrantClient(QDRANT_URL);
  const queryVector = await embedText(query);
  const results = await client.search(COLLECTION, queryVector, topK * 2);

  const queryLower = query.toLowerCase();

  const boosted: ScoredTeaResult[] = results.map((r) => {
    let score = r.score;

    const name = String(r.payload.name || "").toLowerCase();
    const aliases = (r.payload.aliases as string[]) || [];
    const aliasesLower = aliases.map((a) => a.toLowerCase());

    const nameMatch =
      name.includes(queryLower) ||
      queryLower.includes(name) ||
      aliasesLower.some(
        (a) => a.includes(queryLower) || queryLower.includes(a)
      );

    if (nameMatch) {
      score += NAME_BOOST;
    }

    return { id: r.id as string, score, payload: r.payload };
  });

  boosted.sort((a, b) => b.score - a.score);

  return boosted.slice(0, topK);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/rag/retrieve.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/retrieve.ts tests/rag/retrieve.test.ts
git commit -m "feat(rag): add retrieval with name/alias boosting"
```

---

### Task 6: Indexing Script

CLI script that reads all 84 corpus entries, embeds them, and upserts to Qdrant. Run it once to populate the vector DB.

**Files:**
- Create: `src/lib/rag/index.ts`

No automated test — this is a CLI script that requires a running Qdrant instance. We test it manually.

- [ ] **Step 1: Write the indexing script**

```typescript
// src/lib/rag/index.ts

/**
 * Corpus indexing script.
 *
 * Run: npx tsx src/lib/rag/index.ts
 * Requires: Qdrant running at QDRANT_URL (default http://localhost:6333)
 *
 * Reads all tea entries from src/data/corpus/entries/,
 * builds embedding text for each, generates vectors via local model,
 * upserts to Qdrant with structured fields as payload.
 *
 * IDEMPOTENT: safe to re-run. Uses entry ID as Qdrant point ID,
 * so re-running overwrites existing points with fresh data.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { TeaEntry } from "@/data/corpus/schema";
import { buildEmbeddingText } from "./build-embedding-text";
import { embedText } from "./embed";
import { QdrantClient } from "./qdrant";

const COLLECTION = "teas";
const VECTOR_SIZE = 384;
const CORPUS_DIR = join(process.cwd(), "src/data/corpus/entries");
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";

async function main() {
  console.log("=== Tea Corpus Indexer ===\n");

  // 1. Read all corpus entries
  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} corpus entries`);

  const entries: TeaEntry[] = files.map((f) => {
    const raw = readFileSync(join(CORPUS_DIR, f), "utf-8");
    return JSON.parse(raw) as TeaEntry;
  });

  // 2. Connect to Qdrant and ensure collection exists
  const client = new QdrantClient(QDRANT_URL);
  await client.ensureCollection(COLLECTION, VECTOR_SIZE);
  console.log(`Collection "${COLLECTION}" ready (${VECTOR_SIZE} dimensions)\n`);

  // 3. Embed and upsert each entry
  const startTime = Date.now();
  let indexed = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
      const text = buildEmbeddingText(entry);
      const vector = await embedText(text);

      await client.upsert(COLLECTION, [
        {
          id: entry.id,
          vector,
          payload: {
            name: entry.name,
            aliases: entry.aliases,
            category: entry.category,
            subcategory: entry.subcategory ?? null,
            region: entry.region,
            temp_c: entry.brewing.temp_c,
            ratio_g_per_100ml: entry.brewing.ratio_g_per_100ml,
            beginner_friendly: entry.beginner_friendly,
            body: entry.body,
            // Full entry stored so retrieve.ts can return it without a second lookup
            entry: JSON.stringify(entry),
          },
        },
      ]);

      indexed++;
      process.stdout.write(`  [${indexed}/${entries.length}] ${entry.name}\n`);
    } catch (err) {
      errors++;
      console.error(`  FAILED: ${entry.name} — ${err}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone. ${indexed} indexed, ${errors} errors, ${elapsed}s elapsed.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add a script shortcut to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"rag:index": "tsx src/lib/rag/index.ts"
```

- [ ] **Step 3: Test manually (requires Qdrant running)**

Start a local Qdrant container:

```bash
docker run -d --name qdrant-dev -p 6333:6333 qdrant/qdrant
```

Run the indexer:

```bash
npm run rag:index
```

Expected output:
```
=== Tea Corpus Indexer ===

Found 84 corpus entries
Collection "teas" ready (384 dimensions)

  [1/84] Da Hong Pao
  [2/84] Tie Guan Yin
  ...
  [84/84] Shui Xian Lao Cong

Done. 84 indexed, 0 errors, ~15s elapsed.
```

Verify in Qdrant:

```bash
curl http://localhost:6333/collections/teas | python3 -m json.tool
```

Expected: `"points_count": 84` in the response.

- [ ] **Step 4: Commit**

```bash
git add src/lib/rag/index.ts package.json
git commit -m "feat(rag): add corpus indexing script"
```

---

### Task 7: Modify API Route — Retrieval-First with LLM Fallback

The critical integration point. The route tries corpus retrieval first, falls back to the existing LLM path if no confident match.

**Files:**
- Modify: `src/app/api/identify/route.ts`

- [ ] **Step 1: Write the modified route**

The full file after modification. Key changes:
- Import `searchTeas` and `CONFIDENCE_THRESHOLD`
- Try retrieval first
- Map corpus `TeaEntry` to API response format
- Add category mapping
- Add `source` field to response
- Existing LLM code stays as the `else` branch

```typescript
// src/app/api/identify/route.ts
import { NextResponse } from "next/server";
import { searchTeas, CONFIDENCE_THRESHOLD } from "@/lib/rag/retrieve";
import type { TeaEntry } from "@/data/corpus/schema";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

/**
 * Maps corpus categories to app categoryId values.
 *
 * The corpus uses accurate Chinese tea terminology:
 *   "red" = what the West calls "black tea"
 *   "dark" = hei cha family (includes pu-erh)
 * The app uses simplified Western labels for colors/UI.
 */
const CATEGORY_MAP: Record<string, string> = {
  green: "green",
  white: "white",
  yellow: "green",   // no yellow category in app; closest is green
  oolong: "oolong",
  red: "black",      // Chinese red = Western black
  dark: "puerh",     // app labels all hei cha as puerh
};

// ---------- Existing LLM fallback prompt (unchanged) ----------

const SYSTEM_PROMPT = `You are a gongfu cha brewing expert. Given a tea name or description, generate specific gongfu brewing parameters for that exact tea.

You must respond ONLY with valid JSON in this exact format:
{
  "teaName": "the specific tea name",
  "summary": "2-3 sentences about this tea — origin, character, what makes it interesting. Knowledgeable but concise.",
  "tempC": <number 70-100>,
  "ratioGPerMl": <number 0.04-0.08, grams of leaf per ml of water>,
  "rinse": <boolean, whether a rinse is recommended>,
  "doubleRinse": <boolean, true only for shou pu-erh or heavily pile-fermented teas>,
  "steepCount": <number 5-12, recommended number of infusions>,
  "firstSteepSeconds": <number 5-15>,
  "steepCurve": <number 1.2-1.5, multiplier applied to each subsequent steep>,
  "categoryId": "<one of: green, white, oolong, puerh, black — the broad tea family>"
}

Guidelines:
- Green/white/light oolong: lower temp (70-90), no rinse, gentler curve (1.2-1.3)
- Dark oolong/black: higher temp (90-100), rinse for roasted teas
- Pu-erh: full boil (95-100), always rinse, double rinse for shou
- Higher ratios (0.06-0.08) for teas that benefit from intensity (oolong, pu-erh)
- Lower ratios (0.04-0.055) for delicate teas (green, white)`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function generateSchedule(
  firstSteep: number,
  curve: number,
  count: number
): number[] {
  const schedule: number[] = [firstSteep];
  for (let i = 1; i < count; i++) {
    schedule.push(Math.round(schedule[i - 1] * curve));
  }
  return schedule;
}

// ---------- Corpus → API response mapper ----------

function mapCorpusEntry(entry: TeaEntry) {
  return {
    teaName: entry.name,
    summary: entry.flavor_profile,
    tempC: entry.brewing.temp_c,
    ratioGPerMl: entry.brewing.ratio_g_per_100ml / 100,
    rinse: entry.brewing.rinse,
    doubleRinse: false, // rinseHint handles guidance in prose
    schedule: entry.brewing.schedule_s,
    categoryId: CATEGORY_MAP[entry.category] || entry.category,
    rinseHint: entry.brewing.rinse_hint,
    source: "corpus" as const,
  };
}

// ---------- LLM fallback ----------

async function llmFallback(query: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("AI service not configured");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://gongfucha.app",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const cleaned = content
    .replace(/^```(?:json)?\s*\n?|\n?```\s*$/g, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  const tempC = clamp(Math.round(parsed.tempC ?? 95), 70, 100);
  const ratioGPerMl = clamp(parsed.ratioGPerMl ?? 0.055, 0.04, 0.08);
  const rinse = Boolean(parsed.rinse);
  const doubleRinse = Boolean(parsed.doubleRinse);
  const steepCount = clamp(Math.round(parsed.steepCount ?? 8), 5, 12);
  const firstSteep = clamp(Math.round(parsed.firstSteepSeconds ?? 10), 5, 15);
  const curve = clamp(parsed.steepCurve ?? 1.35, 1.2, 1.5);

  return {
    teaName: String(parsed.teaName || "Unknown Tea"),
    summary: String(parsed.summary || ""),
    tempC,
    ratioGPerMl,
    rinse,
    doubleRinse,
    schedule: generateSchedule(firstSteep, curve, steepCount),
    categoryId: String(parsed.categoryId || ""),
    source: "llm" as const,
  };
}

// ---------- Route handler ----------

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Try corpus retrieval first
    try {
      const results = await searchTeas(query, 3);

      if (results.length > 0 && results[0].score >= CONFIDENCE_THRESHOLD) {
        const entry = JSON.parse(
          results[0].payload.entry as string
        ) as TeaEntry;
        return NextResponse.json(mapCorpusEntry(entry));
      }
    } catch {
      // Retrieval failed (Qdrant down, model error, etc.)
      // Fall through to LLM — degraded but functional
      console.warn("RAG retrieval failed, falling back to LLM");
    }

    // LLM fallback — no corpus match or retrieval error
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const result = await llmFallback(query);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't identify that tea. Try a different description, or use Custom Mode.",
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run build
```

Expected: no type errors.

- [ ] **Step 3: Manual test with Qdrant running**

```bash
# Start dev server
npm run dev

# In another terminal, test corpus match:
curl -X POST http://localhost:3000/api/identify \
  -H "Content-Type: application/json" \
  -d '{"query": "Da Hong Pao"}'
```

Expected: response has `"source": "corpus"`, real schedule like `[10, 10, 12, 15, 20, 25, 30, 40]`.

```bash
# Test LLM fallback (out-of-corpus tea):
curl -X POST http://localhost:3000/api/identify \
  -H "Content-Type: application/json" \
  -d '{"query": "Japanese matcha"}'
```

Expected: response has `"source": "llm"`, generated schedule.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/identify/route.ts
git commit -m "feat(rag): retrieval-first API route with LLM fallback"
```

---

### Task 8: Update AIAdvisor UI — Source Badge

Add the "From our library" / "AI estimate" indicator.

**Files:**
- Modify: `src/components/AIAdvisor.tsx`

- [ ] **Step 1: Add source to AIResult interface**

In `src/components/AIAdvisor.tsx`, update the `AIResult` interface (lines 13-22):

```typescript
interface AIResult {
  teaName: string;
  summary: string;
  tempC: number;
  ratioGPerMl: number;
  rinse: boolean;
  doubleRinse: boolean;
  schedule: number[];
  categoryId: string;
  rinseHint?: string;
  source?: "corpus" | "llm";
}
```

- [ ] **Step 2: Add source badge below tea name**

In the result display section, after the `<h3>` tag for `result.teaName` (line 152), add:

```tsx
<h3 className="text-lg font-medium mb-1">{result.teaName}</h3>
{result.source && (
  <span
    className={`inline-block text-[11px] font-medium uppercase tracking-[0.5px] px-2 py-0.5 rounded-md mb-2 ${
      result.source === "corpus"
        ? "bg-gold/10 text-gold"
        : "bg-border/50 text-tertiary"
    }`}
  >
    {result.source === "corpus" ? "From our library" : "AI estimate"}
  </span>
)}
```

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Open the app, go to AI advisor, search for "Da Hong Pao" (should show gold "FROM OUR LIBRARY" badge) and "Japanese matcha" (should show grey "AI ESTIMATE" badge).

- [ ] **Step 4: Commit**

```bash
git add src/components/AIAdvisor.tsx
git commit -m "feat(rag): show source badge in AI advisor results"
```

---

### Task 9: Integration Test

End-to-end test that runs against a real Qdrant instance. Tests the full flow: embed → index → search → verify results.

**Files:**
- Create: `tests/rag-integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// tests/rag-integration.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { TeaEntry } from "@/data/corpus/schema";
import { buildEmbeddingText } from "@/lib/rag/build-embedding-text";
import { embedText } from "@/lib/rag/embed";
import { QdrantClient } from "@/lib/rag/qdrant";
import { searchTeas, CONFIDENCE_THRESHOLD } from "@/lib/rag/retrieve";

/**
 * Integration tests — require a running Qdrant instance.
 * Run: QDRANT_URL=http://localhost:6333 npx vitest run tests/rag-integration.test.ts
 *
 * Skip in CI unless Qdrant is available.
 */

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION = "teas-test";

describe("RAG integration", () => {
  beforeAll(async () => {
    // Index a subset of entries into a test collection
    const client = new QdrantClient(QDRANT_URL);
    await client.ensureCollection(COLLECTION, 384);

    const corpusDir = join(process.cwd(), "src/data/corpus/entries");
    const testFiles = ["da-hong-pao.json", "tie-guan-yin.json", "long-jing.json", "shou-pu-erh.json"];

    for (const file of testFiles) {
      const entry: TeaEntry = JSON.parse(
        readFileSync(join(corpusDir, file), "utf-8")
      );
      const text = buildEmbeddingText(entry);
      const vector = await embedText(text);

      await client.upsert(COLLECTION, [
        {
          id: entry.id,
          vector,
          payload: {
            name: entry.name,
            aliases: entry.aliases,
            category: entry.category,
            entry: JSON.stringify(entry),
          },
        },
      ]);
    }
  }, 60_000); // 60s for model download + embedding

  it("finds Da Hong Pao by exact name", async () => {
    const results = await searchTeas("Da Hong Pao");
    expect(results[0].id).toBe("da-hong-pao");
    expect(results[0].score).toBeGreaterThan(CONFIDENCE_THRESHOLD);
  });

  it("finds Da Hong Pao by Chinese name", async () => {
    const results = await searchTeas("大红袍");
    const dhp = results.find((r) => r.id === "da-hong-pao");
    expect(dhp).toBeDefined();
  });

  it("finds teas by description", async () => {
    const results = await searchTeas("roasted oolong with chocolate notes");
    // Da Hong Pao should rank high for this description
    expect(results.some((r) => r.id === "da-hong-pao")).toBe(true);
  });

  it("returns low score for out-of-corpus query", async () => {
    const results = await searchTeas("Japanese matcha ceremony");
    // No matcha in test set — all scores should be low
    if (results.length > 0) {
      expect(results[0].score).toBeLessThan(CONFIDENCE_THRESHOLD);
    }
  });
});
```

**Note:** This test uses the `searchTeas` function which currently hardcodes the `"teas"` collection name. For the integration test to work with a test collection, you may need to make the collection name configurable (e.g., via an optional parameter or env var). If so, add a `collection` parameter to `searchTeas` defaulting to `"teas"`. This is a minor refactor — adjust `retrieve.ts` and the test accordingly during implementation.

- [ ] **Step 2: Run with Qdrant available**

```bash
docker run -d --name qdrant-dev -p 6333:6333 qdrant/qdrant
QDRANT_URL=http://localhost:6333 npx vitest run tests/rag-integration.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/rag-integration.test.ts
git commit -m "test(rag): add integration tests for retrieval pipeline"
```

---

### Task 10: Evaluation Query Set

Build the test queries from the spec and run them. This is the "did it actually work?" step.

**Files:**
- Create: `scripts/rag-eval.ts`

- [ ] **Step 1: Write the evaluation script**

```typescript
// scripts/rag-eval.ts

/**
 * RAG evaluation script.
 *
 * Run: npx tsx scripts/rag-eval.ts
 * Requires: Qdrant running with indexed corpus (run npm run rag:index first)
 *
 * Tests retrieval quality across three query categories:
 * 1. Exact name lookups — should hit rank 1
 * 2. Descriptive queries — should find correct tea in top 3
 * 3. Out-of-corpus — should score below threshold (LLM fallback)
 */

import { searchTeas, CONFIDENCE_THRESHOLD } from "@/lib/rag/retrieve";

interface EvalQuery {
  query: string;
  category: "exact" | "descriptive" | "out-of-corpus";
  expected?: string; // expected tea ID for exact/descriptive
}

const queries: EvalQuery[] = [
  // Exact name (expect rank 1 match)
  { query: "Da Hong Pao", category: "exact", expected: "da-hong-pao" },
  { query: "Tie Guan Yin", category: "exact", expected: "tie-guan-yin" },
  { query: "大红袍", category: "exact", expected: "da-hong-pao" },
  { query: "Big Red Robe", category: "exact", expected: "da-hong-pao" },
  { query: "Long Jing", category: "exact", expected: "long-jing" },
  { query: "Shou Pu-erh", category: "exact", expected: "shou-pu-erh" },
  { query: "DHP", category: "exact", expected: "da-hong-pao" },
  { query: "Iron Goddess", category: "exact", expected: "tie-guan-yin" },

  // Descriptive (expect correct tea in top 3)
  { query: "roasty Wuyi cliff tea", category: "descriptive", expected: "da-hong-pao" },
  { query: "light floral Taiwanese oolong", category: "descriptive" },
  { query: "smooth earthy ripe pu-erh", category: "descriptive", expected: "shou-pu-erh" },
  { query: "a good dan cong", category: "descriptive" },
  { query: "delicate green tea from Hangzhou", category: "descriptive", expected: "long-jing" },
  { query: "heavy roast oolong", category: "descriptive" },
  { query: "something light and sweet", category: "descriptive" },
  { query: "aged Wuyi oolong", category: "descriptive" },

  // Out-of-corpus (expect low score, fallback)
  { query: "Japanese matcha", category: "out-of-corpus" },
  { query: "English breakfast tea", category: "out-of-corpus" },
  { query: "chamomile herbal", category: "out-of-corpus" },
  { query: "Kenyan purple tea", category: "out-of-corpus" },
  { query: "Turkish apple tea", category: "out-of-corpus" },
];

async function main() {
  console.log("=== RAG Evaluation ===\n");

  let exactHits = 0;
  let exactTotal = 0;
  let descHitsTop3 = 0;
  let descTotal = 0;
  let oocCorrectFallback = 0;
  let oocTotal = 0;

  for (const q of queries) {
    const results = await searchTeas(q.query, 3);
    const topResult = results[0];
    const topScore = topResult?.score ?? 0;
    const topId = topResult?.id ?? "none";

    if (q.category === "exact") {
      exactTotal++;
      const hit = topId === q.expected && topScore >= CONFIDENCE_THRESHOLD;
      if (hit) exactHits++;
      console.log(
        `  ${hit ? "✓" : "✗"} [exact] "${q.query}" → ${topId} (${topScore.toFixed(3)})${
          !hit ? ` expected: ${q.expected}` : ""
        }`
      );
    } else if (q.category === "descriptive") {
      descTotal++;
      const inTop3 =
        q.expected
          ? results.some((r) => r.id === q.expected)
          : topScore >= CONFIDENCE_THRESHOLD;
      if (inTop3) descHitsTop3++;
      console.log(
        `  ${inTop3 ? "✓" : "~"} [desc]  "${q.query}" → ${topId} (${topScore.toFixed(3)})${
          q.expected ? ` (looking for: ${q.expected})` : ""
        }`
      );
    } else {
      oocTotal++;
      const correctFallback = topScore < CONFIDENCE_THRESHOLD;
      if (correctFallback) oocCorrectFallback++;
      console.log(
        `  ${correctFallback ? "✓" : "✗"} [ooc]   "${q.query}" → ${topId} (${topScore.toFixed(3)})${
          !correctFallback ? " SHOULD HAVE FALLEN BACK" : ""
        }`
      );
    }
  }

  console.log("\n=== Summary ===");
  console.log(`  Exact name hit rate:     ${exactHits}/${exactTotal} (${((exactHits / exactTotal) * 100).toFixed(0)}%)`);
  console.log(`  Descriptive hit@3 rate:  ${descHitsTop3}/${descTotal} (${((descHitsTop3 / descTotal) * 100).toFixed(0)}%)`);
  console.log(`  Out-of-corpus fallback:  ${oocCorrectFallback}/${oocTotal} (${((oocCorrectFallback / oocTotal) * 100).toFixed(0)}%)`);
  console.log(`  Confidence threshold:    ${CONFIDENCE_THRESHOLD}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Run evaluation**

```bash
npx tsx scripts/rag-eval.ts
```

Expected: exact name hit rate > 80%, out-of-corpus fallback rate > 90%. Descriptive queries are the hardest — aim for > 60% initially.

- [ ] **Step 3: Tune based on results**

If exact name hit rate is low: the NAME_BOOST in `retrieve.ts` may need adjustment.
If out-of-corpus teas score too high: CONFIDENCE_THRESHOLD needs raising.
If descriptive queries fail: check whether the relevant terms are in the embedding text.

- [ ] **Step 4: Commit**

```bash
git add scripts/rag-eval.ts
git commit -m "feat(rag): add retrieval evaluation script"
```

---

## Summary of Commits

| Task | Commit |
|------|--------|
| 1 | `chore: add @huggingface/transformers for local embeddings` |
| 2 | `feat(rag): add embedding text composer for tea entries` |
| 3 | `feat(rag): add local embedding via all-MiniLM-L6-v2` |
| 4 | `feat(rag): add thin Qdrant HTTP client` |
| 5 | `feat(rag): add retrieval with name/alias boosting` |
| 6 | `feat(rag): add corpus indexing script` |
| 7 | `feat(rag): retrieval-first API route with LLM fallback` |
| 8 | `feat(rag): show source badge in AI advisor results` |
| 9 | `test(rag): add integration tests for retrieval pipeline` |
| 10 | `feat(rag): add retrieval evaluation script` |

## Not In This Plan (Phase 5: Deploy)

Docker Compose, nginx, SSL, and Hetzner VPS setup are a separate plan. This plan covers everything needed to develop and test locally. Deploy after the retrieval quality is validated.
