export interface TeaPreset {
  id: string;
  name: string;
  color: string;
  subtitle: string;
  ratioGPerMl: number;
  tempC: number;
  rinse: boolean;
  doubleRinse: boolean;
  baselineSchedule: number[];
  brewNote: string;
  seasons: ("spring" | "summer" | "autumn" | "winter")[];
}

export const teas: TeaPreset[] = [
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
    baselineSchedule: [6, 8, 10, 12, 16, 22, 30, 45],
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
    baselineSchedule: [10, 12, 14, 18, 24, 32, 45, 60],
    brewNote: "No rinse — preserve the first flush of fragrance.",
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
    baselineSchedule: [8, 10, 12, 15, 20, 28, 38, 55],
    brewNote: "Let the roast open gradually. Early steeps stay short.",
    seasons: ["autumn", "winter"],
  },
  {
    id: "black",
    name: "Black Tea",
    color: "#8B5E4B",
    subtitle: "Warm and rounded",
    ratioGPerMl: 0.055,
    tempC: 95,
    rinse: false,
    doubleRinse: false,
    baselineSchedule: [10, 12, 15, 18, 24, 32, 45, 62],
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
    baselineSchedule: [10, 12, 15, 20, 28, 38, 55, 75],
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
    baselineSchedule: [10, 12, 15, 18, 24, 32, 45, 60],
    brewNote: "A double rinse clears pile notes. Let the middle steeps linger.",
    seasons: ["winter"],
  },
];

export function getTeas(): TeaPreset[] {
  return teas;
}

export function getTeaById(id: string): TeaPreset | undefined {
  return teas.find((t) => t.id === id);
}
