import { describe, it, expect } from "vitest";
import { embedText, embedBatch } from "@/lib/rag/embed";

// These tests actually load the model (~80MB download on first run).
// Slow first time, fast after (cached on disk).

describe("embedText", () => {
  it("returns a 384-dimension vector", async () => {
    const vector = await embedText("Da Hong Pao oolong tea");
    expect(vector).toHaveLength(384);
  }, 60_000);

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
  return dot;
}
