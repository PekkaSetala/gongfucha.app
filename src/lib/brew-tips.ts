import type { BrewTip } from "@/data/brew-tips";
import { getCategoryForTeaId } from "@/data/tea-categories";

/**
 * Select a contextual brew tip based on tea type and infusion number.
 *
 * Priority: tea-specific tips weighted 3x over universal tips.
 * Returns null if all matching tips have been shown.
 */
export function selectTip(
  tips: BrewTip[],
  teaId: string,
  infusionIndex: number,
  shownIds: string[]
): BrewTip | null {
  const shownSet = new Set(shownIds);
  const category = getCategoryForTeaId(teaId);
  const categoryId = category?.id;

  // 1. Filter by infusion range and exclude shown
  const eligible = tips.filter((tip) => {
    if (shownSet.has(tip.id)) return false;
    const [min, max] = tip.infusionRange;
    if (infusionIndex < min || infusionIndex > max) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // 2. Split into tea-specific and universal
  const specific: BrewTip[] = [];
  const universal: BrewTip[] = [];

  for (const tip of eligible) {
    if (tip.teaTypes.includes("all")) {
      universal.push(tip);
    } else if (
      tip.teaTypes.includes(teaId) ||
      (categoryId && tip.teaTypes.includes(categoryId))
    ) {
      specific.push(tip);
    }
    // Tips that match neither are excluded
  }

  // 3. Weighted random: specific tips get 3x weight
  const weighted: BrewTip[] = [];
  for (const tip of specific) {
    weighted.push(tip, tip, tip); // 3x weight
  }
  for (const tip of universal) {
    weighted.push(tip); // 1x weight
  }

  if (weighted.length === 0) return null;

  return weighted[Math.floor(Math.random() * weighted.length)];
}
