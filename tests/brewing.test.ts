import { describe, it, expect } from "vitest";
import {
  calculateLeafAmount,
  adjustSchedule,
  isScheduleAdjusted,
  extendSchedule,
  nextExtendedTime,
  buildBrewParams,
} from "@/lib/brewing";
import { getTeaById } from "@/data/teas";

describe("calculateLeafAmount", () => {
  it("calculates leaf for default 120ml vessel", () => {
    // Dark Oolong: 0.07 g/ml * 120ml = 8.4g
    expect(calculateLeafAmount(0.07, 120)).toBe(8.4);
  });

  it("calculates leaf for small vessel", () => {
    // Green Tea: 0.0625 g/ml * 80ml = 5.0g
    expect(calculateLeafAmount(0.0625, 80)).toBe(5);
  });

  it("calculates leaf for large vessel", () => {
    // Shou: 0.058 g/ml * 150ml = 8.7g
    expect(calculateLeafAmount(0.058, 150)).toBe(8.7);
  });
});

describe("adjustSchedule", () => {
  const baseline = [10, 12, 15, 18, 24, 32, 45];

  it("returns baseline when ratio matches", () => {
    expect(adjustSchedule(baseline, 0.07, 0.07)).toEqual(baseline);
  });

  it("returns baseline when ratio is close (within 10%)", () => {
    expect(adjustSchedule(baseline, 0.07, 0.065)).toEqual(baseline);
  });

  it("lengthens times when less leaf is used", () => {
    // Half the leaf → ratio is 0.035, deviation = 0.07/0.035 = 2.0
    const adjusted = adjustSchedule(baseline, 0.07, 0.035);
    expect(adjusted[0]).toBe(20); // 10 * 2.0
    expect(adjusted.every((t, i) => t > baseline[i])).toBe(true);
  });

  it("shortens times when more leaf is used", () => {
    // 1.5x leaf → ratio is 0.105, deviation = 0.07/0.105 ≈ 0.667
    const adjusted = adjustSchedule(baseline, 0.07, 0.105);
    expect(adjusted.every((t, i) => t < baseline[i])).toBe(true);
  });

  it("clamps extreme deviations", () => {
    // Very little leaf — multiplier capped at 2.0
    const adjusted = adjustSchedule(baseline, 0.07, 0.01);
    expect(adjusted[0]).toBe(20); // 10 * 2.0 (clamped)
  });
});

describe("isScheduleAdjusted", () => {
  it("returns false when ratios match", () => {
    expect(isScheduleAdjusted(0.07, 0.07)).toBe(false);
  });

  it("returns false when close", () => {
    expect(isScheduleAdjusted(0.07, 0.065)).toBe(false);
  });

  it("returns true when significantly different", () => {
    expect(isScheduleAdjusted(0.07, 0.04)).toBe(true);
  });
});

describe("extendSchedule", () => {
  it("adds infusions at ~35% increment", () => {
    const schedule = [10, 12, 15];
    const extended = extendSchedule(schedule, 2);
    expect(extended).toHaveLength(5);
    expect(extended[3]).toBe(Math.round(15 * 1.35)); // 20
    expect(extended[4]).toBe(Math.round(20 * 1.35)); // 27
  });

  it("does not mutate original", () => {
    const schedule = [10, 12];
    extendSchedule(schedule, 3);
    expect(schedule).toHaveLength(2);
  });
});

describe("nextExtendedTime", () => {
  it("returns ~35% more", () => {
    expect(nextExtendedTime(60)).toBe(81);
  });
});

describe("buildBrewParams", () => {
  it("builds params with recommended leaf", () => {
    const tea = getTeaById("dark-oolong")!;
    const params = buildBrewParams(tea, 120);
    expect(params.recommendedLeaf).toBe(8.4);
    expect(params.actualLeaf).toBe(8.4);
    expect(params.scheduleAdjusted).toBe(false);
    expect(params.schedule).toEqual(tea.baselineSchedule);
  });

  it("builds params with custom leaf and adjusted schedule", () => {
    const tea = getTeaById("dark-oolong")!;
    const params = buildBrewParams(tea, 120, 5);
    expect(params.actualLeaf).toBe(5);
    expect(params.scheduleAdjusted).toBe(true);
    expect(params.schedule[0]).toBeGreaterThan(tea.baselineSchedule[0]);
  });
});
