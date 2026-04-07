type Season = "spring" | "summer" | "autumn" | "winter";

export type WeatherCondition =
  | "clear"
  | "cloudy"
  | "overcast"
  | "fog"
  | "rain-light"
  | "rain-heavy"
  | "storm"
  | "snow";

export type WeatherData = {
  condition: WeatherCondition;
  tempC: number;
};

const CODE_MAP: Record<number, WeatherCondition> = {
  113: "clear",
  116: "cloudy",
  119: "overcast",
  122: "overcast",
  143: "fog",
  248: "fog",
  260: "fog",
  176: "rain-light",
  263: "rain-light",
  266: "rain-light",
  281: "rain-light",
  293: "rain-light",
  296: "rain-light",
  311: "rain-light",
  299: "rain-heavy",
  302: "rain-heavy",
  305: "rain-heavy",
  308: "rain-heavy",
  314: "rain-heavy",
  356: "rain-heavy",
  359: "rain-heavy",
  200: "storm",
  386: "storm",
  389: "storm",
  392: "storm",
  395: "storm",
  179: "snow",
  182: "snow",
  185: "snow",
  227: "snow",
  230: "snow",
  317: "snow",
  320: "snow",
  323: "snow",
  326: "snow",
  329: "snow",
  332: "snow",
  335: "snow",
  338: "snow",
  350: "snow",
  362: "snow",
  365: "snow",
  368: "snow",
  371: "snow",
  374: "snow",
  377: "snow",
};

import { seededPick } from "@/lib/pick";

export async function fetchWeather(): Promise<WeatherData> {
  const res = await fetch("https://wttr.in/?format=j1");
  const json = await res.json();
  const current = json.current_condition[0];
  const code = parseInt(current.weatherCode, 10);
  const condition: WeatherCondition = CODE_MAP[code] ?? "cloudy";
  return { condition, tempC: parseInt(current.temp_C, 10) };
}

type MoodEntry = {
  text: string;
  seasons?: Season[];
};

const moods: Record<WeatherCondition, MoodEntry[]> = {
  clear: [
    { text: "Warm out there \u2014 brew something cooling?", seasons: ["summer"] },
    { text: "Clear and cold today \u2014 brew something warming?", seasons: ["winter"] },
    { text: "Bright out \u2014 brew something light?", seasons: ["spring"] },
    { text: "Crisp autumn air \u2014 brew something roasted?", seasons: ["autumn"] },
    { text: "Blue sky out there, steep outside" },
  ],
  cloudy: [
    { text: "Cloudy out \u2014 brew something light?" },
    { text: "Grey and mild today, stay in" },
    { text: "A bit overcast, no complaints" },
  ],
  overcast: [
    { text: "Pretty grey out \u2014 brew something roasted?" },
    { text: "Grey all day \u2014 brew something heavy?" },
    { text: "Overcast today \u2014 brew something warming?" },
  ],
  fog: [
    { text: "Foggy out there \u2014 brew something dark?" },
    { text: "Misty today \u2014 brew something warming?" },
    { text: "Can\u2019t see much out there, heavy roast?" },
  ],
  "rain-light": [
    { text: "Raining a bit \u2014 brew something cooling?", seasons: ["spring", "summer"] },
    { text: "Rain on the window \u2014 brew something roasted?", seasons: ["autumn", "winter"] },
    { text: "Drizzle outside \u2014 brew something light?" },
    { text: "Soft rain out there, brew something floral?" },
  ],
  "rain-heavy": [
    { text: "Pouring out there \u2014 brew something heavy?" },
    { text: "Not going anywhere \u2014 brew something dark?" },
    { text: "Coming down hard \u2014 thick pours?" },
  ],
  storm: [
    { text: "Thunder outside \u2014 brew something bold?" },
    { text: "Stormy out there \u2014 brew something heavy?" },
    { text: "Rough out there \u2014 deep roast?" },
  ],
  snow: [
    { text: "Snowing out there \u2014 brew something warming?" },
    { text: "Snow outside, brew something heavy?" },
    { text: "Cold one today \u2014 brew something dark?" },
  ],
};

export function getWeatherMood(
  condition: WeatherCondition,
  season: Season,
  seed: number = 0,
): string {
  const entries = moods[condition];
  const candidates = entries.filter(
    (e) => !e.seasons || e.seasons.includes(season)
  );
  const pool = candidates.length > 0 ? candidates : entries;
  return seededPick(pool, seed).text;
}

const CACHE_KEY = "gongfucha-weather";
const CACHE_TTL = 30 * 60 * 1000;

export function getCachedWeather(): WeatherData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: WeatherData; timestamp: number };
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCachedWeather(data: WeatherData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ data, timestamp: Date.now() }),
  );
}
