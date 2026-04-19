type Season = "spring" | "summer" | "autumn" | "winter";

const MONTH_TO_SEASON: Record<number, Season> = {
  0: "winter", // Jan
  1: "winter",
  2: "spring", // Mar
  3: "spring",
  4: "spring",
  5: "summer", // Jun
  6: "summer",
  7: "summer",
  8: "autumn", // Sep
  9: "autumn",
  10: "autumn",
  11: "winter", // Dec
};

export function getCurrentSeason(): Season {
  return MONTH_TO_SEASON[new Date().getMonth()];
}

export function getSeasonalHint(season: Season): string {
  switch (season) {
    case "spring":
      return "Spring calls for something light — green or floral";
    case "summer":
      return "Summer heat pairs with cooling teas — green or white";
    case "autumn":
      return "Autumn dryness calls for oolong — aromatic and moistening";
    case "winter":
      return "Cold weather wants warmth — black tea or pu-erh";
  }
}
