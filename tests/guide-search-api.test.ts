import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rag/retrieve", () => ({
  searchTeas: vi.fn(),
}));

import { POST } from "@/app/api/guide/search/route";
import { searchTeas } from "@/lib/rag/retrieve";

function makeRequest(body: unknown): Request {
  return new Request("http://test/api/guide/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/guide/search", () => {
  beforeEach(() => {
    vi.mocked(searchTeas).mockReset();
  });

  it("rejects missing query", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("rejects empty query", async () => {
    const res = await POST(makeRequest({ query: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects non-string query", async () => {
    const res = await POST(makeRequest({ query: 123 }));
    expect(res.status).toBe(400);
  });

  it("rejects query over 200 chars", async () => {
    const res = await POST(makeRequest({ query: "x".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("rejects topK out of range", async () => {
    const res = await POST(makeRequest({ query: "green", topK: 999 }));
    expect(res.status).toBe(400);
  });

  it("rejects topK < 1", async () => {
    const res = await POST(makeRequest({ query: "green", topK: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns results on valid query with default topK=10", async () => {
    vi.mocked(searchTeas).mockResolvedValue([
      { id: "long-jing", score: 0.9, payload: { name: "Long Jing" } },
    ]);
    const res = await POST(makeRequest({ query: "long jing" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(1);
    expect(json.results[0].id).toBe("long-jing");
    expect(searchTeas).toHaveBeenCalledWith("long jing", 10);
  });

  it("passes explicit topK through", async () => {
    vi.mocked(searchTeas).mockResolvedValue([]);
    await POST(makeRequest({ query: "oolong", topK: 5 }));
    expect(searchTeas).toHaveBeenCalledWith("oolong", 5);
  });

  it("returns 500 on searchTeas failure", async () => {
    vi.mocked(searchTeas).mockRejectedValue(new Error("Qdrant down"));
    const res = await POST(makeRequest({ query: "green" }));
    expect(res.status).toBe(500);
  });

  it("returns 400 on malformed JSON", async () => {
    const bad = new Request("http://test/api/guide/search", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(bad);
    expect(res.status).toBe(400);
  });
});
