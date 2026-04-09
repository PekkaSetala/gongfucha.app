import { describe, it, expect } from "vitest";
import { guideSearchLocal } from "@/lib/guide-search";
import type { TeaEntry } from "@/data/corpus/schema";

function makeEntry(partial: Partial<TeaEntry> & Pick<TeaEntry, "id" | "name">): TeaEntry {
  return {
    aliases: [],
    category: "green",
    region: "",
    processing: [],
    oxidation: "none",
    flavor_profile: "",
    body: "medium",
    aroma_notes: [],
    taste_notes: [],
    brewing: {
      temp_c: 80,
      ratio_g_per_100ml: 4,
      schedule_s: [10],
      max_infusions: 5,
      rinse: false,
    },
    beginner_friendly: true,
    sources: [],
    updated: "2026-04-09",
    ...partial,
  } as TeaEntry;
}

describe("guideSearchLocal", () => {
  const entries: Record<string, TeaEntry> = {
    "long-jing": makeEntry({
      id: "long-jing",
      name: "Long Jing",
      aliases: ["龙井", "Dragon Well"],
      category: "green",
      taste_notes: ["nutty", "sweet", "smooth"],
    }),
    "tie-guan-yin": makeEntry({
      id: "tie-guan-yin",
      name: "Tie Guan Yin",
      aliases: ["铁观音", "Iron Goddess"],
      category: "oolong",
      aroma_notes: ["orchid", "floral"],
    }),
    "da-hong-pao": makeEntry({
      id: "da-hong-pao",
      name: "Da Hong Pao",
      aliases: ["大红袍", "Big Red Robe"],
      category: "oolong",
      taste_notes: ["roasted", "mineral"],
    }),
  };

  it("returns empty for query shorter than 2 chars", () => {
    expect(guideSearchLocal(entries, "")).toEqual([]);
    expect(guideSearchLocal(entries, "l")).toEqual([]);
  });

  it("finds exact name match with top score", () => {
    const results = guideSearchLocal(entries, "long jing");
    expect(results[0].entry.id).toBe("long-jing");
  });

  it("matches aliases", () => {
    const results = guideSearchLocal(entries, "Dragon Well");
    expect(results[0].entry.id).toBe("long-jing");
  });

  it("matches Chinese characters in aliases", () => {
    const results = guideSearchLocal(entries, "龙井");
    expect(results[0].entry.id).toBe("long-jing");
  });

  it("matches category", () => {
    const results = guideSearchLocal(entries, "oolong");
    const ids = results.map((r) => r.entry.id).sort();
    expect(ids).toContain("tie-guan-yin");
    expect(ids).toContain("da-hong-pao");
  });

  it("matches taste notes", () => {
    const results = guideSearchLocal(entries, "nutty");
    expect(results[0].entry.id).toBe("long-jing");
  });

  it("matches aroma notes", () => {
    const results = guideSearchLocal(entries, "orchid");
    expect(results[0].entry.id).toBe("tie-guan-yin");
  });

  it("is case-insensitive", () => {
    const lower = guideSearchLocal(entries, "roasted");
    const upper = guideSearchLocal(entries, "ROASTED");
    expect(lower[0].entry.id).toBe(upper[0].entry.id);
  });

  it("respects the limit", () => {
    const results = guideSearchLocal(entries, "oolong", 1);
    expect(results.length).toBe(1);
  });

  it("returns empty array when nothing matches", () => {
    expect(guideSearchLocal(entries, "chocolate")).toEqual([]);
  });
});
