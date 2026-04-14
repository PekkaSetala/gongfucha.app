// tests/rag-integration.test.ts
// End-to-end integration test for the RAG pipeline.
// Requires a running Qdrant instance (QDRANT_URL env var, default http://localhost:6333).
// Uses a dedicated "teas-test" collection to avoid polluting production data.
// This test will NOT run in standard CI — only when Qdrant is available locally.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type { TeaEntry } from "@/data/corpus/schema";
import { buildEmbeddingText } from "@/lib/rag/build-embedding-text";
import { embedText } from "@/lib/rag/embed";
import { QdrantClient } from "@/lib/rag/qdrant";
import { slugToPointId } from "@/lib/rag/point-id";
import { searchTeas } from "@/lib/rag/retrieve";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION = "teas-test";

async function isQdrantAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${QDRANT_URL}/healthz`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

const qdrantAvailable = await isQdrantAvailable();

describe.skipIf(!qdrantAvailable)("RAG integration", () => {
  beforeAll(async () => {
    const client = new QdrantClient(QDRANT_URL);
    await client.ensureCollection(COLLECTION, 384);

    const corpusDir = join(process.cwd(), "src/data/corpus/entries");
    const testFiles = [
      "da-hong-pao.json",
      "tie-guan-yin.json",
      "long-jing.json",
      "shou-pu-erh.json",
    ];

    for (const file of testFiles) {
      const entry: TeaEntry = JSON.parse(
        readFileSync(join(corpusDir, file), "utf-8")
      );
      const text = buildEmbeddingText(entry);
      const vector = await embedText(text);

      await client.upsert(COLLECTION, [
        {
          id: slugToPointId(entry.id),
          vector,
          payload: {
            slug: entry.id,
            name: entry.name,
            aliases: entry.aliases,
            category: entry.category,
            entry: JSON.stringify(entry),
          },
        },
      ]);
    }
  }, 60_000);

  it("finds Da Hong Pao by exact name (tier 1 lex)", async () => {
    const results = await searchTeas("Da Hong Pao", 3, COLLECTION);
    expect(results[0].id).toBe("da-hong-pao");
  });

  it("finds Da Hong Pao by English alias (tier 1 lex)", async () => {
    const results = await searchTeas("Big Red Robe", 3, COLLECTION);
    expect(results[0].id).toBe("da-hong-pao");
  });

  it("dense path completes without throwing (tier 2 wiring)", async () => {
    // Dense gates are tuned for the full 84-doc corpus. This 4-doc test
    // collection can't be relied on to pass tier 2's 0.55 cosine floor;
    // the check here is that the pipeline runs end-to-end — embed call,
    // Qdrant upsert, Qdrant search, wrapping. Retrieval quality lives
    // in scripts/rag-eval.ts.
    await expect(
      searchTeas("roasted oolong with chocolate notes", 3, COLLECTION),
    ).resolves.toBeDefined();
  });

  it("returns [] for out-of-corpus query", async () => {
    const results = await searchTeas(
      "Japanese matcha ceremony",
      3,
      COLLECTION,
    );
    expect(results).toEqual([]);
  });
});
