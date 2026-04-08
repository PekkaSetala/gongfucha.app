// tests/rag/retrieve.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QdrantSearchResult } from "@/lib/rag/qdrant";

vi.mock("@/lib/rag/embed", () => ({
  embedText: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
}));

vi.mock("@/lib/rag/qdrant", () => ({
  QdrantClient: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
  })),
}));

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
