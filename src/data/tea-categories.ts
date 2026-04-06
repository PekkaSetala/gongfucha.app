export interface TeaCategory {
  id: string;
  label: string;
  color: string;
}

/**
 * Tea categories for the type selector and AI mapping.
 * Colors match the corresponding presets in teas.ts.
 */
export const teaCategories: TeaCategory[] = [
  { id: "green", label: "Green", color: "#7A9E6B" },
  { id: "white", label: "White", color: "#BFB49C" },
  { id: "oolong", label: "Oolong", color: "#B5A26A" },
  { id: "puerh", label: "Pu-erh", color: "#8B9E6F" },
  { id: "black", label: "Black", color: "#8B5E4B" },
];

/**
 * Map a tea preset ID or AI categoryId to a TeaCategory.
 * Returns undefined if no match.
 */
export function getCategoryForTeaId(teaId: string): TeaCategory | undefined {
  const mapping: Record<string, string> = {
    "green": "green",
    "fresh-white": "white",
    "aged-white": "white",
    "light-oolong": "oolong",
    "dark-oolong": "oolong",
    "black": "black",
    "sheng": "puerh",
    "shou": "puerh",
  };
  const categoryId = mapping[teaId] ?? teaId;
  return teaCategories.find((c) => c.id === categoryId);
}

/**
 * Get color for a tea ID, with fallback.
 */
export function getTeaColor(teaId: string): string {
  return getCategoryForTeaId(teaId)?.color ?? "#8C563E";
}
