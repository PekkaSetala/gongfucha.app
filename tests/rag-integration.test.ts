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
import { searchTeas, CONFIDENCE_THRESHOLD } from "@/lib/rag/retrieve";

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
  }, 60_000);

  it("finds Da Hong Pao by exact name", async () => {
    const results = await searchTeas("Da Hong Pao", 3, COLLECTION);
    expect(results[0].id).toBe("da-hong-pao");
    expect(results[0].score).toBeGreaterThan(CONFIDENCE_THRESHOLD);
  });

  it("finds Da Hong Pao by Chinese name", async () => {
    const results = await searchTeas("大红袍", 3, COLLECTION);
    const dhp = results.find((r) => r.id === "da-hong-pao");
    expect(dhp).toBeDefined();
  });

  it("finds teas by description", async () => {
    const results = await searchTeas(
      "roasted oolong with chocolate notes",
      3,
      COLLECTION
    );
    expect(results.some((r) => r.id === "da-hong-pao")).toBe(true);
  });

  it("returns low score for out-of-corpus query", async () => {
    const results = await searchTeas(
      "Japanese matcha ceremony",
      3,
      COLLECTION
    );
    if (results.length > 0) {
      expect(results[0].score).toBeLessThan(CONFIDENCE_THRESHOLD);
    }
  });
});
