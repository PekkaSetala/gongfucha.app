// tests/rag/retrieve.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QdrantSearchResult } from "@/lib/rag/qdrant";
import type { LexicalResult } from "@/lib/rag/lexical";
import type { TeaEntry } from "@/data/corpus/schema";

// Hoisted mock references — vi.mock factories run before imports, so
// any variables they close over must be declared via vi.hoisted to
// avoid the TDZ.
const { mockSearch, mockLexicalSearch } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockLexicalSearch: vi.fn(),
}));

vi.mock("@/lib/rag/embed", () => ({
  embedText: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
}));

vi.mock("@/lib/rag/qdrant", () => ({
  QdrantClient: class {
    search(...args: unknown[]) {
      return mockSearch(...args);
    }
  },
}));

vi.mock("@/lib/rag/lexical", () => ({
  lexicalSearch: (...args: unknown[]) => mockLexicalSearch(...args),
}));

// Mock corpus (for entryToPayload)
const sampleEntry = (id: string, name: string): TeaEntry => ({
  id,
  name,
  aliases: [],
  category: "oolong",
  region: "Test",
  processing: [],
  oxidation: "medium",
  flavor_profile: "test flavor",
  tasting_notes: "test notes",
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
});

vi.mock("@/data/corpus", () => ({
  getAllEntries: vi.fn().mockReturnValue([]),
  getEntryById: vi.fn((id: string) => sampleEntry(id, id)),
}));

import {
  searchTeas,
  LEX_STRONG_SCORE,
  DENSE_STRONG_SCORE,
} from "@/lib/rag/retrieve";

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch.mockReset();
  mockLexicalSearch.mockReset();
});

function lex(results: LexicalResult[]): void {
  mockLexicalSearch.mockReturnValue(results);
}

function dense(results: QdrantSearchResult[]): void {
  mockSearch.mockResolvedValue(results);
}

describe("searchTeas — two-tier hybrid", () => {
  describe("Tier 1: lexical strong", () => {
    it("returns lex top-1 when lex score >= LEX_STRONG_SCORE", async () => {
      lex([
        { id: "da-hong-pao", score: LEX_STRONG_SCORE + 1, matchedTerms: ["big", "red", "robe"] },
        { id: "ying-de-hong", score: 2.0, matchedTerms: ["red"] },
      ]);
      dense([
        { id: "irrelevant", score: 0.3, payload: { slug: "irrelevant" } },
      ]);

      const results = await searchTeas("Big Red Robe");
      expect(results[0].id).toBe("da-hong-pao");
    });

    it("falls through when lex top1 is below LEX_STRONG_SCORE", async () => {
      lex([
        { id: "da-hong-pao", score: LEX_STRONG_SCORE - 1, matchedTerms: ["red"] },
      ]);
      dense([
        { id: "tie-guan-yin", score: DENSE_STRONG_SCORE + 0.01, payload: { slug: "tie-guan-yin" } },
      ]);

      const results = await searchTeas("mild query");
      // Lex weak → tier 2 dense strong wins
      expect(results[0].id).toBe("tie-guan-yin");
    });

    it("ignores low-confidence dense results when lex is strong", async () => {
      lex([
        { id: "long-jing", score: LEX_STRONG_SCORE + 2, matchedTerms: ["hangzhou"] },
      ]);
      dense([
        { id: "anji-bai-cha", score: 0.9, payload: { slug: "anji-bai-cha" } },
      ]);

      const results = await searchTeas("green tea from Hangzhou");
      // Tier 1 fires first (even though dense also strong) → lex wins
      expect(results[0].id).toBe("long-jing");
    });
  });

  describe("Tier 2: dense strong", () => {
    it("returns dense top-1 when dense score >= DENSE_STRONG_SCORE and lex is weak", async () => {
      lex([]);
      dense([
        { id: "shou-pu-erh", score: DENSE_STRONG_SCORE + 0.1, payload: { slug: "shou-pu-erh" } },
      ]);

      const results = await searchTeas("smooth earthy ripe fermented");
      expect(results[0].id).toBe("shou-pu-erh");
    });

    it("reads slug from payload when Qdrant point id is a UUID", async () => {
      lex([]);
      dense([
        {
          id: "e8b7ad78-1234-5678-9abc-def012345678",
          score: DENSE_STRONG_SCORE + 0.1,
          payload: { slug: "shou-pu-erh" },
        },
      ]);

      const results = await searchTeas("smooth earthy ripe");
      expect(results[0].id).toBe("shou-pu-erh");
    });
  });

  describe("no-confidence fallthrough", () => {
    it("returns [] when neither tier fires", async () => {
      lex([
        { id: "da-hong-pao", score: 1.0, matchedTerms: ["tea"] },
      ]);
      dense([
        { id: "tie-guan-yin", score: 0.3, payload: { slug: "tie-guan-yin" } },
      ]);

      const results = await searchTeas("some vague query");
      expect(results).toEqual([]);
    });

    it("returns [] on empty lex + empty dense", async () => {
      lex([]);
      dense([]);

      const results = await searchTeas("nothing matches");
      expect(results).toEqual([]);
    });
  });

  describe("graceful degradation", () => {
    it("serves lex results when Qdrant throws", async () => {
      lex([
        { id: "da-hong-pao", score: LEX_STRONG_SCORE + 1, matchedTerms: ["big", "red", "robe"] },
      ]);
      mockSearch.mockRejectedValue(new Error("Qdrant down"));

      const results = await searchTeas("Big Red Robe");
      expect(results[0].id).toBe("da-hong-pao");
    });

    it("returns [] when Qdrant throws and lex is weak", async () => {
      lex([
        { id: "something", score: 1.0, matchedTerms: ["tea"] },
      ]);
      mockSearch.mockRejectedValue(new Error("Qdrant down"));

      const results = await searchTeas("something vague");
      expect(results).toEqual([]);
    });
  });

  describe("topK", () => {
    it("respects topK in tier 1", async () => {
      lex([
        { id: "a", score: LEX_STRONG_SCORE + 1, matchedTerms: ["a"] },
        { id: "b", score: LEX_STRONG_SCORE + 0.5, matchedTerms: ["b"] },
        { id: "c", score: LEX_STRONG_SCORE + 0.2, matchedTerms: ["c"] },
        { id: "d", score: LEX_STRONG_SCORE + 0.1, matchedTerms: ["d"] },
      ]);
      dense([]);

      const results = await searchTeas("Big Red Robe", 2);
      expect(results.length).toBe(2);
    });
  });

  describe("payload shape", () => {
    it("tier 1 result payload includes entry JSON", async () => {
      lex([
        { id: "da-hong-pao", score: LEX_STRONG_SCORE + 1, matchedTerms: ["dhp"] },
      ]);
      dense([]);

      const results = await searchTeas("DHP");
      expect(results[0].payload).toHaveProperty("entry");
      const parsed = JSON.parse(results[0].payload.entry as string);
      expect(parsed.id).toBe("da-hong-pao");
    });
  });
});
