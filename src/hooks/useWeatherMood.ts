import { useState, useEffect, useSyncExternalStore } from "react";
import { fetchWeather, getWeatherMood, getCachedWeather, setCachedWeather } from "@/lib/weather";
import { getCurrentSeason, getSeasonalHint } from "@/lib/seasons";
import { getSessionSeed } from "@/lib/pick";

// Empty subscribe — cache is read-once per mount; fetch fallback triggers a re-render via asyncMood.
const subscribeNoop = () => () => {};
const getCachedMood = (): string | null => {
  const cached = getCachedWeather();
  if (!cached) return null;
  return getWeatherMood(cached.condition, getCurrentSeason(), getSessionSeed());
};
const getServerMood = (): string | null => null;

export function useWeatherMood(): string | null {
  const cachedMood = useSyncExternalStore(subscribeNoop, getCachedMood, getServerMood);
  const [asyncMood, setAsyncMood] = useState<string | null>(null);

  useEffect(() => {
    if (cachedMood !== null) return;
    let ignore = false;
    const season = getCurrentSeason();
    const seed = getSessionSeed();

    fetchWeather()
      .then((data) => {
        if (ignore) return;
        setCachedWeather(data);
        setAsyncMood(getWeatherMood(data.condition, season, seed));
      })
      .catch(() => {
        if (ignore) return;
        setAsyncMood(getSeasonalHint(season));
      });

    return () => { ignore = true; };
  }, [cachedMood]);

  return cachedMood ?? asyncMood;
}
