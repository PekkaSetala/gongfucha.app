"use client";

import { createContext, useContext, useEffect, useCallback, useSyncExternalStore, type ReactNode } from "react";
import { messages, type Locale } from "./messages";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "gongfucha-locale";

const LocaleContext = createContext<LocaleContextValue>({
  locale: "fi",
  setLocale: () => {},
  t: (key) => key,
});

function detectLocale(): Locale {
  if (typeof window === "undefined") return "fi";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "fi") return stored;
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("fi")) return "fi";
  return "en";
}

// Module-level pub/sub so useSyncExternalStore can notify on setLocale.
const localeListeners = new Set<() => void>();
function subscribeLocale(cb: () => void) {
  localeListeners.add(cb);
  return () => {
    localeListeners.delete(cb);
  };
}
function notifyLocale() {
  for (const cb of localeListeners) cb();
}

// Client snapshot reads from localStorage/navigator; server snapshot is stable "fi".
// We cache the client snapshot so useSyncExternalStore gets a stable reference
// between reads until something explicitly notifies a change.
let cachedClientLocale: Locale | null = null;
function getClientLocaleSnapshot(): Locale {
  if (cachedClientLocale === null) {
    cachedClientLocale = detectLocale();
  }
  return cachedClientLocale;
}
function getServerLocaleSnapshot(): Locale {
  return "fi";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getClientLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    cachedClientLocale = l;
    localStorage.setItem(STORAGE_KEY, l);
    notifyLocale();
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    let str = messages[locale]?.[key] ?? messages.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export type { Locale };
