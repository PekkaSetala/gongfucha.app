import { describe, it, expect } from "vitest";
import { getWeatherMood } from "@/lib/weather";

describe("getWeatherMood (expanded)", () => {
  it("returns a string for every condition/season combo", () => {
    const conditions = [
      "clear", "cloudy", "overcast", "fog",
      "rain-light", "rain-heavy", "storm", "snow",
    ] as const;
    const seasons = ["spring", "summer", "autumn", "winter"] as const;
    for (const c of conditions) {
      for (const s of seasons) {
        const result = getWeatherMood(c, s, 100);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns same mood for same seed", () => {
    const a = getWeatherMood("rain-light", "spring", 42);
    const b = getWeatherMood("rain-light", "spring", 42);
    expect(a).toBe(b);
  });

  it("has multiple options for at least some conditions", () => {
    const results = new Set(
      Array.from({ length: 30 }, (_, i) =>
        getWeatherMood("rain-light", "spring", i)
      )
    );
    expect(results.size).toBeGreaterThan(1);
  });
});
