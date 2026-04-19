export interface TeaPreset {
  id: string;
  name: string;
  color: string;
  subtitle: string;
  ratioGPerMl: number;
  tempC: number;
  rinse: boolean;
  doubleRinse: boolean;
  rinseHint?: string;
  baselineSchedule: number[];
  /** Max schedule multiplier when leaf amount deviates from ideal.
   *  Delicate teas (green, sheng) tolerate less stretching.
   *  Forgiving teas (shou, dark oolong) can handle more. */
  maxAdjust: number;
  brewNote: string;
  seasons: ("spring" | "summer" | "autumn" | "winter")[];
}

export interface TeaGroup {
  id: string;
  name: string;
  subtitle: string;
  categoryColor: string;
  /** Temperature shown on collapsed row — lower variant's temp */
  displayTempC: number;
  variants: string[];
  variantLabels: string[];
}

export const teaGroups: (TeaGroup | string)[] = [
  "green",
  {
    id: "white",
    name: "White Tea",
    subtitle: "Delicate to aged",
    categoryColor: "#B5A890",
    displayTempC: 88,
    variants: ["fresh-white", "aged-white"],
    variantLabels: ["Fresh", "Aged"],
  },
  {
    id: "oolong",
    name: "Oolong",
    subtitle: "Floral to roasted",
    categoryColor: "#A8884A",
    displayTempC: 95,
    variants: ["light-oolong", "dark-oolong"],
    variantLabels: ["Light", "Dark"],
  },
  {
    id: "puerh",
    name: "Pu-erh",
    subtitle: "Living to earthy",
    categoryColor: "#7B6B4D",
    displayTempC: 95,
    variants: ["sheng", "shou"],
    variantLabels: ["Sheng", "Shou"],
  },
  "black",
];

const teas: TeaPreset[] = [
  {
    id: "green",
    name: "Green Tea",
    color: "#7A9E6B",
    subtitle: "Bright and vegetal",
    ratioGPerMl: 0.0625,
    tempC: 80,
    rinse: false,
    doubleRinse: false,
    baselineSchedule: [8, 10, 12, 15, 20, 28, 38],
    maxAdjust: 1.4,  // delicate — over-extraction turns bitter fast
    brewNote: "No rinse, lower temp. The first steep is the brightest.",
    seasons: ["spring", "summer"],
  },
  {
    id: "fresh-white",
    name: "Fresh White",
    color: "#BFB49C",
    subtitle: "Delicate, barely there",
    ratioGPerMl: 0.05,
    tempC: 88,
    rinse: false,
    doubleRinse: false,
    baselineSchedule: [12, 15, 18, 22, 28, 36, 50, 70],
    maxAdjust: 2.0,  // gentle extraction, tolerates longer steeps
    brewNote: "White tea rewards patience and a gentle, slow curve.",
    seasons: ["summer"],
  },
  {
    id: "sheng",
    name: "Sheng Pu-erh",
    color: "#8B9E6F",
    subtitle: "Living, evolving",
    ratioGPerMl: 0.055,
    tempC: 95,
    rinse: true,
    doubleRinse: false,
    rinseHint: "Flash rinse — pour on, pour off. Just enough to wake the leaf.",
    baselineSchedule: [6, 8, 10, 12, 16, 22, 30, 45],
    maxAdjust: 1.5,  // bitterness-prone, keep early steeps short
    brewNote: "Short, careful steeps keep the bitterness in check.",
    seasons: ["summer"],
  },
  {
    id: "light-oolong",
    name: "Light Oolong",
    color: "#B5A26A",
    subtitle: "Floral high-mountain",
    ratioGPerMl: 0.055,
    tempC: 95,
    rinse: false,
    doubleRinse: false,
    baselineSchedule: [18, 12, 12, 15, 20, 28, 40, 55],
    maxAdjust: 2.0,  // ball-rolled, slow to open — handles stretching well
    brewNote: "No rinse — the first steep opens the ball. Fragrance peaks on the second.",
    seasons: ["spring", "autumn"],
  },
  {
    id: "dark-oolong",
    name: "Dark Oolong",
    color: "#8E6B3E",
    subtitle: "Roasted, mineral depth",
    ratioGPerMl: 0.07,
    tempC: 100,
    rinse: true,
    doubleRinse: false,
    rinseHint: "A proper rinse here — let the hot water sit a few seconds to open the roast.",
    baselineSchedule: [10, 10, 12, 15, 20, 28, 38, 55],
    maxAdjust: 2.5,  // roast buffers extraction, very forgiving
    brewNote: "The rinse starts the opening. Give the roast a moment, then let it build.",
    seasons: ["autumn", "winter"],
  },
  {
    id: "black",
    name: "Black Tea",
    color: "#945046",
    subtitle: "Warm and rounded",
    ratioGPerMl: 0.055,
    tempC: 95,
    rinse: false,
    doubleRinse: false,
    baselineSchedule: [10, 12, 15, 18, 24, 32, 45, 62],
    maxAdjust: 1.8,  // fully oxidized, extracts fast — moderate tolerance
    brewNote: "Start steady, then widen as the sweetness softens.",
    seasons: ["winter"],
  },
  {
    id: "aged-white",
    name: "Aged White",
    color: "#A69480",
    subtitle: "Jujube and wood",
    ratioGPerMl: 0.05,
    tempC: 95,
    rinse: true,
    doubleRinse: false,
    rinseHint: "Aged leaf benefits from a slow rinse — let it hydrate and open.",
    baselineSchedule: [10, 12, 15, 20, 28, 38, 55, 75],
    maxAdjust: 2.5,  // aged and mellow, very forgiving
    brewNote: "Higher heat unlocks the jujube and wood notes.",
    seasons: ["autumn", "winter"],
  },
  {
    id: "shou",
    name: "Shou Pu-erh",
    color: "#6B4E3A",
    subtitle: "Earthy, deeply warming",
    ratioGPerMl: 0.058,
    tempC: 100,
    rinse: true,
    doubleRinse: true,
    rinseHint: "Two rinses — the first clears pile taste, the second opens the leaf. Don't rush them.",
    baselineSchedule: [10, 12, 15, 18, 24, 32, 45, 60],
    maxAdjust: 3.0,  // nearly indestructible, handles anything
    brewNote: "A double rinse clears pile notes. Let the middle steeps linger.",
    seasons: ["winter"],
  },
];

export function getTeaById(id: string): TeaPreset | undefined {
  return teas.find((t) => t.id === id);
}
