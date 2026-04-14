// src/lib/rag/index.ts
// CLI script: reads all corpus entries, embeds them, and upserts to Qdrant.
// Run: npx tsx src/lib/rag/index.ts
// Requires: QDRANT_URL env var (default http://localhost:6333)

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { TeaEntry } from "../../data/corpus/schema";
import { buildEmbeddingText } from "./build-embedding-text";
import { embedText } from "./embed";
import { QdrantClient } from "./qdrant";
import { slugToPointId } from "./point-id";

const COLLECTION = "teas";
const VECTOR_SIZE = 384;
const CORPUS_DIR = join(process.cwd(), "src/data/corpus/entries");
const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";

async function main(): Promise<void> {
  console.log("=== Tea Corpus Indexer ===\n");

  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} corpus entries`);

  const entries: TeaEntry[] = files.map((f) => {
    const raw = readFileSync(join(CORPUS_DIR, f), "utf-8");
    return JSON.parse(raw) as TeaEntry;
  });

  const client = new QdrantClient(QDRANT_URL);
  await client.ensureCollection(COLLECTION, VECTOR_SIZE);
  console.log(`Collection "${COLLECTION}" ready (${VECTOR_SIZE} dimensions)\n`);

  const startTime = Date.now();
  let indexed = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
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
            subcategory: entry.subcategory ?? null,
            region: entry.region,
            temp_c: entry.brewing.temp_c,
            ratio_g_per_100ml: entry.brewing.ratio_g_per_100ml,
            beginner_friendly: entry.beginner_friendly,
            body: entry.body,
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
  console.log(
    `\nDone. ${indexed} indexed, ${errors} errors, ${elapsed}s elapsed.`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
