// tests/rag/qdrant.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QdrantClient } from "@/lib/rag/qdrant";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("QdrantClient", () => {
  const client = new QdrantClient("http://localhost:6333");

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("ensureCollection", () => {
    it("creates collection if it does not exist", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
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
