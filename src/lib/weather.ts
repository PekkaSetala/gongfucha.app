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

export async function fetchWeather(): Promise<WeatherData> {
  const res = await fetch("https://wttr.in/?format=j1");
  const json = await res.json();
  const current = json.current_condition[0];
  const code = parseInt(current.weatherCode, 10);
  const condition: WeatherCondition = CODE_MAP[code] ?? "cloudy";
  return { condition, tempC: parseInt(current.temp_C, 10) };
}

const moods: Record<WeatherCondition, (season: Season) => string> = {
  clear: (season) => {
    switch (season) {
      case "summer":
        return "Sun's out \u2014 keep it cool and green";
      case "winter":
        return "Clear and cold \u2014 a day for aged pu-erh";
      case "spring":
        return "Bright sky \u2014 something floral to match";
      case "autumn":
        return "Clear autumn air \u2014 roasted oolong weather";
    }
  },
  cloudy: () => "Clouds drifting \u2014 a session with no rush",
  overcast: () => "Grey skies \u2014 let the kettle do the talking",
  fog: () => "Fog rolling in \u2014 something dark and warming",
  "rain-light": (season) => {
    if (season === "spring" || season === "summer") {
      return "Soft rain outside \u2014 a light oolong kind of day";
    }
    return "Rain on the window \u2014 time for something roasted";
  },
  "rain-heavy": () => "Heavy rain \u2014 steep it slow, nowhere to be",
  storm: () => "Thunder outside \u2014 brew something you can feel",
  snow: () => "Snow falling \u2014 dark tea, thick pours",
};

export function getWeatherMood(
  condition: WeatherCondition,
  season: Season,
): string {
  return moods[condition](season);
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
