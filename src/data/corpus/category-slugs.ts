import type { TeaCategory } from "./schema";

/** Public URL slug → corpus TeaCategory value. 6 hubs. */
export const CATEGORY_SLUG_TO_CORPUS: Record<string, TeaCategory> = {
  green: "green",
  white: "white",
  yellow: "yellow",
  oolong: "oolong",
  black: "red", // "red tea" is the Chinese name for Western black tea
  puerh: "dark", // dark tea hub includes puerh + hei cha
};

export const CORPUS_TO_CATEGORY_SLUG: Record<TeaCategory, string> = {
  green: "green",
  white: "white",
  yellow: "yellow",
  oolong: "oolong",
  red: "black",
  dark: "puerh",
};

export const PUBLIC_CATEGORY_SLUGS = Object.keys(CATEGORY_SLUG_TO_CORPUS);

export const CATEGORY_LABELS: Record<string, string> = {
  green: "Green tea",
  white: "White tea",
  yellow: "Yellow tea",
  oolong: "Oolong",
  black: "Black tea",
  puerh: "Pu-erh & dark tea",
};
