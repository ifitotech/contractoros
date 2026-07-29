"use client";

import { useI18n } from "@/lib/i18n/provider";
import { locales, localeNames, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-slate-200 bg-white p-0.5",
        className
      )}
    >
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code as Locale)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition",
            locale === code
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          )}
        >
          {localeNames[code]}
        </button>
      ))}
    </div>
  );
}
