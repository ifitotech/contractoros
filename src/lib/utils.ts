import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const localeMap: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-BR",
};

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en"
) {
  const loc = localeMap[locale] ?? "en-US";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, locale = "es") {
  const loc = localeMap[locale] ?? "es-ES";
  return new Intl.DateTimeFormat(loc, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatPercent(value: number, locale = "en") {
  const loc = localeMap[locale] ?? "en-US";
  return new Intl.NumberFormat(loc, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}
