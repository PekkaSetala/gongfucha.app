import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/identify/route";

vi.mock("@/lib/rag/retrieve", () => ({
  searchTeas: vi.fn().mockResolvedValue([
    {
      score: 5.2,
      payload: {
        entry: JSON.stringify({
          id: "da-hong-pao",
          name: "Da Hong Pao",
          aliases: [],
          category: "oolong",
          region: "Wuyi",
          processing: [],
          oxidation: "heavy",
          flavor_profile: "roasted, mineral",
          tasting_notes: "rich and roasted",
          body: "full",
          aroma_notes: [],
          taste_notes: [],
          brewing: {
            temp_c: 95,
            ratio_g_per_100ml: 6,
            schedule_s: [10, 12, 15],
            max_infusions: 8,
            rinse: true,
            rinse_hint: "quick rinse",
          },
          beginner_friendly: false,
          sources: [],
          updated: "2026-01-01",
        }),
      },
    },
  ]),
}));

describe("POST /api/identify — logging", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("emits identify.hit on corpus match", async () => {
    const req = new Request("http://localhost/api/identify", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: JSON.stringify({ query: "da hong pao" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const hitLine = logSpy.mock.calls
      .map((c) => c[0] as string)
      .find((s) => s.includes('"identify.hit"'));
    expect(hitLine).toBeDefined();
    const parsed = JSON.parse(hitLine!);
    expect(parsed.slug).toBe("da-hong-pao");
    expect(parsed.query).toBe("da hong pao");
    expect(typeof parsed.latencyMs).toBe("number");
  });
});
