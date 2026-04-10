import { describe, it, expect } from "vitest";
import { seededPick } from "@/lib/pick";

describe("seededPick", () => {
  it("returns an item from the array", () => {
    const items = ["a", "b", "c", "d", "e"];
    const result = seededPick(items, 1000);
    expect(items).toContain(result);
  });

  it("returns the same item for the same seed", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(seededPick(items, 12345)).toBe(seededPick(items, 12345));
  });

  it("returns different items for different seeds (statistical)", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const results = new Set(
      Array.from({ length: 20 }, (_, i) => seededPick(items, i))
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it("handles single-item array", () => {
    expect(seededPick(["only"], 999)).toBe("only");
  });
});
