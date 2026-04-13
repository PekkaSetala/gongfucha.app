import { describe, it, expect } from "vitest";
import { selectTip } from "@/lib/brew-tips";
import { brewTips, type BrewTip } from "@/data/brew-tips";

const mockTips: BrewTip[] = [
  { id: "a", text: "Tip A", category: "sensory", teaTypes: ["green"], infusionRange: [1, 3] },
  { id: "b", text: "Tip B", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "c", text: "Tip C", category: "troubleshooting", teaTypes: ["black"], infusionRange: [2, 5] },
  { id: "d", text: "Tip D", category: "comparison", teaTypes: ["all"], infusionRange: [4, 8] },
  { id: "e", text: "Tip E", category: "sensory", teaTypes: ["green", "oolong"], infusionRange: [1, 6] },
];

describe("selectTip", () => {
  it("returns a tip matching tea type and infusion range", () => {
    const tip = selectTip(mockTips, "green", 2, []);
    expect(tip).not.toBeNull();
    // Must be one of: a (green, 1-3), b (all, 1-12), e (green+oolong, 1-6)
    expect(["a", "b", "e"]).toContain(tip!.id);
  });

  it("excludes already-shown tips", () => {
    const tip = selectTip(mockTips, "green", 2, ["a", "b", "e"]);
    // No green-matching tips left, should fall back to universal
    // b is excluded, d is out of range (4-8), c is wrong type
    expect(tip).toBeNull();
  });

  it("filters by infusion range", () => {
    const tip = selectTip(mockTips, "black", 1, []);
    // c is black but range 2-5, so not eligible at infusion 1
    // Only b (all, 1-12) matches
    expect(tip).not.toBeNull();
    expect(tip!.id).toBe("b");
  });

  it("prefers tea-specific over universal", () => {
    // Run many times and check that tea-specific tips appear more often
    const counts: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const tip = selectTip(mockTips, "green", 2, []);
      if (tip) counts[tip.id] = (counts[tip.id] ?? 0) + 1;
    }
    // a and e are green-specific, b is universal
    // Specific tips should appear more often than universal
    const specificCount = (counts["a"] ?? 0) + (counts["e"] ?? 0);
    const universalCount = counts["b"] ?? 0;
    expect(specificCount).toBeGreaterThan(universalCount);
  });

  it("returns null when all tips are exhausted", () => {
    const tip = selectTip(mockTips, "green", 2, ["a", "b", "c", "d", "e"]);
    expect(tip).toBeNull();
  });

  it("falls back to universal tips when no tea-specific match", () => {
    // "puerh" at infusion 1 — only b matches (all, 1-12)
    const tip = selectTip(mockTips, "puerh", 1, []);
    expect(tip).not.toBeNull();
    expect(tip!.id).toBe("b");
  });
});

describe("brewTips data rule — no sibling leakage", () => {
  // A tip must not list a specific variant alongside its parent category,
  // because the category fallback in selectTip would match the sibling variant.
  const siblingGroups: Array<{ parent: string; variants: string[] }> = [
    { parent: "white", variants: ["fresh-white", "aged-white"] },
    { parent: "oolong", variants: ["light-oolong", "dark-oolong"] },
    { parent: "puerh", variants: ["sheng", "shou"] },
  ];

  for (const { parent, variants } of siblingGroups) {
    it(`no tip mixes "${parent}" with a single variant of [${variants.join(", ")}]`, () => {
      const offenders = brewTips.filter((tip) => {
        if (!tip.teaTypes.includes(parent)) return false;
        const listed = variants.filter((v) => tip.teaTypes.includes(v));
        // Allowed: parent alone, or parent with ALL variants listed.
        return listed.length > 0 && listed.length < variants.length;
      });
      expect(offenders.map((t) => t.id)).toEqual([]);
    });
  }
});

describe("selectTip — sibling variant isolation against real corpus", () => {
  const pairs: Array<[string, string]> = [
    ["sheng", "shou"],
    ["shou", "sheng"],
    ["fresh-white", "aged-white"],
    ["aged-white", "fresh-white"],
    ["light-oolong", "dark-oolong"],
    ["dark-oolong", "light-oolong"],
  ];

  for (const [brewing, sibling] of pairs) {
    it(`brewing ${brewing} never surfaces a tip tagged only for ${sibling}`, () => {
      // Collect all tip IDs that are tagged for the sibling but NOT for the brewing variant
      // and NOT universal. Those must never appear when brewing the current variant.
      const siblingOnly = new Set(
        brewTips
          .filter(
            (t) =>
              !t.teaTypes.includes("all") &&
              t.teaTypes.includes(sibling) &&
              !t.teaTypes.includes(brewing),
          )
          .map((t) => t.id),
      );

      // Sample selectTip many times across the plausible infusion range.
      const shown: string[] = [];
      for (let i = 0; i < 500; i++) {
        const infusion = 1 + (i % 8);
        const tip = selectTip(brewTips, brewing, infusion, []);
        if (tip && siblingOnly.has(tip.id)) {
          shown.push(tip.id);
        }
      }
      expect(shown).toEqual([]);
    });
  }
});
