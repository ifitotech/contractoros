import es, { type Dictionary } from "./dictionaries/es";
import en from "./dictionaries/en";
import pt from "./dictionaries/pt";

export type Locale = "es" | "en" | "pt";

export const locales: Locale[] = ["es", "en", "pt"];

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

export const defaultLocale: Locale = "es";

const dictionaries: Record<Locale, Dictionary> = {
  es,
  en,
  pt,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

/** Replace {key} placeholders in a string */
export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (str, [key, value]) =>
      str.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

export type { Dictionary };
export { es, en, pt };
