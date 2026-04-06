import { useState, useEffect } from "react";
import { fetchWeather, getWeatherMood, getCachedWeather, setCachedWeather } from "@/lib/weather";
import { getCurrentSeason, getSeasonalHint } from "@/lib/seasons";

export function useWeatherMood(): string | null {
  const [mood, setMood] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const season = getCurrentSeason();

    const cached = getCachedWeather();
    if (cached) {
      setMood(getWeatherMood(cached.condition, season));
      return;
    }

    fetchWeather()
      .then((data) => {
        if (ignore) return;
        setCachedWeather(data);
        setMood(getWeatherMood(data.condition, season));
      })
      .catch(() => {
        if (ignore) return;
        setMood(getSeasonalHint(season));
      });

    return () => { ignore = true; };
  }, []);

  return mood;
}
