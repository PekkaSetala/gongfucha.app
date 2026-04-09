import { describe, it, expect } from "vitest";
import {
  corpusCategories,
  getCorpusCategory,
  corpusCategoryColor,
} from "@/data/corpus-categories";

describe("corpus-categories", () => {
  it("defines all six corpus categories", () => {
    const ids = corpusCategories.map((c) => c.id).sort();
    expect(ids).toEqual(["dark", "green", "oolong", "red", "white", "yellow"]);
  });

  it("returns category record for a known id", () => {
    const yellow = getCorpusCategory("yellow");
    expect(yellow.label).toBe("Yellow");
    expect(yellow.color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("throws on unknown id", () => {
    // @ts-expect-error — testing runtime guard
    expect(() => getCorpusCategory("purple")).toThrow();
  });

  it("every category has a hex color", () => {
    for (const cat of corpusCategories) {
      expect(corpusCategoryColor(cat.id)).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
