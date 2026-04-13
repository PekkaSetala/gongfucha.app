import { describe, it, expect } from "vitest";
import { getAllEntries, getEntryById } from "@/data/corpus";
import { CATEGORY_SLUG_TO_CORPUS } from "@/data/corpus/category-slugs";

const VALID_CATEGORIES = new Set([
  "green",
  "white",
  "yellow",
  "oolong",
  "red",
  "dark",
]);

describe("corpus index", () => {
  const all = getAllEntries();

  it("loads exactly 84 entries", () => {
    expect(all.length).toBe(84);
  });

  it("every entry has the required fields", () => {
    for (const e of all) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(typeof e.tasting_notes).toBe("string");
      expect(e.flavor_profile).toBeTruthy();
      expect(VALID_CATEGORIES.has(e.category)).toBe(true);
      expect(Array.isArray(e.brewing.schedule_s)).toBe(true);
      expect(e.brewing.temp_c).toBeGreaterThan(0);
    }
  });

  it("every tasting_notes is between 130 and 180 words", () => {
    const offenders: string[] = [];
    for (const e of all) {
      const wc = e.tasting_notes.trim().split(/\s+/).length;
      if (wc < 130 || wc > 180) offenders.push(`${e.id}=${wc}`);
    }
    expect(offenders).toEqual([]);
  });

  it("getEntryById returns a known entry", () => {
    const dhp = getEntryById("da-hong-pao");
    expect(dhp?.name).toBe("Da Hong Pao");
  });

  it("category slug puerh maps to corpus dark (regression)", () => {
    expect(CATEGORY_SLUG_TO_CORPUS.puerh).toBe("dark");
    expect(CATEGORY_SLUG_TO_CORPUS.black).toBe("red");
  });
});
