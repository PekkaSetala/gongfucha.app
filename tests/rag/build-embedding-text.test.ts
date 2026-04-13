import { describe, it, expect } from "vitest";
import { buildEmbeddingText } from "@/lib/rag/build-embedding-text";
import type { TeaEntry } from "@/data/corpus/schema";

const mockEntry: TeaEntry = {
  id: "da-hong-pao",
  name: "Da Hong Pao",
  aliases: ["大红袍", "Big Red Robe", "DHP"],
  category: "oolong",
  subcategory: "Yan Cha",
  region: "Wuyishan, Fujian, China",
  processing: ["withered", "oxidized", "charcoal roasted"],
  oxidation: "medium",
  roast: "heavy",
  aging: { viable: true, sweet_spot: "2-10 years" },
  flavor_profile: "Deep mineral backbone with dark chocolate and roasted almonds.",
  tasting_notes: "The first sip lands darker than you expect — char and cocoa ride the front, then a chalky mineral edge takes over.",
  body: "full",
  aroma_notes: ["roasted nuts", "cocoa", "incense"],
  taste_notes: ["dark chocolate", "mineral", "stone fruit"],
  brewing: {
    temp_c: 100,
    ratio_g_per_100ml: 6,
    schedule_s: [10, 10, 12, 15, 20, 25, 30, 40],
    max_infusions: 8,
    rinse: true,
    rinse_hint: "One quick rinse.",
    tips: "Full boiling water, no exceptions.",
  },
  beginner_friendly: true,
  sources: ["https://example.com"],
  updated: "2026-04-08",
};

describe("buildEmbeddingText", () => {
  it("includes name, aliases, subcategory, region, and flavor fields", () => {
    const text = buildEmbeddingText(mockEntry);

    expect(text).toContain("Da Hong Pao");
    expect(text).toContain("大红袍");
    expect(text).toContain("Big Red Robe");
    expect(text).toContain("DHP");
    expect(text).toContain("Yan Cha");
    expect(text).toContain("Wuyishan, Fujian, China");
    expect(text).toContain("medium oxidation");
    expect(text).toContain("heavy roast");
    expect(text).toContain("Deep mineral backbone");
    expect(text).toContain("chalky mineral edge");
    expect(text).toContain("Full boiling water");
    expect(text).toContain("roasted nuts");
    expect(text).toContain("dark chocolate");
  });

  it("handles entries with no subcategory, roast, or tips", () => {
    const minimal: TeaEntry = {
      ...mockEntry,
      subcategory: undefined,
      roast: undefined,
      brewing: { ...mockEntry.brewing, tips: undefined },
    };
    const text = buildEmbeddingText(minimal);

    expect(text).toContain("Da Hong Pao");
    expect(text).toContain("medium oxidation");
    expect(text).not.toContain("undefined");
  });

  it("includes aging-viable for aged teas", () => {
    const text = buildEmbeddingText(mockEntry);
    expect(text).toContain("aging-viable");
  });

  it("does not include aging-viable for non-aging teas", () => {
    const noAging = { ...mockEntry, aging: { viable: false } };
    const text = buildEmbeddingText(noAging);
    expect(text).not.toContain("aging-viable");
  });

  it('does not include "none roast" for unroasted teas', () => {
    const unroasted = { ...mockEntry, roast: "none" as const };
    const text = buildEmbeddingText(unroasted);
    expect(text).not.toContain("none roast");
  });
});
