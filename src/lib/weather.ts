type Season = "spring" | "summer" | "autumn" | "winter";

type WeatherCondition =
  | "clear"
  | "cloudy"
  | "overcast"
  | "fog"
  | "rain-light"
  | "rain-heavy"
  | "storm"
  | "snow";

type WeatherData = {
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
  const res = await fetch("https://wttr.in/?format=j1", {
    signal: AbortSignal.timeout(3000),
  });
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
    { text: "Warm out there — something cooling would be nice", seasons: ["summer"] },
    { text: "Bright and hot — thin, quick brews for heat like this", seasons: ["summer"] },
    { text: "Sun\u2019s high — cool hands on a cool cup", seasons: ["summer"] },
    { text: "Clear and cold — a warming brew kind of day", seasons: ["winter"] },
    { text: "Cold sun — the kind of light that makes a hot cup feel earned", seasons: ["winter"] },
    { text: "Bright but biting out there — something to sit with, slowly", seasons: ["winter"] },
    { text: "Bright out — a light tea kind of day", seasons: ["spring"] },
    { text: "First warm light of the year — something gentle to match", seasons: ["spring"] },
    { text: "Sun returning — lean into something fresh", seasons: ["spring"] },
    { text: "Crisp autumn air — roasted leaves come to mind", seasons: ["autumn"] },
    { text: "Sharp light, low sun — something with depth to it", seasons: ["autumn"] },
    { text: "The air has teeth again — match it with something roasted", seasons: ["autumn"] },
    { text: "Blue sky out there — steep outside?" },
    { text: "Clear day. Good day for taking your time." },
    { text: "Open sky — pour slow, nowhere to be" },
  ],
  cloudy: [
    { text: "Cloudy out — something mellow might suit the mood" },
    { text: "Grey and mild today — good tea weather" },
    { text: "A bit overcast, a good excuse to brew" },
    { text: "Soft light outside — the kind that flatters a pale cup" },
    { text: "Low grey ceiling — nothing outside is in a hurry" },
    { text: "Mild and diffused — pour without the clock" },
    { text: "Flat sky, sharp leaves — let the tea do the talking" },
    { text: "Cloud cover\u2019s holding — no reason to rush the kettle" },
  ],
  overcast: [
    { text: "Pretty grey out — a roasted tea kind of day" },
    { text: "Grey all day — something deep and roasted would feel right" },
    { text: "Overcast today — a warming brew comes to mind" },
    { text: "Heavy sky — match it with something that has weight" },
    { text: "Flat light, quiet street — the kind of afternoon that asks for patience" },
    { text: "The grey isn\u2019t going anywhere — neither should you" },
    { text: "Dim and still — a long session kind of afternoon" },
  ],
  fog: [
    { text: "Foggy out there — a dark tea kind of day" },
    { text: "Misty today — something warming would be nice" },
    { text: "Can\u2019t see much out there — maybe a heavy roast" },
    { text: "Fog pressing at the window — slow water matches slow air" },
    { text: "Soft edges outside — a soft water path inside" },
    { text: "The world\u2019s gone quiet — let the kettle be the only sound" },
    { text: "Visibility\u2019s dropped — your horizon can be a cup today" },
  ],
  "rain-light": [
    { text: "Drizzle outside — something fresh feels right this time of year", seasons: ["spring"] },
    { text: "Spring rain, soft on the roof — a clean brew to match", seasons: ["spring"] },
    { text: "Rain bringing the green back — lean into something young", seasons: ["spring"] },
    { text: "Rain and humidity — something aged might clear the air", seasons: ["summer"] },
    { text: "Warm rain, heavy air — let an older leaf do the lifting", seasons: ["summer"] },
    { text: "Rain on the window — feels like a roasted tea moment", seasons: ["autumn", "winter"] },
    { text: "Cool rain, falling leaves — something with smoke in it would suit", seasons: ["autumn"] },
    { text: "Cold drizzle out there — a warming brew feels right", seasons: ["winter"] },
    { text: "Soft rain out there — a warming cup comes to mind" },
    { text: "Rain\u2019s not urgent — your kettle shouldn\u2019t be either" },
    { text: "Steady drip outside — steady pours inside" },
  ],
  "rain-heavy": [
    { text: "Pouring out there — something aged and warming would feel right" },
    { text: "Not going anywhere — a dark brew kind of day" },
    { text: "Coming down hard — a good time for thick pours" },
    { text: "Rain on the glass, drowning the traffic — stay in, brew deep" },
    { text: "Heavy sky opening up — match the weight with a full-bodied cup" },
    { text: "The kind of rain that makes indoors feel chosen" },
    { text: "Loud rain, quiet kitchen — the contrast is the point" },
  ],
  storm: [
    { text: "Thunder outside — feels like a bold tea moment" },
    { text: "Stormy out there — something heavy comes to mind" },
    { text: "Rough out there — maybe a deep roast" },
    { text: "Wind at the windows — brew with both hands" },
    { text: "Sky\u2019s throwing a tantrum — yours can be small and still" },
    { text: "Thunder rolling — let the tea answer in its own weight" },
    { text: "Wild out there — a fierce leaf feels right" },
  ],
  snow: [
    { text: "Snowing out there — a warming brew would be nice" },
    { text: "Snow outside — something deep and warming comes to mind" },
    { text: "Cold one today — something rich and warming" },
    { text: "Flakes on the window — slow kettle, long session" },
    { text: "Snow muffling the street — match the hush with a quiet brew" },
    { text: "White light off the snow — a tea with real depth holds up" },
    { text: "Wind-chill bites — first sip should arrive hot" },
    { text: "Snow\u2019s settled in — nowhere better to be than over a cup" },
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
