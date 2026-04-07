import { describe, it, expect } from "vitest";
import { getHeadline } from "@/data/greetings";

describe("getHeadline", () => {
  it("returns a string", () => {
    const result = getHeadline(12, 100);
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("returns same headline for same seed and hour", () => {
    const a = getHeadline(9, 5000);
    const b = getHeadline(9, 5000);
    expect(a.text).toBe(b.text);
  });

  it("morning hours exclude evening-only lines", () => {
    const results = Array.from({ length: 50 }, (_, i) => getHeadline(8, i));
    const eveningOnly = [
      "Dark leaves for a quiet hour",
      "End it slower than it started",
      "One more steep, then done",
      "Evening session",
    ];
    for (const r of results) {
      expect(eveningOnly).not.toContain(r.text);
    }
  });

  it("evening hours exclude morning-only lines", () => {
    const results = Array.from({ length: 50 }, (_, i) => getHeadline(20, i));
    const morningOnly = [
      "First water, then leaves, then quiet",
      "Steam rising, nowhere to be yet",
      "Early enough to steep slow",
      "Kettle on, day hasn\u2019t started",
    ];
    for (const r of results) {
      expect(morningOnly).not.toContain(r.text);
    }
  });
});
