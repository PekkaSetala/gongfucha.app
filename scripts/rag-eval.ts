// scripts/rag-eval.ts
// Evaluation script for RAG retrieval quality across exact, descriptive, and out-of-corpus queries.
// Run: npx tsx scripts/rag-eval.ts
// Requires: Qdrant running with indexed corpus (QDRANT_URL env var, default http://localhost:6333)

import { searchTeas, CONFIDENCE_THRESHOLD } from "../src/lib/rag/retrieve";

interface EvalQuery {
  query: string;
  category: "exact" | "descriptive" | "out-of-corpus";
  expected?: string;
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
  console.log(
    `  Exact name hit rate:     ${exactHits}/${exactTotal} (${((exactHits / exactTotal) * 100).toFixed(0)}%)`
  );
  console.log(
    `  Descriptive hit@3 rate:  ${descHitsTop3}/${descTotal} (${((descHitsTop3 / descTotal) * 100).toFixed(0)}%)`
  );
  console.log(
    `  Out-of-corpus fallback:  ${oocCorrectFallback}/${oocTotal} (${((oocCorrectFallback / oocTotal) * 100).toFixed(0)}%)`
  );
  console.log(`  Confidence threshold:    ${CONFIDENCE_THRESHOLD}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
