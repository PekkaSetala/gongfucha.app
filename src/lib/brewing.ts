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
 *
 * Uses a tapered curve: early steeps get more adjustment than later ones,
 * because with less leaf, the first steeps under-extract most — later steeps
 * converge as there's less left to give regardless of leaf mass.
 *
 * Returns adjusted schedule in seconds, rounded to integers.
 */
export function adjustSchedule(
  baselineSchedule: number[],
  idealRatio: number,
  currentRatio: number,
  maxAdjust: number = 3.0
): number[] {
  if (currentRatio <= 0 || idealRatio <= 0) return baselineSchedule;

  const deviation = idealRatio / currentRatio;
  // Clamp using per-tea ceiling (delicate teas cap lower)
  const multiplier = Math.max(0.5, Math.min(maxAdjust, deviation));

  // Dead zone: within 5% of ideal, don't adjust (one stepper click should respond)
  if (Math.abs(multiplier - 1) < 0.05) return baselineSchedule;

  return baselineSchedule.map((s, i) => {
    // Taper: early steeps (i=0) get full multiplier, later steeps converge toward 1.0
    const progress = baselineSchedule.length > 1
      ? i / (baselineSchedule.length - 1)
      : 0;
    // Blend: 100% of multiplier at steep 1, 40% of multiplier effect at last steep
    const tapered = 1 + (multiplier - 1) * (1 - progress * 0.6);
    return Math.round(s * tapered);
  });
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
  return Math.abs(deviation - 1) >= 0.05;
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
  const capped = Math.max(0, Math.min(additionalCount, 20));
  for (let i = 0; i < capped; i++) {
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
    ? adjustSchedule(tea.baselineSchedule, tea.ratioGPerMl, currentRatio, tea.maxAdjust)
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
