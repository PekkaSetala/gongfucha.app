import type { TeaPreset } from "@/data/teas";

const EXTENSION_FACTOR = 1.35;

/**
 * Calculate recommended leaf amount for a given vessel size and tea ratio.
 * Returns grams rounded to one decimal.
 */
export function calculateLeafAmount(
  ratioGPerMl: number,
  vesselMl: number
): number {
  return Math.round(ratioGPerMl * vesselMl * 10) / 10;
}

/**
 * Calculate the actual ratio given leaf grams and vessel ml.
 */
export function actualRatio(leafG: number, vesselMl: number): number {
  return leafG / vesselMl;
}

/**
 * Format ratio as g/100ml for display (how the Western gongfu community thinks).
 */
export function formatRatio(leafG: number, vesselMl: number): string {
  return `${Math.round(leafG / vesselMl * 10000) / 100}g/100ml`;
}

/**
 * Adjust a baseline schedule based on deviation from ideal ratio.
 * Lower ratio (less leaf) → longer times. Higher ratio → shorter times.
 * Returns adjusted schedule in seconds, rounded to integers.
 */
export function adjustSchedule(
  baselineSchedule: number[],
  idealRatio: number,
  currentRatio: number
): number[] {
  if (currentRatio <= 0 || idealRatio <= 0) return baselineSchedule;

  const deviation = idealRatio / currentRatio;
  // Clamp the multiplier to avoid extreme values
  const multiplier = Math.max(0.5, Math.min(2.0, deviation));

  // If close to ideal (within 10%), don't adjust
  if (Math.abs(multiplier - 1) < 0.1) return baselineSchedule;

  return baselineSchedule.map((s) => Math.round(s * multiplier));
}

/**
 * Check if the schedule has been adjusted from baseline.
 */
export function isScheduleAdjusted(
  idealRatio: number,
  currentRatio: number
): boolean {
  if (currentRatio <= 0 || idealRatio <= 0) return false;
  const deviation = idealRatio / currentRatio;
  return Math.abs(deviation - 1) >= 0.1;
}

/**
 * Extend the schedule beyond preset infusions.
 * Each new infusion adds ~35% to the previous time.
 */
export function extendSchedule(
  schedule: number[],
  additionalCount: number
): number[] {
  const extended = [...schedule];
  let last = extended[extended.length - 1];
  for (let i = 0; i < additionalCount; i++) {
    last = Math.round(last * EXTENSION_FACTOR);
    extended.push(last);
  }
  return extended;
}

/**
 * Get the next extended infusion time given the current last time.
 */
export function nextExtendedTime(lastTime: number): number {
  return Math.round(lastTime * EXTENSION_FACTOR);
}

/**
 * Build full brewing params from a tea preset and user settings.
 */
export function buildBrewParams(
  tea: TeaPreset,
  vesselMl: number,
  leafG?: number
) {
  const recommendedLeaf = calculateLeafAmount(tea.ratioGPerMl, vesselMl);
  const actualLeaf = leafG ?? recommendedLeaf;
  const currentRatio = actualRatio(actualLeaf, vesselMl);
  const adjusted = isScheduleAdjusted(tea.ratioGPerMl, currentRatio);
  const schedule = adjusted
    ? adjustSchedule(tea.baselineSchedule, tea.ratioGPerMl, currentRatio)
    : tea.baselineSchedule;

  return {
    teaId: tea.id,
    teaName: tea.name,
    teaColor: tea.color,
    tempC: tea.tempC,
    vesselMl,
    recommendedLeaf,
    actualLeaf,
    rinse: tea.rinse,
    doubleRinse: tea.doubleRinse,
    rinseHint: tea.rinseHint,
    schedule,
    scheduleAdjusted: adjusted,
    brewNote: tea.brewNote,
  };
}
