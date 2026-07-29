"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLocale,
  getDictionary,
  interpolate,
  type Dictionary,
  type Locale,
} from "./index";

const STORAGE_KEY = "contractoros-locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Dictionary, params?: Record<string, string | number>) => string;
  dict: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored === "es" || stored === "en" || stored === "pt") return stored;
  const browser = navigator.language?.slice(0, 2);
  if (browser === "en") return "en";
  if (browser === "pt") return "pt";
  return "es";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  useEffect(() => {
    if (ready) {
      document.documentElement.lang = locale;
    }
  }, [locale, ready]);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const t = useCallback(
    (key: keyof Dictionary, params?: Record<string, string | number>) => {
      const value = dict[key] ?? String(key);
      return interpolate(value, params);
    },
    [dict]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, dict }),
    [locale, setLocale, t, dict]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

/** Safe hook for optional usage — returns Spanish defaults if no provider */
export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const dict = getDictionary(defaultLocale);
    return (key: keyof Dictionary, params?: Record<string, string | number>) =>
      interpolate(dict[key] ?? String(key), params);
  }
  return ctx.t;
}
