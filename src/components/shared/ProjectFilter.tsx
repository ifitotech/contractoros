"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

/** Shown when a list is opened from a project: only that project's rows, with a way back to everything. */
export function ProjectFilter({ name, clearHref }: { name: string; clearHref: string }) {
  const { t } = useI18n();
  return <div className="px-4 pt-4 md:px-8 md:pt-6"><span className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand-200 bg-brand-50 py-1.5 pl-3 pr-1.5 text-sm font-medium text-brand-700"><span className="truncate">{t("onlyProject", { name })}</span><Link href={clearHref} aria-label={t("showAll")} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-700"><X className="h-4 w-4" /></Link></span></div>;
}
