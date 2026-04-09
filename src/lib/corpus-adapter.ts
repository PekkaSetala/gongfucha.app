import type { TeaEntry, TeaCategory } from "@/data/corpus/schema";
import type { TeaPreset } from "@/data/teas";
import { corpusCategoryColor } from "@/data/corpus-categories";

/**
 * Max schedule multiplier when the user's leaf amount deviates from ideal.
 * Lower = less stretching allowed (delicate, bitterness-prone teas).
 * Higher = more forgiving (roasted, aged, fermented).
 * Values chosen to match the spirit of existing presets in teas.ts.
 */
const MAX_ADJUST_BY_CATEGORY: Record<TeaCategory, number> = {
  green:  1.4,
  yellow: 1.4,
  white:  2.0,
  oolong: 2.0,
  red:    1.8,
  dark:   2.5,
};

/**
 * Default seasons by category. Corpus doesn't track seasons; these
 * defaults reflect common pairings and feed the existing season-filter
 * logic in lib/seasons.ts.
 */
const SEASONS_BY_CATEGORY: Record<TeaCategory, TeaPreset["seasons"]> = {
  green:  ["spring", "summer"],
  yellow: ["spring", "summer"],
  white:  ["summer"],
  oolong: ["spring", "autumn"],
  red:    ["winter"],
  dark:   ["autumn", "winter"],
};

/**
 * TeaPreset.subtitle isn't shown in the guide's reference card but is
 * required by the TeaPreset shape. A short category label is the least
 * surprising default.
 */
const SUBTITLE_BY_CATEGORY: Record<TeaCategory, string> = {
  green:  "Green tea",
  white:  "White tea",
  yellow: "Yellow tea",
  oolong: "Oolong",
  red:    "Red tea",
  dark:   "Dark tea",
};

/**
 * Adapts a corpus TeaEntry to the TeaPreset shape that buildBrewParams
 * expects. Brewing-critical fields (tempC, ratioGPerMl, rinse,
 * baselineSchedule) come straight from the corpus. Non-brewing fields
 * are defaulted from category lookup tables.
 *
 * UNIT CONVERSION: corpus stores ratio as g/100ml; TeaPreset uses g/ml.
 * The divide-by-100 must be correct — verified by the Long Jing fixture
 * test in tests/corpus-adapter.test.ts.
 */
export function corpusEntryToTeaPreset(entry: TeaEntry): TeaPreset {
  return {
    id: entry.id,
    name: entry.name,
    color: corpusCategoryColor(entry.category),
    subtitle: SUBTITLE_BY_CATEGORY[entry.category],
    ratioGPerMl: entry.brewing.ratio_g_per_100ml / 100,
    tempC: entry.brewing.temp_c,
    rinse: entry.brewing.rinse,
    doubleRinse: false, // corpus doesn't track this; V1 limitation
    rinseHint: entry.brewing.rinse_hint,
    baselineSchedule: entry.brewing.schedule_s,
    maxAdjust: MAX_ADJUST_BY_CATEGORY[entry.category],
    brewNote: entry.brewing.tips ?? entry.flavor_profile.slice(0, 120),
    seasons: SEASONS_BY_CATEGORY[entry.category],
  };
}
