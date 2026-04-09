import type { TeaCategory } from "@/data/corpus/schema";

export interface CorpusCategory {
  id: TeaCategory;
  label: string;
  color: string;
}

/**
 * The six categories used by the corpus (src/data/corpus/entries/*.json).
 * Kept separate from tea-categories.ts because:
 *  - corpus uses `red` / `dark` / `yellow`
 *  - app uses `black` / `puerh` (no yellow)
 * The Guide surface renders from these; anything bridging into app-native
 * code (brewing flow, tea list) can map via helpers in this file.
 *
 * Palette extends the harmony arc in tea-categories.ts:
 *   sage → dried leaf → gold (new) → amber → copper-red → earth
 */
export const corpusCategories: CorpusCategory[] = [
  { id: "green",  label: "Green",  color: "#7A9E6B" }, // sage (shared with tea-categories)
  { id: "white",  label: "White",  color: "#B5A890" }, // dried leaf (shared)
  { id: "yellow", label: "Yellow", color: "#C9A94E" }, // new — warm gold
  { id: "oolong", label: "Oolong", color: "#A8884A" }, // amber (shared)
  { id: "red",    label: "Red",    color: "#945046" }, // copper-red (shared with app "black")
  { id: "dark",   label: "Dark",   color: "#7B6B4D" }, // earth (shared with app "puerh")
];

export function getCorpusCategory(id: TeaCategory): CorpusCategory {
  const match = corpusCategories.find((c) => c.id === id);
  if (!match) {
    throw new Error(`Unknown corpus category: ${id}`);
  }
  return match;
}

export function corpusCategoryColor(id: TeaCategory): string {
  return getCorpusCategory(id).color;
}

export function corpusCategoryLabel(id: TeaCategory): string {
  return getCorpusCategory(id).label;
}
