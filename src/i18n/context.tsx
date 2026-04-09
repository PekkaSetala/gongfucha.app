"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fi");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
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
