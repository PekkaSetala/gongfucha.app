// tests/rag/lexical.test.ts
import { describe, it, expect } from "vitest";
import { tokenize, lexicalSearch } from "@/lib/rag/lexical";
import type { TeaEntry } from "@/data/corpus/schema";

function makeEntry(overrides: Partial<TeaEntry> & Pick<TeaEntry, "id" | "name">): TeaEntry {
  return {
    aliases: [],
    category: "oolong",
    region: "",
    processing: [],
    oxidation: "medium",
    flavor_profile: "",
    tasting_notes: "",
    body: "medium",
    aroma_notes: [],
    taste_notes: [],
    brewing: {
      temp_c: 95,
      ratio_g_per_100ml: 5,
      schedule_s: [10],
      max_infusions: 6,
      rinse: false,
    },
    beginner_friendly: true,
    sources: [],
    updated: "2026-04-14",
    ...overrides,
  };
}

const corpus: TeaEntry[] = [
  makeEntry({
    id: "da-hong-pao",
    name: "Da Hong Pao",
    aliases: ["Big Red Robe", "DHP"],
    category: "oolong",
    subcategory: "Yan Cha",
    region: "Wuyishan, Fujian, China",
  }),
  makeEntry({
    id: "tie-guan-yin",
    name: "Tie Guan Yin",
    aliases: ["Iron Goddess", "TGY"],
    category: "oolong",
    region: "Anxi, Fujian, China",
  }),
  makeEntry({
    id: "long-jing",
    name: "Long Jing",
    aliases: ["Dragon Well", "Dragonwell"],
    category: "green",
    region: "Hangzhou, Zhejiang, China",
  }),
  makeEntry({
    id: "ying-de-hong",
    name: "Ying De Hong",
    aliases: ["Yingde Red"],
    category: "red",
    region: "Yingde, Guangdong, China",
  }),
];

describe("tokenize", () => {
  it("lowercases and splits", () => {
    expect(tokenize("Big Red Robe")).toEqual(["big", "red", "robe"]);
  });

  it("drops punctuation", () => {
    expect(tokenize("shou-pu-erh, aged!")).toEqual(["shou", "erh", "aged"]);
  });

  it("filters tokens shorter than 3 chars", () => {
    expect(tokenize("a of the iron")).toEqual(["the", "iron"]);
  });

  it("preserves unicode letters", () => {
    expect(tokenize("Lóngjǐng")).toEqual(["lóngjǐng"]);
  });

  it("returns [] for empty query", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("lexicalSearch", () => {
  it("finds tea by exact name", () => {
    const results = lexicalSearch("Long Jing", 5, corpus);
    expect(results[0].id).toBe("long-jing");
  });

  it("finds tea by alias (multi-word)", () => {
    const results = lexicalSearch("Big Red Robe", 5, corpus);
    expect(results[0].id).toBe("da-hong-pao");
  });

  it("finds tea by alias (single word)", () => {
    const results = lexicalSearch("Dragonwell", 5, corpus);
    expect(results[0].id).toBe("long-jing");
  });

  it("matches substring into longer word (wuyi → wuyishan)", () => {
    const results = lexicalSearch("wuyi", 5, corpus);
    expect(results[0].id).toBe("da-hong-pao");
  });

  it("high-IDF facet match wins", () => {
    // "hangzhou" only appears in long-jing's region
    const results = lexicalSearch("Hangzhou", 5, corpus);
    expect(results[0].id).toBe("long-jing");
  });

  it("multi-token exact-alias ranks above single-term match", () => {
    const twoTerm = lexicalSearch("Iron Goddess", 5, corpus);
    const oneTerm = lexicalSearch("Iron", 5, corpus);
    expect(twoTerm[0].id).toBe("tie-guan-yin");
    expect(oneTerm[0].id).toBe("tie-guan-yin");
    // Two rare-term matches score higher than one rare-term match.
    expect(twoTerm[0].score).toBeGreaterThan(oneTerm[0].score);
  });

  it("returns [] for query with no matches", () => {
    const results = lexicalSearch("matcha", 5, corpus);
    expect(results).toEqual([]);
  });

  it("returns [] for tokens-all-too-short query", () => {
    const results = lexicalSearch("a of to", 5, corpus);
    expect(results).toEqual([]);
  });

  it("common-category token has near-zero effect on ranking", () => {
    // "oolong" matches two docs (da-hong-pao, tie-guan-yin), which
    // means df=2, N=4, IDF = ln(1 + 4/2) = ln(3) ≈ 1.10.
    // Queries with only common tokens produce a weak, not zero, signal.
    const results = lexicalSearch("oolong", 5, corpus);
    expect(results.length).toBe(2);
    expect(results[0].score).toBeLessThan(2.0);
  });

  it("records matched terms on each result", () => {
    const results = lexicalSearch("Big Red Robe", 5, corpus);
    expect(results[0].matchedTerms).toContain("big");
    expect(results[0].matchedTerms).toContain("red");
    expect(results[0].matchedTerms).toContain("robe");
  });

  it("respects topK", () => {
    const results = lexicalSearch("china", 2, corpus);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("deduplicates repeated query tokens", () => {
    // "iron iron iron" should not triple-count.
    const once = lexicalSearch("Iron", 5, corpus);
    const thrice = lexicalSearch("Iron Iron Iron", 5, corpus);
    expect(thrice[0].score).toBeCloseTo(once[0].score, 5);
  });
});
